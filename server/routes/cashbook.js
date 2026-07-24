const express      = require('express');
const router       = express.Router();
const CashbookEntry = require('../models/CashbookEntry');
const Jobcard      = require('../models/Jobcard');
const CounterSale  = require('../models/CounterSale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer     = require('../models/Customer');
const Supplier     = require('../models/Supplier');
const { protect }  = require('../middleware/auth');

router.use(protect);

const ONLINE_METHODS = ['UPI', 'Card', 'Cheque'];

/* Build a { $gte, $lte } date filter from optional from/to (inclusive days). */
function dateRangeFilter(dateFrom, dateTo) {
  const f = {};
  if (dateFrom) { const s = new Date(dateFrom); s.setHours(0, 0, 0, 0);   f.$gte = s; }
  if (dateTo)   { const e = new Date(dateTo);   e.setHours(23, 59, 59, 999); f.$lte = e; }
  return Object.keys(f).length ? f : null;
}

/* ── Synthesized payment rows from Jobcard & CounterSale transactions ──
   These modules own their payment records; the Cashbook reads them (read-only).
   Jobcard: Advance/Payment = IN, Refund = OUT. CounterSale: always IN. */
async function sourceRows(gid, dr) {
  const dateStage = dr ? [{ $match: { 'transactions.date': dr } }] : [];
  const jobcard = await Jobcard.aggregate([
    { $match: { garageId: gid, deletedAt: null } },
    { $unwind: '$transactions' },
    ...dateStage,
    { $project: {
      _id: { $concat: ['jc:', { $toString: '$_id' }, ':', { $toString: '$transactions._id' }] },
      source: 'jobcard',
      type: { $cond: [{ $eq: ['$transactions.type', 'Refund'] }, 'OUT', 'IN'] },
      amount: { $ifNull: ['$transactions.amount', 0] },
      paymentMethod: '$transactions.paymentType',
      category: 'Jobcard Payment',
      date: '$transactions.date',
      description: { $ifNull: ['$transactions.details', ''] },
      referenceType: 'Jobcard',
      referenceNumber: '$jobcardNumber',
      referenceName: '$customerName',
      referenceMobile: '$customerMobile'
    } }
  ]);
  const counter = await CounterSale.aggregate([
    { $match: { garageId: gid, active: { $ne: false } } },
    { $unwind: '$transactions' },
    ...dateStage,
    { $project: {
      _id: { $concat: ['cs:', { $toString: '$_id' }, ':', { $toString: '$transactions._id' }] },
      source: 'countersale',
      type: 'IN',
      amount: { $ifNull: ['$transactions.amount', 0] },
      paymentMethod: '$transactions.paymentType',
      category: 'Counter Sale Payment',
      date: '$transactions.date',
      description: { $ifNull: ['$transactions.transactionNumber', ''] },
      referenceType: 'CounterSale',
      referenceNumber: '$counterNumber',
      referenceName: '$customerName',
      referenceMobile: '$customerMobile'
    } }
  ]);
  return [...jobcard, ...counter];
}

/* ── Merge manual cashbook entries (excluding Jobcard/CounterSale-linked, to
   avoid double-counting) with the synthesized source rows. ── */
async function mergedRows(gid, dr) {
  const mq = { garageId: gid, active: { $ne: false }, referenceType: { $nin: ['Jobcard', 'CounterSale'] } };
  if (dr) mq.date = dr;
  const manual = await CashbookEntry.find(mq).lean();
  const manualRows = manual.map(e => ({ ...e, source: 'manual' }));
  const src = await sourceRows(gid, dr);
  return [...manualRows, ...src];
}

/* ── Reduce rows to summary totals ── */
function reduceStats(rows) {
  let cashReceived = 0, cashReceivedCash = 0, cashReceivedOnline = 0, cashSpend = 0;
  for (const e of rows) {
    if (e.type === 'IN') {
      cashReceived += e.amount;
      if (e.paymentMethod === 'Cash') cashReceivedCash += e.amount;
      else if (ONLINE_METHODS.includes(e.paymentMethod)) cashReceivedOnline += e.amount;
    } else if (e.type === 'OUT') {
      cashSpend += e.amount;
    }
  }
  return { cashReceived, cashReceivedCash, cashReceivedOnline, cashSpend };
}

/* ── Running balance (all-time; includes jobcard/countersale transactions) ── */
async function getBalance(garageId) {
  const rows = await mergedRows(garageId, null);
  const inTotal  = rows.filter(e => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
  const outTotal = rows.filter(e => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);
  return { inTotal, outTotal, balance: inTotal - outTotal };
}

/* ── Stats ── */
router.get('/stats', async (req, res) => {
  try {
    const gid = req.garage._id;
    const dr = dateRangeFilter(req.query.dateFrom, req.query.dateTo);
    const rows = await mergedRows(gid, dr);
    const totals = reduceStats(rows);

    // Wallet balance stays all-time regardless of the date filter.
    const { balance } = await getBalance(gid);
    res.json({ ...totals, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Pending references for modal ── */
router.get('/pending', async (req, res) => {
  try {
    const { category, search } = req.query;
    const gid = req.garage._id;

    if (category === 'Counter Sale Payment') {
      const q = { garageId: gid, active: { $ne: false }, balanceDue: { $gt: 0 } };
      if (search) q.$or = [
        { customerName:   { $regex: search, $options: 'i' } },
        { customerMobile: { $regex: search, $options: 'i' } }
      ];
      const items = await CounterSale.find(q).sort({ createdAt: -1 }).limit(10);
      return res.json(items.map(i => ({
        _id: i._id, type: 'CounterSale',
        number: i.counterNumber, name: i.customerName,
        mobile: i.customerMobile, date: i.createdAt,
        balance: i.balanceDue
      })));
    }

    if (category === 'Jobcard Payment') {
      const q = { garageId: gid, deletedAt: null, balanceDue: { $gt: 0 } };
      if (search) q.$or = [
        { customerName:   { $regex: search, $options: 'i' } },
        { customerMobile: { $regex: search, $options: 'i' } }
      ];
      const items = await Jobcard.find(q).sort({ createdAt: -1 }).limit(10);
      return res.json(items.map(i => ({
        _id: i._id, type: 'Jobcard',
        number: i.jobcardNumber, name: i.customerName,
        mobile: i.customerMobile, date: i.createdAt,
        balance: i.balanceDue
      })));
    }

    if (category === 'PO Payment') {
      const q = { garageId: gid, active: { $ne: false }, pendingAmount: { $gt: 0 } };
      if (search) q.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { poNumber:     { $regex: search, $options: 'i' } }
      ];
      const items = await PurchaseOrder.find(q).sort({ createdAt: -1 }).limit(10);
      return res.json(items.map(i => ({
        _id: i._id, type: 'PurchaseOrder',
        number: i.poNumber, name: i.supplierName,
        mobile: i.supplierPhone, date: i.createdAt,
        balance: i.pendingAmount
      })));
    }

    res.json([]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── List ── */
router.get('/', async (req, res) => {
  try {
    const { search, category, date, dateFrom, dateTo, type, payMode } = req.query;
    let dr = dateRangeFilter(dateFrom, dateTo);
    if (!dr && date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      dr = { $gte: start, $lte: end };
    }

    let rows = await mergedRows(req.garage._id, dr);

    // Display filters (applied uniformly across manual + source rows).
    if (category && category !== 'all') rows = rows.filter(r => r.category === category);
    if (type     && type !== 'all')     rows = rows.filter(r => r.type === type);
    if (payMode === 'cash')   rows = rows.filter(r => r.paymentMethod === 'Cash');
    if (payMode === 'online') rows = rows.filter(r => ONLINE_METHODS.includes(r.paymentMethod));
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r => [r.referenceName, r.referenceMobile, r.referenceNumber, r.description]
        .some(v => (v || '').toString().toLowerCase().includes(s)));
    }

    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Create ── */
router.post('/', async (req, res) => {
  try {
    const { referenceId, referenceType, linkedPaidAmount, paymentMethod, transactionNumber, date, ...rest } = req.body;
    const entry = new CashbookEntry({
      ...rest,
      garageId: req.garage._id,
      referenceId,
      referenceType,
      linkedPaidAmount: linkedPaidAmount || 0,
      paymentMethod,
      transactionNumber,
      date: date || new Date()
    });
    await entry.save();

    // Sync linked document balance
    if (referenceId && linkedPaidAmount > 0) {
      const paid = Number(linkedPaidAmount);
      const txEntry = {
        amount: paid,
        paymentType: paymentMethod,
        details: transactionNumber || '',
        date: date || new Date()
      };

      if (referenceType === 'CounterSale') {
        const doc = await CounterSale.findById(referenceId);
        if (doc) {
          const newPaid = (doc.paidAmount || 0) + paid;
          const newBal  = Math.max(0, (doc.total || 0) - newPaid);
          doc.paidAmount  = newPaid;
          doc.balanceDue  = newBal;
          doc.transactions = [...(doc.transactions || []), txEntry];
          await doc.save();
        }
      }

      if (referenceType === 'Jobcard') {
        const doc = await Jobcard.findById(referenceId);
        if (doc) {
          const newPaid = (doc.paidAmount || 0) + paid;
          const newBal  = Math.max(0, (doc.billAmount || doc.total || 0) - newPaid);
          doc.paidAmount  = newPaid;
          doc.balanceDue  = newBal;
          doc.transactions = [...(doc.transactions || []), { ...txEntry, type: 'Payment' }];
          await doc.save();
        }
      }

      if (referenceType === 'PurchaseOrder') {
        const doc = await PurchaseOrder.findById(referenceId);
        if (doc) {
          const newPaid    = (doc.paidAmount || 0) + paid;
          const newPending = Math.max(0, (doc.totalPayable || 0) - newPaid);
          await PurchaseOrder.findByIdAndUpdate(referenceId, {
            paidAmount: newPaid, pendingAmount: newPending,
            transactionType: paymentMethod, transactionNumber, transactionDate: date
          });
        }
      }
    }

    const { balance } = await getBalance(req.garage._id);
    res.status(201).json({ entry, balance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Delete ── */
router.delete('/:id', async (req, res) => {
  try {
    await CashbookEntry.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
