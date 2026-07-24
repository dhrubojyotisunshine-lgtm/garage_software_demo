const Ledger = require('../models/ledger.model');
const { validateLedger } = require('../validation/ledger.validation');

// Build a payload with only the whitelisted Ledger fields.
function pick(body = {}) {
  return {
    partyId:    body.partyId || undefined,
    partyPhone: body.partyPhone || '',
    partyName:  body.partyName,
    amount:     body.amount,
    date:       body.date,
    type:       body.type,
    narration:  body.narration || '',
    remark:     body.remark || ''
  };
}

// Aggregate a set of ledger entries into a Tally-style response with running
// balance (Credit − Debit). `entries` must already be sorted ascending by date.
function buildLedgerResponse(entries, displayName, query = {}) {
  const { dateFrom, dateTo } = query;
  const from = dateFrom ? new Date(dateFrom) : null;
  let to = null;
  if (dateTo) { to = new Date(dateTo); to.setHours(23, 59, 59, 999); }

  const net = (e) => (e.type === 'Credit' ? e.amount : -e.amount);

  let opening = 0;
  if (from) entries.forEach(e => { if (new Date(e.date) < from) opening += net(e); });

  let sumDebit = 0, sumCredit = 0;
  entries.forEach(e => { if (e.type === 'Debit') sumDebit += e.amount; else sumCredit += e.amount; });

  let balance = opening, totalDebit = 0, totalCredit = 0;
  const rows = [];
  for (const e of entries) {
    const d = new Date(e.date);
    if (from && d < from) continue;
    if (to && d > to) continue;
    const debit = e.type === 'Debit' ? e.amount : 0;
    const credit = e.type === 'Credit' ? e.amount : 0;
    totalDebit += debit; totalCredit += credit;
    balance += credit - debit;
    rows.push({
      _id: e._id, date: e.date, type: e.type,
      narration: e.narration || '', remark: e.remark || '',
      debit, credit, balance
    });
  }

  return {
    partyName: displayName,
    partyPhone: entries[0]?.partyPhone || '',
    summary: {
      totalDebit: sumDebit,
      totalCredit: sumCredit,
      balance: sumCredit - sumDebit,
      count: entries.length,
      firstDate: entries[0].date,
      lastDate: entries[entries.length - 1].date
    },
    opening, rows, totalDebit, totalCredit, closing: balance
  };
}

// GET /api/ledger  — list (optional ?search= on party name / narration / remark)
exports.list = async (req, res) => {
  try {
    const { search } = req.query;
    const q = { garageId: req.garage._id };
    if (search) {
      q.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { narration: { $regex: search, $options: 'i' } },
        { remark:    { $regex: search, $options: 'i' } }
      ];
    }
    const ledgers = await Ledger.find(q).sort({ date: -1, createdAt: -1 });
    res.json(ledgers);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/ledger/:id
exports.getById = async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!ledger) return res.status(404).json({ message: 'Not found' });
    res.json(ledger);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/ledger
exports.create = async (req, res) => {
  try {
    const { valid, errors } = validateLedger(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const ledger = await Ledger.create({ ...pick(req.body), garageId: req.garage._id });
    res.status(201).json(ledger);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/ledger/:id
exports.update = async (req, res) => {
  try {
    const { valid, errors } = validateLedger(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const ledger = await Ledger.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!ledger) return res.status(404).json({ message: 'Not found' });
    res.json(ledger);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/ledger/by-party/:partyId  — ledger for one party by its master id
// (the canonical grouping: all entries for the same party roll up here).
exports.partyLedgerById = async (req, res) => {
  try {
    const all = await Ledger.find({ partyId: req.params.partyId, garageId: req.garage._id }).sort({ date: 1, createdAt: 1 });
    if (all.length === 0) return res.status(404).json({ message: 'No entries for this party' });
    res.json(buildLedgerResponse(all, all[0].partyName, req.query));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/ledger/party/:name  — legacy grouping by party name (fallback for
// entries created before parties existed / without a partyId).
exports.partyLedger = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const all = await Ledger.find({ partyName: name, garageId: req.garage._id }).sort({ date: 1, createdAt: 1 });
    if (all.length === 0) return res.status(404).json({ message: 'No entries for this party' });
    res.json(buildLedgerResponse(all, name, req.query));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/ledger/:id  — hard delete (schema has no soft-delete flag)
exports.remove = async (req, res) => {
  try {
    const ledger = await Ledger.findOneAndDelete({ _id: req.params.id, garageId: req.garage._id });
    if (!ledger) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
