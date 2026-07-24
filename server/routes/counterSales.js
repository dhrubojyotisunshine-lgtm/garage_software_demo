const express    = require('express');
const router     = express.Router();
const PDFDocument = require('pdfkit');
const CounterSale = require('../models/CounterSale');
const SparePart  = require('../models/masters/SparePart');
const Lube       = require('../models/masters/Lube');
const { protect } = require('../middleware/auth');
const { checkStock } = require('../utils/stockCheck');

router.use(protect);

/* Strip empty-string/null ObjectId fields — '' can't cast to ObjectId */
const sanitizeSale = (body) => {
  const c = { ...body };
  if (c.customerId === '' || c.customerId === null) delete c.customerId;
  if (Array.isArray(c.items)) {
    c.items = c.items.map(it => {
      const x = { ...it };
      if (x.itemId === '' || x.itemId === null) delete x.itemId;
      return x;
    });
  }
  return c;
};

/* ── Stats ── */
router.get('/stats', async (req, res) => {
  try {
    const q = { garageId: req.garage._id, active: { $ne: false } };
    const sales = await CounterSale.find(q, 'total paidAmount balanceDue');
    res.json({
      total:   sales.length,
      revenue: sales.reduce((a, s) => a + (s.total || 0), 0),
      pending: sales.reduce((a, s) => a + (s.balanceDue || 0), 0)
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── List ── */
router.get('/', async (req, res) => {
  try {
    const { search, startDate, endDate, all } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const q = { garageId: req.garage._id, active: { $ne: false } };
    if (search) q.$or = [
      { customerName:   { $regex: search, $options: 'i' } },
      { customerMobile: { $regex: search, $options: 'i' } },
      { counterNumber:  { $regex: search, $options: 'i' } }
    ];
    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate)   q.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }
    const total = await CounterSale.countDocuments(q);
    let query = CounterSale.find(q).sort({ createdAt: -1 });
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

/* ── Get one ── */
router.get('/:id/pdf', async (req, res) => {
  try {
    const sale   = await CounterSale.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!sale) return res.status(404).json({ message: 'Not found' });
    const garage = req.garage;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sale.counterNumber}_.pdf"`);
    doc.pipe(res);

    const pageW = 595 - 80;
    const blue  = '#003087';
    const lblBg = '#BDD7EE';

    /* ── Title ── */
    doc.fontSize(18).fillColor(blue).font('Helvetica-Bold')
      .text('Invoice', 40, 40, { align: 'center', width: pageW });

    /* ── Garage info (top right) ── */
    doc.fontSize(11).fillColor(blue).font('Helvetica-Bold')
      .text(garage.workshopName || 'Garage', { align: 'right' });
    doc.fontSize(8).fillColor('#333').font('Helvetica')
      .text(`${garage.address || ''}`, { align: 'right' })
      .text(`Phone: ${garage.mobile || ''}`, { align: 'right' })
      .text(`Mail: ${garage.email || ''}`, { align: 'right' });

    doc.moveDown(0.5);

    /* ── Bill To / Invoice Details ── */
    const tableY = doc.y;
    const colMid = 40 + pageW / 2;

    const drawBox = (x, y, w, h, bg) => {
      doc.rect(x, y, w, h).fillAndStroke(bg || '#fff', '#999');
    };

    const hdrH = 18;
    drawBox(40, tableY, pageW / 2, hdrH, lblBg);
    drawBox(colMid, tableY, pageW / 2, hdrH, lblBg);

    doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
      .text('Bill To:', 44, tableY + 4)
      .text('Invoice Details:', colMid + 4, tableY + 4);

    const infoH = 36;
    drawBox(40, tableY + hdrH, pageW / 2, infoH, '#fff');
    drawBox(colMid, tableY + hdrH, pageW / 2, infoH, '#fff');

    doc.fontSize(9).fillColor('#000').font('Helvetica')
      .text(sale.customerName, 44, tableY + hdrH + 4)
      .text(`Mobile No:${sale.customerMobile}`, 44, tableY + hdrH + 16);

    const saleDate = new Date(sale.date || sale.createdAt);
    const dateStr  = saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.font('Helvetica')
      .text(`Number: ${sale.counterNumber}`, colMid + 4, tableY + hdrH + 4)
      .text(`Date: ${dateStr}`, colMid + 4, tableY + hdrH + 16);

    doc.moveDown(0.3);
    doc.y = tableY + hdrH + infoH + 8;

    /* ── Items table ── */
    const itY   = doc.y;
    const cols  = [40, 90, 350, 420, 510];
    const colW  = [50, 260, 70, 90, 65];
    const hdrs  = ['#', 'Particulars', 'Qty', 'Unit Price', 'Total Amount'];

    drawBox(40, itY, pageW, hdrH, lblBg);
    hdrs.forEach((h, i) => {
      doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
        .text(h, cols[i], itY + 4, { width: colW[i], align: i > 1 ? 'right' : 'left' });
    });

    let rowY = itY + hdrH;
    (sale.items || []).forEach((item, idx) => {
      const rH = 20;
      doc.rect(40, rowY, pageW, rH).stroke('#ccc');
      doc.fontSize(9).fillColor('#000').font('Helvetica')
        .text(String(idx + 1), cols[0], rowY + 5, { width: colW[0] })
        .text(item.name || '-', cols[1], rowY + 5, { width: colW[1] })
        .text(String(item.qty || 1), cols[2], rowY + 5, { width: colW[2], align: 'right' })
        .text(Number(item.unitPrice || 0).toFixed(2), cols[3], rowY + 5, { width: colW[3], align: 'right' })
        .font('Helvetica-Bold')
        .text(Number(item.amount || 0).toFixed(2), cols[4], rowY + 5, { width: colW[4], align: 'right' });
      rowY += rH;
    });

    doc.y = rowY + 10;

    /* ── Totals section ── */
    const totY   = doc.y;
    const halfW  = pageW / 2;
    const rightX = 40 + halfW;

    // Total in words box
    const wordsH = 60;
    const billH  = 60;
    doc.rect(40, totY, halfW, wordsH + 20).stroke('#999');
    doc.rect(rightX, totY, halfW, wordsH + 20).stroke('#999');

    drawBox(rightX, totY, halfW, hdrH, lblBg);
    doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
      .text('Bill Amount Details:', rightX + 4, totY + 4);

    doc.fontSize(9).fillColor('#000').font('Helvetica')
      .text('Total In Words:', 44, totY + 4);

    const wordsStr = numberToWords(sale.total || 0);
    doc.font('Helvetica-Bold')
      .text(wordsStr, 44, totY + 16, { width: halfW - 8 });

    // Total row
    doc.font('Helvetica')
      .text('Total:', rightX + 4, totY + hdrH + 4)
      .text(`Rs.${(sale.total || 0).toFixed(0)}`, rightX + halfW - 60, totY + hdrH + 4, { width: 56, align: 'right' });

    doc.text('Balance:', rightX + 4, totY + hdrH + 18)
      .text(`Rs.${(sale.balanceDue || 0).toFixed(1)}`, rightX + halfW - 60, totY + hdrH + 18, { width: 56, align: 'right' });

    // Auth sig box
    const sigY = totY + hdrH + 36;
    doc.rect(rightX, sigY, halfW, 24).stroke('#999');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
      .text('Authorized Signature', rightX + 4, sigY + 7, { width: halfW - 8, align: 'center' });

    doc.y = totY + wordsH + 30;

    /* ── Terms ── */
    doc.moveDown(0.5);
    const tcY = doc.y;
    drawBox(40, tcY, pageW, hdrH, lblBg);
    doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
      .text('Terms and Conditions', 44, tcY + 4);
    doc.rect(40, tcY + hdrH, pageW, 40).stroke('#999');
    doc.fontSize(8).fillColor('#555').font('Helvetica')
      .text(`"${garage.termsAndConditions || ''}"`, 44, tcY + hdrH + 6, { width: pageW - 8 });

    doc.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await CounterSale.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Create ── */
router.post('/', async (req, res) => {
  try {
    const data = { ...sanitizeSale(req.body), garageId: req.garage._id };

    // Block if it would drive stock negative (unless Negative Inventory is enabled).
    const stockCheck = await checkStock(req.garage, (data.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: i.qty })));
    if (!stockCheck.ok) return res.status(400).json({ message: stockCheck.message });

    const sale = new CounterSale(data);
    await sale.save();

    // Deduct stock
    for (const item of sale.items || []) {
      if (!item.itemId) continue;
      const Model = item.itemType === 'Lube' ? Lube : SparePart;
      await Model.findByIdAndUpdate(item.itemId, { $inc: { currentStock: -item.qty } });
    }

    res.status(201).json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Update ── */
router.put('/:id', async (req, res) => {
  try {
    const existing = await CounterSale.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const newData = sanitizeSale(req.body);

    // Net stock impact = new items (deduct) minus old items (restore). Block if it
    // would go negative, unless Negative Inventory is enabled.
    const stockCheck = await checkStock(req.garage, [
      ...(newData.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: i.qty })),
      ...(existing.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: -(i.qty || 0) })),
    ]);
    if (!stockCheck.ok) return res.status(400).json({ message: stockCheck.message });

    // Restore old stock, apply the update, then deduct the new stock.
    for (const item of existing.items || []) {
      if (!item.itemId) continue;
      const Model = item.itemType === 'Lube' ? Lube : SparePart;
      await Model.findByIdAndUpdate(item.itemId, { $inc: { currentStock: (item.qty || 0) } });
    }
    const sale = await CounterSale.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      newData,
      { new: true, runValidators: true }
    );
    for (const item of sale.items || []) {
      if (!item.itemId) continue;
      const Model = item.itemType === 'Lube' ? Lube : SparePart;
      await Model.findByIdAndUpdate(item.itemId, { $inc: { currentStock: -(item.qty || 0) } });
    }
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Delete ── */
router.delete('/:id', async (req, res) => {
  try {
    await CounterSale.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── helpers ── */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below100(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function numberToWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero Rupees';
  let str = '';
  if (n >= 10000000) { str += below100(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000)   { str += below100(Math.floor(n / 100000))   + ' Lakh ';  n %= 100000; }
  if (n >= 1000)     { str += below100(Math.floor(n / 1000))     + ' Thousand '; n %= 1000; }
  if (n >= 100)      { str += ONES[Math.floor(n / 100)]          + ' Hundred ';  n %= 100; }
  if (n > 0)         { str += below100(n); }
  return str.trim() + ' Rupees';
}

module.exports = router;
