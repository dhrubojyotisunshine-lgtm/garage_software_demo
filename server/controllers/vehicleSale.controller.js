const VehicleSale = require('../models/vehicleSale.model');
const { validateVehicleSale } = require('../validation/vehicleSale.validation');

// GET /api/vehicle-sales  — paginated list (?page= &limit= &search=). ?all=1 returns
// everything (used by reports). Always returns { items, total, page, pages, limit }.
exports.list = async (req, res) => {
  try {
    const { search, all } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const q = { garageId: req.garage._id, active: { $ne: false } };
    if (search) {
      q.$or = [
        { invoiceNo:         { $regex: search, $options: 'i' } },
        { bookingNo:         { $regex: search, $options: 'i' } },
        { 'customer.name':   { $regex: search, $options: 'i' } },
        { 'customer.mobile': { $regex: search, $options: 'i' } }
      ];
    }
    const total = await VehicleSale.countDocuments(q);
    let query = VehicleSale.find(q).sort({ saleDate: -1, createdAt: -1 });
    if (!all) query = query.skip((page - 1) * limit).limit(limit);
    const items = await query;
    res.json({
      items, total,
      page:  all ? 1 : page,
      pages: all ? 1 : Math.max(1, Math.ceil(total / limit)),
      limit: all ? total : limit
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/vehicle-sales/:id
exports.getById = async (req, res) => {
  try {
    const sale = await VehicleSale.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/vehicle-sales
exports.create = async (req, res) => {
  try {
    const { valid, errors } = validateVehicleSale(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const sale = await VehicleSale.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/vehicle-sales/:id
exports.update = async (req, res) => {
  try {
    const { valid, errors } = validateVehicleSale(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const { garageId, _id, ...payload } = req.body;
    const sale = await VehicleSale.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/vehicle-sales/:id  — soft delete (matches project convention)
exports.remove = async (req, res) => {
  try {
    const sale = await VehicleSale.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/vehicle-sales/:id/payments  — record an installment payment.
exports.addPayment = async (req, res) => {
  try {
    const sale = await VehicleSale.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!sale) return res.status(404).json({ message: 'Not found' });

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'A valid payment amount is required.' });

    // Block overpayment — a payment can bring the balance to 0 but never below.
    const paidSoFar = (sale.payment.advancePaid || 0) + sale.payments.reduce((s, p) => s + (p.amount || 0), 0);
    const remaining = (sale.payment.netPayable || 0) - paidSoFar;
    if (remaining <= 0) return res.status(400).json({ message: 'This sale is already fully paid.' });
    if (amount > remaining) return res.status(400).json({ message: `Payment exceeds remaining balance (₹${remaining.toLocaleString('en-IN')}).` });

    sale.payments.push({
      amount,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      mode: req.body.mode || '',
      reference: req.body.reference || '',
      note: req.body.note || ''
    });

    const installments = sale.payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalPaid = (sale.payment.advancePaid || 0) + installments;
    sale.payment.totalPaid = totalPaid;
    sale.payment.balanceAmount = (sale.payment.netPayable || 0) - totalPaid;
    sale.payment.paymentStatus = sale.payment.balanceAmount <= 0 ? 'Paid' : 'Pending';

    await sale.save();
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/vehicle-sales/reports/summary  — totals for the Sale Reports page
exports.summary = async (req, res) => {
  try {
    const sales = await VehicleSale.find({ garageId: req.garage._id, active: { $ne: false } });
    const totalSales = sales.length;
    let totalVehicles = 0, grossAmount = 0, netPayable = 0, advancePaid = 0, balanceAmount = 0;
    for (const s of sales) {
      totalVehicles += (s.vehicles || []).length;
      grossAmount   += s.payment?.grossAmount   || 0;
      netPayable    += s.payment?.netPayable    || 0;
      advancePaid   += s.payment?.advancePaid   || 0;
      balanceAmount += s.payment?.balanceAmount || 0;
    }
    res.json({ totalSales, totalVehicles, grossAmount, netPayable, advancePaid, balanceAmount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
