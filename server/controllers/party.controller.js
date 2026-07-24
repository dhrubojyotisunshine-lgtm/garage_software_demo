const Party = require('../models/party.model');
const Ledger = require('../models/ledger.model');
const { validateParty } = require('../validation/party.validation');

// GET /api/party  — paginated list of parties, each enriched with its ledger balance.
// ?page= &limit= &search=. ?all=1 returns everything (used by the party picker).
// Always returns { items, total, page, pages, limit }.
exports.list = async (req, res) => {
  try {
    const { search, all } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const q = { garageId: req.garage._id };
    if (search) {
      q.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { phone:     { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Party.countDocuments(q);
    let query = Party.find(q).sort({ partyName: 1 });
    if (!all) query = query.skip((page - 1) * limit).limit(limit);
    const parties = await query;

    const ids = parties.map(p => p._id);
    const agg = ids.length ? await Ledger.aggregate([
      { $match: { garageId: req.garage._id, partyId: { $in: ids } } },
      { $group: {
        _id: '$partyId',
        credit: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$amount', 0] } },
        debit:  { $sum: { $cond: [{ $eq: ['$type', 'Debit'] }, '$amount', 0] } },
        count:  { $sum: 1 },
        lastDate: { $max: '$date' }
      } }
    ]) : [];
    const m = new Map(agg.map(a => [String(a._id), a]));

    const items = parties.map(p => {
      const a = m.get(String(p._id)) || { credit: 0, debit: 0, count: 0, lastDate: null };
      return {
        ...p.toObject(),
        totalCredit: a.credit, totalDebit: a.debit, balance: a.credit - a.debit,
        txnCount: a.count, lastDate: a.lastDate
      };
    });
    res.json({
      items, total,
      page:  all ? 1 : page,
      pages: all ? 1 : Math.max(1, Math.ceil(total / limit)),
      limit: all ? total : limit
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/party/:id  — hard delete the party master (ledger entries keep their name).
exports.remove = async (req, res) => {
  try {
    const party = await Party.findOneAndDelete({ _id: req.params.id, garageId: req.garage._id });
    if (!party) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/party/:id
exports.getById = async (req, res) => {
  try {
    const party = await Party.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!party) return res.status(404).json({ message: 'Not found' });
    res.json(party);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/party
exports.create = async (req, res) => {
  try {
    const { valid, errors } = validateParty(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const party = await Party.create({
      partyName: String(req.body.partyName).trim(),
      phone:     String(req.body.phone).trim(),
      garageId:  req.garage._id
    });
    res.status(201).json(party);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A party with this phone number already exists.', errors: { phone: 'Phone number already exists.' } });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/party/:id
exports.update = async (req, res) => {
  try {
    const { valid, errors } = validateParty(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { partyName: String(req.body.partyName).trim(), phone: String(req.body.phone).trim() },
      { new: true, runValidators: true }
    );
    if (!party) return res.status(404).json({ message: 'Not found' });
    res.json(party);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A party with this phone number already exists.', errors: { phone: 'Phone number already exists.' } });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = exports;
