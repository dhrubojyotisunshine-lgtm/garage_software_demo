const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const SparePart     = require('../models/masters/SparePart');
const Lube          = require('../models/masters/Lube');
const { protect }   = require('../middleware/auth');

router.use(protect);

/* ── Stats ── */
router.get('/stats', async (req, res) => {
  try {
    const q = { garageId: req.garage._id, active: { $ne: false } };
    const pos = await PurchaseOrder.find(q);
    res.json({
      total:   pos.length,
      amount:  pos.reduce((a, p) => a + (p.totalPayable || 0), 0),
      pending: pos.reduce((a, p) => a + (p.pendingAmount || 0), 0)
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── List ── */
router.get('/', async (req, res) => {
  try {
    const { search, startDate, endDate, reportType, all } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const q = { garageId: req.garage._id, active: { $ne: false } };
    if (search) q.$or = [
      { supplierName: { $regex: search, $options: 'i' } },
      { billNumber:   { $regex: search, $options: 'i' } },
      { poNumber:     { $regex: search, $options: 'i' } }
    ];
    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate)   q.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }
    if (reportType && reportType !== 'all') q.status = reportType;
    const total = await PurchaseOrder.countDocuments(q);
    let query = PurchaseOrder.find(q).sort({ createdAt: -1 });
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
router.get('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!po) return res.status(404).json({ message: 'Not found' });
    res.json(po);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Create ── */
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, garageId: req.garage._id };
    const po = new PurchaseOrder(data);
    await po.save();
    res.status(201).json(po);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Update ── */
router.put('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!po) return res.status(404).json({ message: 'Not found' });
    res.json(po);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Add Stock (update inventory quantities when PO received) ── */
router.post('/:id/add-stock', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!po) return res.status(404).json({ message: 'Not found' });

    // Update each item's stock
    for (const item of po.items) {
      if (!item.itemId) continue;
      const Model = item.itemType === 'Lube' ? Lube : SparePart;
      await Model.findByIdAndUpdate(item.itemId, {
        $inc: { currentStock: item.qty },
        ...(item.sellingPrice > 0 ? { sellingPrice: item.sellingPrice } : {}),
        ...(item.unitPrice > 0    ? { purchasePrice: item.unitPrice }   : {})
      });
    }
    po.status = 'Received';
    await po.save();
    res.json({ message: 'Stock updated', po });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Delete ── */
router.delete('/:id', async (req, res) => {
  try {
    await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
