const JobcardType = require('../models/masters/JobcardType');
const JobcardStatus = require('../models/masters/JobcardStatus');
const VehicleMake = require('../models/masters/VehicleMake');
const VehicleModel = require('../models/masters/VehicleModel');
const LabourItem = require('../models/masters/LabourItem');
const SparePart = require('../models/masters/SparePart');
const Lube = require('../models/masters/Lube');
const CustomerVoice = require('../models/masters/CustomerVoice');
const Staff = require('../models/masters/Staff');
const ServicePackage = require('../models/masters/ServicePackage');

const MODEL_MAP = {
  'jobcard-types': JobcardType,
  'jobcard-statuses': JobcardStatus,
  'vehicle-makes': VehicleMake,
  'vehicle-models': VehicleModel,
  'labour': LabourItem,
  'spares': SparePart,
  'lubes': Lube,
  'customer-voice': CustomerVoice,
  'staff': Staff,
  'packages': ServicePackage
};

const getModel = (entity) => MODEL_MAP[entity];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Inventory-style entities whose code must be present and unique per garage.
// code field differs: spares & lubes use partNumber, labour uses jobCode.
const DEDUP_CODE_FIELD = { spares: 'partNumber', lubes: 'partNumber', labour: 'jobCode' };
const CODE_LABEL = { partNumber: 'part number', jobCode: 'job code' };

// Human label for the code field of an entity (e.g. 'part number', 'job code').
const codeLabelFor = (entity) => CODE_LABEL[DEDUP_CODE_FIELD[entity]] || 'code';

// Returns an existing active doc that collides by code, else null. Name is NOT deduped.
const findDuplicate = async (Model, entity, garageId, body, excludeId) => {
  const codeField = DEDUP_CODE_FIELD[entity];
  if (!codeField) return null;
  const code = (body[codeField] || '').trim();
  if (!code) return null;
  const q = { garageId, active: { $ne: false }, [codeField]: new RegExp(`^${escapeRegex(code)}$`, 'i') };
  if (excludeId) q._id = { $ne: excludeId };
  const dup = await Model.findOne(q);
  if (!dup) return null;
  return { dup, field: codeLabelFor(entity) };
};

const list = async (req, res) => {
  try {
    const Model = getModel(req.params.entity);
    if (!Model) return res.status(404).json({ message: 'Unknown entity' });

    const query = { garageId: req.garage._id, active: { $ne: false } };
    if (req.query.makeId) query.makeId = req.query.makeId;

    const docs = await Model.find(query).sort({ createdAt: 1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const Model = getModel(req.params.entity);
    if (!Model) return res.status(404).json({ message: 'Unknown entity' });

    const codeField = DEDUP_CODE_FIELD[req.params.entity];
    if (codeField && !(req.body[codeField] || '').trim()) {
      return res.status(400).json({ message: `The ${codeLabelFor(req.params.entity)} is required.` });
    }
    const collision = await findDuplicate(Model, req.params.entity, req.garage._id, req.body);
    if (collision) {
      return res.status(409).json({ message: `An item with this ${collision.field} already exists ("${collision.dup.name}").` });
    }

    const doc = await Model.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const Model = getModel(req.params.entity);
    if (!Model) return res.status(404).json({ message: 'Unknown entity' });

    const codeField = DEDUP_CODE_FIELD[req.params.entity];
    if (codeField && Object.prototype.hasOwnProperty.call(req.body, codeField) && !(req.body[codeField] || '').trim()) {
      return res.status(400).json({ message: `The ${codeLabelFor(req.params.entity)} is required.` });
    }
    const collision = await findDuplicate(Model, req.params.entity, req.garage._id, req.body, req.params.id);
    if (collision) {
      return res.status(409).json({ message: `An item with this ${collision.field} already exists ("${collision.dup.name}").` });
    }

    const doc = await Model.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const Model = getModel(req.params.entity);
    if (!Model) return res.status(404).json({ message: 'Unknown entity' });

    const doc = await Model.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { list, create, update, remove };
