const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const CashbookEntry = require('../models/CashbookEntry');
const { protect } = require('../middleware/auth');

router.use(protect);

/* Narration for a purchase row from its item types, e.g. "Spare & Lube purchase". */
function itemNarration(items) {
  const types = [...new Set((items || []).map(i => i.itemType).filter(Boolean))];
  if (!types.length) return 'Purchase';
  return `${types.join(' & ')} purchase`;
}

/* Build all ledger events (purchases = credit, payments = debit) for a supplier's POs. */
async function buildEvents(garageId, supplierId) {
  const pos = await PurchaseOrder.find({ garageId, supplierId, active: { $ne: false } }).lean();
  const poIds = pos.map(p => p._id);
  const payments = poIds.length
    ? await CashbookEntry.find({
        garageId, active: { $ne: false },
        referenceType: 'PurchaseOrder', referenceId: { $in: poIds },
      }).lean()
    : [];

  const paidByPo = {};
  payments.forEach(p => {
    const k = String(p.referenceId);
    paidByPo[k] = (paidByPo[k] || 0) + (p.linkedPaidAmount || 0);
  });

  const events = [];

  pos.forEach(po => {
    // Purchase (credit — amount we owe the supplier)
    events.push({
      date: po.billDate || po.poDate || po.createdAt,
      particulars: 'PO Purchase',
      narration: itemNarration(po.items),
      vchType: 'Purchase',
      vchNo: po.billNumber || po.poNumber || '',
      debit: 0,
      credit: po.totalPayable || 0,
    });
    // Upfront payment made at PO creation (paidAmount not covered by cashbook entries)
    const viaCashbook = paidByPo[String(po._id)] || 0;
    const upfront = (po.paidAmount || 0) - viaCashbook;
    if (upfront > 0.005) {
      events.push({
        date: po.transactionDate || po.createdAt,
        particulars: po.transactionType || 'Cash',
        narration: po.transactionNumber ? `Payment · ${po.transactionNumber}` : 'Payment on purchase',
        vchType: 'Payment',
        vchNo: po.transactionNumber || po.billNumber || po.poNumber || '',
        debit: upfront,
        credit: 0,
      });
    }
  });

  // Cashbook payments (debit — amount we paid the supplier)
  payments.forEach(p => {
    events.push({
      date: p.date || p.createdAt,
      particulars: p.paymentMethod || 'Cash',
      narration: p.transactionNumber ? `Payment · ${p.transactionNumber}` : (p.description || 'Payment'),
      vchType: 'Payment',
      vchNo: p.transactionNumber || p.referenceNumber || '',
      debit: p.linkedPaidAmount || 0,
      credit: 0,
    });
  });

  events.sort((a, b) => {
    const d = new Date(a.date) - new Date(b.date);
    if (d) return d;
    // Same day: purchases before payments
    return (a.vchType === 'Purchase' ? 0 : 1) - (b.vchType === 'Purchase' ? 0 : 1);
  });
  return events;
}

/* All-time rollup for the supplier details tab. */
function summarise(events) {
  let totalPurchased = 0, totalPaid = 0, lastPaidDate = null, lastPurchaseDate = null, poCount = 0;
  events.forEach(e => {
    if (e.vchType === 'Purchase') {
      totalPurchased += e.credit; poCount += 1;
      if (!lastPurchaseDate || new Date(e.date) > new Date(lastPurchaseDate)) lastPurchaseDate = e.date;
    } else {
      totalPaid += e.debit;
      if (e.debit > 0 && (!lastPaidDate || new Date(e.date) > new Date(lastPaidDate))) lastPaidDate = e.date;
    }
  });
  return { totalPurchased, totalPaid, pending: totalPurchased - totalPaid, lastPaidDate, lastPurchaseDate, poCount };
}

router.get('/', async (req, res) => {
  try {
    const { search, all } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const q = { garageId: req.garage._id, active: { $ne: false } };
    if (search) {
      q.$or = [
        { firmName:  { $regex: search, $options: 'i' } },
        { contact1:  { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Supplier.countDocuments(q);
    let query = Supplier.find(q).sort({ createdAt: 1 });
    if (!all) query = query.skip((page - 1) * limit).limit(limit);
    const items = await query;
    res.json({
      items, total,
      page:  all ? 1 : page,
      pages: all ? 1 : Math.max(1, Math.ceil(total / limit)),
      limit: all ? total : limit
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const supplier = await Supplier.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Not found' });
    res.json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Supplier.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Single supplier + all-time rollup (details tab) ── */
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!supplier) return res.status(404).json({ message: 'Not found' });
    const events = await buildEvents(req.garage._id, supplier._id);
    res.json({ supplier, summary: summarise(events) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Supplier ledger (Tally-style) with optional date range ── */
router.get('/:id/ledger', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!supplier) return res.status(404).json({ message: 'Not found' });

    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0)) : null;
    const to   = dateTo   ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;

    const events = await buildEvents(req.garage._id, supplier._id);
    const summary = summarise(events);

    // Opening balance = payable carried forward from before the range start.
    let opening = 0;
    const rows = [];
    let running = 0;
    events.forEach(e => {
      const d = new Date(e.date);
      if (from && d < from) { opening += (e.credit || 0) - (e.debit || 0); return; }
      if (to && d > to) return;
      running = (rows.length ? running : opening) + (e.credit || 0) - (e.debit || 0);
      rows.push({ ...e, balance: running });
    });
    if (!rows.length) running = opening;

    const totalDebit  = rows.reduce((s, r) => s + (r.debit || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);

    res.json({
      supplier, summary,
      opening, rows,
      totalDebit, totalCredit,
      closing: running,
      range: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
