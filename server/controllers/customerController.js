const Customer = require('../models/Customer');
const Jobcard   = require('../models/Jobcard');
const CounterSale = require('../models/CounterSale');

const list = async (req, res) => {
  try {
    const { search, page = 1, limit = 30, status, followUp } = req.query;
    const query = { garageId: req.garage._id, deletedAt: { $exists: false } };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { mobile: regex }, { 'vehicles.vehicleNo': regex }];
    }
    if (status && status !== 'all') query.status = status;
    if (followUp === 'overdue') {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      query.followUpDate = { $lte: today };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Customer.countDocuments(query)
    ]);

    // Attach quick stats per customer
    const ids = customers.map(c => c._id);
    const [jobcards, counters] = await Promise.all([
      Jobcard.find({ garageId: req.garage._id, customerId: { $in: ids }, deletedAt: null },
        'customerId billAmount createdAt').lean(),
      CounterSale.find({ garageId: req.garage._id, customerId: { $in: ids }, active: { $ne: false } },
        'customerId total createdAt').lean()
    ]);

    const statsMap = {};
    ids.forEach(id => { statsMap[String(id)] = { visits: 0, totalSpend: 0, lastVisit: null }; });
    jobcards.forEach(j => {
      const k = String(j.customerId);
      if (statsMap[k]) {
        statsMap[k].visits++;
        statsMap[k].totalSpend += j.billAmount || 0;
        if (!statsMap[k].lastVisit || j.createdAt > statsMap[k].lastVisit) statsMap[k].lastVisit = j.createdAt;
      }
    });
    counters.forEach(c => {
      const k = String(c.customerId);
      if (statsMap[k]) {
        statsMap[k].totalSpend += c.total || 0;
        if (!statsMap[k].lastVisit || c.createdAt > statsMap[k].lastVisit) statsMap[k].lastVisit = c.createdAt;
      }
    });

    const enriched = customers.map(c => ({
      ...c.toObject(),
      _stats: statsMap[String(c._id)] || { visits: 0, totalSpend: 0, lastVisit: null }
    }));

    res.json({ customers: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const regex = new RegExp(q, 'i');
    const customers = await Customer.find({
      garageId: req.garage._id,
      deletedAt: { $exists: false },
      $or: [{ name: regex }, { mobile: regex }, { 'vehicles.vehicleNo': regex }]
    }).limit(10);

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isValidMobile = (m) => /^[6-9]\d{9}$/.test(String(m || '').trim());

// Registration number (vehicleNo) must be unique across customers in a garage.
// Returns the first conflicting registration, or null. `excludeId` skips the
// customer being edited so updating their own vehicle doesn't false-trigger.
const findDuplicateReg = async (garageId, vehicles, excludeId) => {
  for (const v of vehicles || []) {
    const reg = (v?.vehicleNo || '').trim();
    if (!reg) continue;
    const q = {
      garageId,
      deletedAt: { $exists: false },
      'vehicles.vehicleNo': new RegExp(`^${reg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    };
    if (excludeId) q._id = { $ne: excludeId };
    if (await Customer.exists(q)) return reg;
  }
  return null;
};

const create = async (req, res) => {
  try {
    if (!isValidMobile(req.body.mobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number starting with 6-9' });
    }
    const dupReg = await findDuplicateReg(req.garage._id, req.body.vehicles, null);
    if (dupReg) return res.status(400).json({ message: `Vehicle registration ${dupReg} is already registered to another customer.` });

    const customer = await Customer.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    if (req.body.mobile !== undefined && !isValidMobile(req.body.mobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number starting with 6-9' });
    }
    const dupReg = await findDuplicateReg(req.garage._id, req.body.vehicles, req.params.id);
    if (dupReg) return res.status(400).json({ message: `Vehicle registration ${dupReg} is already registered to another customer.` });

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Fetch jobcards + counter sales for timeline + stats
    const [jobcards, counters] = await Promise.all([
      Jobcard.find({ garageId: req.garage._id, customerId: req.params.id, deletedAt: null })
        .sort({ createdAt: -1 })
        .select('jobcardNumber statusLabel statusCategory billAmount paidAmount balanceDue createdAt vehicleNo vehicleMake vehicleModel')
        .lean(),
      CounterSale.find({ garageId: req.garage._id, customerId: req.params.id, active: { $ne: false } })
        .sort({ createdAt: -1 })
        .select('counterNumber total paidAmount balanceDue createdAt')
        .lean()
    ]);

    const totalSpend   = jobcards.reduce((s, j) => s + (j.billAmount || 0), 0)
                       + counters.reduce((s, c) => s + (c.total || 0), 0);
    const avgBill      = jobcards.length ? (jobcards.reduce((s, j) => s + (j.billAmount || 0), 0) / jobcards.length) : 0;
    const allDates     = [...jobcards, ...counters].map(x => x.createdAt).sort((a,b) => new Date(b)-new Date(a));
    const lastVisit    = allDates[0] || null;

    res.json({
      customer,
      stats: { visits: jobcards.length, totalSpend, avgBill, lastVisit },
      jobcards,
      counters
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Note text required' });
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { $push: { notes: { text: text.trim(), createdAt: new Date() } } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json(customer.notes[customer.notes.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setFollowUp = async (req, res) => {
  try {
    const { followUpDate, followUpNote } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { followUpDate, followUpNote },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json({ followUpDate: customer.followUpDate, followUpNote: customer.followUpNote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { list, search, create, update, getById, addNote, setFollowUp };
