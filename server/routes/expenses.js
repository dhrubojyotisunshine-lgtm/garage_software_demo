const express  = require('express');
const router   = express.Router();
const Expense  = require('../models/Expense');
const Garage   = require('../models/Garage');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/opening-balance', async (req, res) => {
  try {
    const garage = await Garage.findById(req.garage._id).select('expenseOpeningBalance');
    res.json({ openingBalance: garage?.expenseOpeningBalance || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/opening-balance', async (req, res) => {
  try {
    const val = Number(req.body.openingBalance) || 0;
    await Garage.findByIdAndUpdate(req.garage._id, { expenseOpeningBalance: val });
    res.json({ openingBalance: val });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { search, date } = req.query;
    const q = { garageId: req.garage._id, active: { $ne: false } };

    if (search) {
      q.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { billNumber:   { $regex: search, $options: 'i' } }
      ];
    }

    if (date) {
      const d     = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      q.expenseDate = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(q).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { totalAmount, paidAmount, ...rest } = req.body;
    const total   = Number(totalAmount)  || 0;
    const paid    = Number(paidAmount)   || 0;
    const expense = await Expense.create({
      ...rest,
      garageId:      req.garage._id,
      totalAmount:   total,
      paidAmount:    paid,
      balanceAmount: Math.max(0, total - paid)
    });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { totalAmount, paidAmount, ...rest } = req.body;
    const total   = Number(totalAmount)  || 0;
    const paid    = Number(paidAmount)   || 0;
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { ...rest, totalAmount: total, paidAmount: paid, balanceAmount: Math.max(0, total - paid) },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Expense.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
