const Jobcard = require('../models/Jobcard');
const Customer = require('../models/Customer');
const SparePart = require('../models/masters/SparePart');
const Lube = require('../models/masters/Lube');
const { generateJobcardNumber } = require('../utils/jobcardNumber');
const { checkStock } = require('../utils/stockCheck');
const path = require('path');
const PDFDocument = require('pdfkit');

const OBJECTID_FIELDS = ['type', 'status', 'mechanicId', 'supervisorId', 'customerId', 'vehicleId'];
const ITEM_OBJECTID_FIELDS = ['itemId', 'mechanicId'];

const sanitizePayload = (body) => {
  const cleaned = { ...body };
  for (const field of OBJECTID_FIELDS) {
    if (cleaned[field] === '' || cleaned[field] === null) {
      delete cleaned[field];
    }
  }
  // Nested item ObjectId fields — empty string can't cast to ObjectId
  if (Array.isArray(cleaned.items)) {
    cleaned.items = cleaned.items.map(item => {
      const c = { ...item };
      for (const field of ITEM_OBJECTID_FIELDS) {
        if (c[field] === '' || c[field] === null) delete c[field];
      }
      return c;
    });
  }
  return cleaned;
};

const list = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { garageId: req.garage._id, deletedAt: { $exists: false } };

    if (status === 'open') query.statusCategory = 'Open';
    else if (status === 'completed') query.statusCategory = 'Completed';
    else if (status === 'closed') query.statusCategory = 'Closed';
    else if (status === 'deleted') {
      delete query.deletedAt;
      query.deletedAt = { $exists: true };
    }

    if (req.query.customerId) query.customerId = req.query.customerId;
    if (req.query.vehicleNoExact) query.vehicleNo = new RegExp(`^${req.query.vehicleNoExact}$`, 'i');

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { customerName: regex },
        { customerMobile: regex },
        { jobcardNumber: regex },
        { vehicleNo: regex }
      ];
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [jobcards, total] = await Promise.all([
      Jobcard.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Jobcard.countDocuments(query)
    ]);

    // Counts: a deleted jobcard counts ONLY under "deleted" (not its old status).
    // total = open + completed + closed + deleted (the four mutually-exclusive buckets).
    const counts = await Jobcard.aggregate([
      { $match: { garageId: req.garage._id } },
      { $group: {
        _id: null,
        open:      { $sum: { $cond: [{ $and: [{ $eq: ['$statusCategory', 'Open'] },      { $not: ['$deletedAt'] }] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $and: [{ $eq: ['$statusCategory', 'Completed'] }, { $not: ['$deletedAt'] }] }, 1, 0] } },
        closed:    { $sum: { $cond: [{ $and: [{ $eq: ['$statusCategory', 'Closed'] },    { $not: ['$deletedAt'] }] }, 1, 0] } },
        deleted:   { $sum: { $cond: [{ $ifNull: ['$deletedAt', false] }, 1, 0] } },
        total:     { $sum: 1 }
      }}
    ]);

    // Enrich each jobcard with its customer's type (read-only; not stored on the jobcard).
    const custIds = [...new Set(jobcards.map(j => String(j.customerId || '')).filter(Boolean))];
    const custs = custIds.length ? await Customer.find({ _id: { $in: custIds } }).select('customerType') : [];
    const typeMap = new Map(custs.map(c => [String(c._id), c.customerType || '']));
    const jobcardsOut = jobcards.map(j => ({ ...j.toObject(), customerType: typeMap.get(String(j.customerId)) || '' }));

    res.json({
      jobcards: jobcardsOut,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      counts: counts[0] || { open: 0, completed: 0, closed: 0, total: 0, deleted: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const body = sanitizePayload(req.body);

    if (body.vehicleNo) {
      const activeJc = await Jobcard.findOne({
        garageId: req.garage._id,
        vehicleNo: new RegExp(`^${String(body.vehicleNo).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        statusCategory: { $in: ['Open', 'Completed'] }, // anything not Closed
        deletedAt: { $exists: false }
      });
      if (activeJc) {
        return res.status(409).json({
          message: `Jobcard #${activeJc.jobcardNumber} for vehicle ${body.vehicleNo} is not closed yet. Close it before creating a new one.`
        });
      }
    }

    // Block if it would drive stock negative (unless Negative Inventory is enabled).
    const stockCheck = await checkStock(req.garage, (body.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: i.qty })));
    if (!stockCheck.ok) return res.status(400).json({ message: stockCheck.message });

    const jobcardNumber = await generateJobcardNumber(req.garage._id, req.garage.rtoNo);
    const totals = calcTotals(body.items || [], body.discount, body.discountType);

    const jobcard = await Jobcard.create({
      ...body,
      ...totals,
      garageId: req.garage._id,
      jobcardNumber: body.jobcardNumber || jobcardNumber
    });

    await adjustStock(body.items || [], 'decrement');
    res.status(201).json(jobcard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const jobcard = await Jobcard.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!jobcard) return res.status(404).json({ message: 'Jobcard not found' });
    const out = jobcard.toObject();
    if (jobcard.customerId) {
      const cust = await Customer.findById(jobcard.customerId).select('customerType');
      out.customerType = cust?.customerType || '';
    }
    res.json(out);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await Jobcard.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!existing) return res.status(404).json({ message: 'Jobcard not found' });

    const body = sanitizePayload(req.body);

    // Net stock impact = new items (deduct) minus old items (restore). Block if it
    // would go negative, unless Negative Inventory is enabled.
    const stockCheck = await checkStock(req.garage, [
      ...(body.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: i.qty })),
      ...(existing.items || []).map(i => ({ itemType: i.itemType, itemId: i.itemId, qty: -(i.qty || 0) })),
    ]);
    if (!stockCheck.ok) return res.status(400).json({ message: stockCheck.message });

    await adjustStock(existing.items || [], 'increment');

    const totals = calcTotals(body.items || [], body.discount, body.discountType);
    const updated = await Jobcard.findByIdAndUpdate(
      req.params.id,
      { ...body, ...totals, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    await adjustStock(body.items || [], 'decrement');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await Jobcard.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!existing) return res.status(404).json({ message: 'Jobcard not found' });

    // A closed jobcard is final — it cannot be deleted.
    if (existing.statusCategory === 'Closed' && !existing.deletedAt) {
      return res.status(403).json({ message: 'A closed jobcard cannot be deleted.' });
    }

    const jobcard = await Jobcard.findByIdAndUpdate(
      existing._id,
      { deletedAt: new Date() },
      { new: true }
    );
    await adjustStock(jobcard.items || [], 'increment');
    res.json({ message: 'Jobcard deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadPhotos = async (req, res) => {
  try {
    const jobcard = await Jobcard.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!jobcard) return res.status(404).json({ message: 'Jobcard not found' });

    const newPhotos = req.files.map(f => `/uploads/jobcards/${f.filename}`);
    jobcard.photos.push(...newPhotos);
    await jobcard.save();

    res.json({ photos: jobcard.photos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generatePdf = async (req, res) => {
  try {
    const jobcard = await Jobcard.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!jobcard) return res.status(404).json({ message: 'Jobcard not found' });

    const garage = req.garage;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${jobcard.jobcardNumber}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#E53935').text(garage.workshopName, { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`${garage.address || ''} | ${garage.mobile}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).fillColor('#000').text('INVOICE', { align: 'center' });
    doc.fontSize(10).text(`Jobcard No: ${jobcard.jobcardNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(jobcard.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    doc.fontSize(11).fillColor('#333').text(`Customer: ${jobcard.customerName || '-'}`);
    doc.text(`Mobile: ${jobcard.customerMobile || '-'}`);
    doc.text(`Vehicle: ${jobcard.vehicleMake || ''} ${jobcard.vehicleModel || ''} | No: ${jobcard.vehicleNo || '-'}`);
    doc.text(`KM Reading: ${jobcard.kmReading || '-'}`);
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#E53935').text('Particulars', 50, tableTop, { width: 200 });
    doc.text('Type', 260, tableTop, { width: 60 });
    doc.text('Qty', 330, tableTop, { width: 40 });
    doc.text('Unit Price', 380, tableTop, { width: 80 });
    doc.text('Amount', 470, tableTop, { width: 80 });
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke('#ccc');
    doc.moveDown(0.5);

    doc.fillColor('#333');
    (jobcard.items || []).forEach(item => {
      const y = doc.y;
      doc.text(item.name || '-', 50, y, { width: 200 });
      doc.text(item.itemType || '-', 260, y, { width: 60 });
      doc.text(String(item.qty || 1), 330, y, { width: 40 });
      doc.text(`₹${item.unitPrice || 0}`, 380, y, { width: 80 });
      doc.text(`₹${item.finalAmount || 0}`, 470, y, { width: 80 });
      doc.moveDown(0.3);
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
    doc.moveDown();

    const rightX = 370;
    doc.text('Labour Total:', rightX, doc.y, { width: 100 });
    doc.text(`₹${jobcard.labourTotal || 0}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    doc.text('Spare Total:', rightX);
    doc.text(`₹${jobcard.spareTotal || 0}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    doc.text('Lube Total:', rightX);
    doc.text(`₹${jobcard.lubeTotal || 0}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    doc.fontSize(12).text('Total:', rightX);
    doc.text(`₹${jobcard.total || 0}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    if (jobcard.discount > 0) {
      doc.fontSize(10).text(`Discount (${jobcard.discountType === 'percent' ? jobcard.discount + '%' : '₹' + jobcard.discount}):`, rightX);
      doc.text(`-₹${jobcard.discount}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    }
    doc.fontSize(13).fillColor('#E53935').text('Bill Amount:', rightX);
    doc.text(`₹${jobcard.billAmount || 0}`, 480, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    doc.fontSize(10).fillColor('#333').text(`Paid: ₹${jobcard.paidAmount || 0}`, rightX);
    doc.fillColor('#E53935').text(`Balance Due: ₹${jobcard.balanceDue || 0}`, rightX);

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calcTotals = (items, discount, discountType) => {
  const labourTotal = items.filter(i => i.itemType === 'Labour').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const spareTotal = items.filter(i => i.itemType === 'Spare').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const lubeTotal = items.filter(i => i.itemType === 'Lube').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const outsourceTotal = items.filter(i => i.itemType === 'Outsource').reduce((s, i) => s + (i.finalAmount || 0), 0);
  const total = labourTotal + spareTotal + lubeTotal + outsourceTotal;
  let discountAmount = 0;
  if (discount > 0) {
    discountAmount = discountType === 'percent' ? (total * discount) / 100 : discount;
  }
  const billAmount = total - discountAmount;
  return { labourTotal, spareTotal, lubeTotal, outsourceTotal, total, billAmount };
};

const adjustStock = async (items, direction) => {
  const delta = direction === 'decrement' ? -1 : 1;
  for (const item of items) {
    if (item.itemType === 'Spare') {
      await SparePart.findByIdAndUpdate(item.itemId, { $inc: { currentStock: delta * (item.qty || 1) } });
    } else if (item.itemType === 'Lube') {
      await Lube.findByIdAndUpdate(item.itemId, { $inc: { currentStock: delta * (item.qty || 1) } });
    }
  }
};

module.exports = { list, create, getById, update, remove, uploadPhotos, generatePdf };
