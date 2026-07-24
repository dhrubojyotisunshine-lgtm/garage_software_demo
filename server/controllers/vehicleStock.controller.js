const VehicleStock = require('../models/vehicleStock.model');
const VehicleSale = require('../models/vehicleSale.model');
const { validateStock } = require('../validation/vehicleStock.validation');

function pick(body = {}) {
  return {
    vehicleModel:  body.vehicleModel,
    variant:       body.variant || '',
    color:         body.color || '',
    chassisNumber: body.chassisNumber || '',
    engineNumber:  body.engineNumber || '',
    qty:           body.qty === '' || body.qty === undefined || body.qty === null ? 1 : Number(body.qty),
    inDate:        body.inDate || undefined,
    dealerName:    body.dealerName || ''
  };
}

// GET /api/vehicle-stock  — paginated list (?page= &limit= &search=). Pass ?all=1
// to get every record (used by the stock picker & reports). Always returns
// { items, total, page, pages, limit }.
exports.list = async (req, res) => {
  try {
    const { search, all, fromDate, toDate } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    // Stock filter: 'available' (remaining > 0) | 'used' (remaining <= 0) | 'all'.
    // Default the list view to 'available'; all=1 callers (sale picker, reports)
    // stay unfiltered unless they explicitly ask.
    const stockFilter = req.query.stock || (all ? 'all' : 'available');

    const q = { garageId: req.garage._id, active: { $ne: false } };
    if (search && search.trim()) {
      // Multi-term search: every word must appear in at least one field, so
      // "activa 110 std" matches model "Activa 110" + variant "std", and
      // "activa white" matches model + color — same behaviour as the sale picker.
      const fields = ['vehicleModel', 'variant', 'color', 'chassisNumber', 'engineNumber', 'dealerName'];
      const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const terms = search.trim().split(/\s+/).filter(Boolean);
      q.$and = terms.map(t => ({
        $or: fields.map(f => ({ [f]: { $regex: esc(t), $options: 'i' } }))
      }));
    }

    // In Date range filter. toDate is inclusive — it covers the whole end day, so
    // picking the same date for both returns that day's records.
    if (fromDate || toDate) {
      q.inDate = {};
      if (fromDate) q.inDate.$gte = new Date(`${fromDate}T00:00:00.000`);
      if (toDate)   q.inDate.$lte = new Date(`${toDate}T23:59:59.999`);
    }

    // used/remaining depends on a sales aggregation, so it can't be filtered at the
    // DB level — fetch matching stock, compute remaining, filter, then paginate.
    const stock = await VehicleStock.find(q).sort({ createdAt: -1 });
    const ids = stock.map(s => s._id);
    const usage = ids.length ? await VehicleSale.aggregate([
      { $match: { garageId: req.garage._id, active: { $ne: false } } },
      { $unwind: '$vehicles' },
      { $match: { 'vehicles.stockId': { $in: ids } } },
      { $group: { _id: '$vehicles.stockId', used: { $sum: 1 } } }
    ]) : [];
    const usedMap = new Map(usage.map(u => [String(u._id), u.used]));

    let items = stock.map(s => {
      const used = usedMap.get(String(s._id)) || 0;
      return { ...s.toObject(), used, remaining: (s.qty || 0) - used };
    });

    if (stockFilter === 'available') items = items.filter(i => i.remaining > 0);
    else if (stockFilter === 'used')  items = items.filter(i => i.remaining <= 0);

    const total = items.length;
    const paged = all ? items : items.slice((page - 1) * limit, page * limit);

    res.json({
      items: paged,
      total,
      page:  all ? 1 : page,
      pages: all ? 1 : Math.max(1, Math.ceil(total / limit)),
      limit: all ? total : limit
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/vehicle-stock/:id
exports.getById = async (req, res) => {
  try {
    const item = await VehicleStock.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/vehicle-stock  — single object, or { items: [...] } for bulk add.
exports.create = async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.items) ? req.body.items : [req.body];
    const rows = raw.filter(r => r && String(r.vehicleModel || '').trim());
    if (rows.length === 0) return res.status(400).json({ message: 'At least one vehicle with a model is required.' });

    for (const r of rows) {
      const { valid, errors } = validateStock(r);
      if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    }
    const docs = rows.map(r => ({ ...pick(r), garageId: req.garage._id }));
    const created = await VehicleStock.insertMany(docs);
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/vehicle-stock/:id
exports.update = async (req, res) => {
  try {
    const { valid, errors } = validateStock(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed', errors });
    const item = await VehicleStock.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/vehicle-stock/:id  — soft delete
exports.remove = async (req, res) => {
  try {
    const item = await VehicleStock.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }
    );
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
