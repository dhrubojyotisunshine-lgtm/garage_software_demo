const Estimate = require('../models/Estimate');
const Jobcard = require('../models/Jobcard');
const { generateEstimateNumber } = require('../utils/estimateNumber');
const { generateJobcardNumber } = require('../utils/jobcardNumber');

const ESTIMATE_OBJECTID_FIELDS = ['customerId', 'vehicleId'];

/* Strip empty-string/null ObjectId fields — '' can't cast to ObjectId */
const sanitizePayload = (body) => {
  const cleaned = { ...body };
  for (const field of ESTIMATE_OBJECTID_FIELDS) {
    if (cleaned[field] === '' || cleaned[field] === null) delete cleaned[field];
  }
  if (Array.isArray(cleaned.items)) {
    cleaned.items = cleaned.items.map(item => {
      const c = { ...item };
      if (c.itemId === '' || c.itemId === null) delete c.itemId;
      return c;
    });
  }
  return cleaned;
};

const calcTotals = (items) => {
  const labourTotal = items.filter(i => i.itemType === 'Labour').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const spareTotal = items.filter(i => i.itemType === 'Spare').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const lubeTotal = items.filter(i => i.itemType === 'Lube').reduce((s, i) => s + (i.finalAmount || 0), 0);
  return { labourTotal, spareTotal, lubeTotal, total: labourTotal + spareTotal + lubeTotal };
};

const list = async (req, res) => {
  try {
    const { search, date, page = 1, limit = 20 } = req.query;
    const query = { garageId: req.garage._id };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { customerName: regex },
        { customerMobile: regex },
        { estimateNumber: regex },
        { vehicleNo: regex }
      ];
    }

    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.estimateDate = { $gte: d, $lt: next };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [estimates, total] = await Promise.all([
      Estimate.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Estimate.countDocuments(query)
    ]);

    res.json({ estimates, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const estimateNumber = await generateEstimateNumber(req.garage._id);
    const body = sanitizePayload(req.body);
    const totals = calcTotals(body.items || []);
    const estimate = await Estimate.create({
      ...body,
      ...totals,
      garageId: req.garage._id,
      estimateNumber: body.estimateNumber || estimateNumber
    });
    res.status(201).json(estimate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const body = sanitizePayload(req.body);
    const totals = calcTotals(body.items || []);
    const estimate = await Estimate.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { ...body, ...totals, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const estimate = await Estimate.findOneAndDelete({ _id: req.params.id, garageId: req.garage._id });
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    res.json({ message: 'Estimate deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const convertToJobcard = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });

    const jobcardNumber = await generateJobcardNumber(req.garage._id, req.garage.rtoNo);
    const jobcard = await Jobcard.create({
      garageId: req.garage._id,
      jobcardNumber,
      customerId: estimate.customerId,
      customerName: estimate.customerName,
      customerMobile: estimate.customerMobile,
      vehicleId: estimate.vehicleId,
      vehicleNo: estimate.vehicleNo,
      vehicleMake: estimate.vehicleMake,
      vehicleModel: estimate.vehicleModel,
      items: estimate.items,
      labourTotal: estimate.labourTotal,
      spareTotal: estimate.spareTotal,
      lubeTotal: estimate.lubeTotal,
      total: estimate.total,
      billAmount: estimate.total,
      statusCategory: 'Open'
    });

    await Estimate.findByIdAndUpdate(estimate._id, {
      status: 'Converted',
      convertedJobcardId: jobcard._id
    });

    res.json({ jobcard, message: 'Converted to jobcard' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { list, create, getById, update, remove, convertToJobcard };
