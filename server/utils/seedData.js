const JobcardType = require('../models/masters/JobcardType');
const JobcardStatus = require('../models/masters/JobcardStatus');
const VehicleMake = require('../models/masters/VehicleMake');
const VehicleModel = require('../models/masters/VehicleModel');
const LabourItem = require('../models/masters/LabourItem');
const Lube = require('../models/masters/Lube');
const CustomerVoice = require('../models/masters/CustomerVoice');
const StaffRole = require('../models/masters/StaffRole');

const ALL_MENUS = ['dashboard','jobcards','customers','estimate','counter-sale','inventory','reports','cashbook','appointment','expenses','masters','staff','settings'];
const ALL_JOBCARD_PERMS = { canCreate: true, canEdit: true, canChangeStatus: true, canAddItems: true, canAddPayment: true, canApplyDiscount: true, canDelete: true };
const ALL_STOCK_PERMS = { canAdd: true, canEdit: true, canUploadCsv: true };

// Default roles seeded for every new garage — Mechanic + Supervisor, both with full permissions
const defaultRoles = (garageId) => ['Mechanic', 'Supervisor'].map(name => ({
  garageId, name, menuAccess: [...ALL_MENUS], jobcardPermissions: { ...ALL_JOBCARD_PERMS }, stockPermissions: { ...ALL_STOCK_PERMS }, isDefault: true, active: true,
}));

/* ── NOT SEEDED ───────────────────────────────────────────────────────────
   The lists below are kept for reference only — each franchise creates its own
   jobcard types, customer voices, labour items, lubes and vehicle makes/models
   from Masters. To re-enable any of them, uncomment the constant AND its lines
   in seedGarageData() / seedMissingGarageData() below.

const JOBCARD_TYPES = [
  'Major Service', 'Minor Service', 'General Repair',
  'Wheel Alignment & Balancing', 'Washing', 'Accidental Work', 'FREE Service 1'
];
*/

// ✅ STILL SEEDED — every new garage needs statuses to run the jobcard flow.
const JOBCARD_STATUSES = [
  { name: 'Work Not Yet Started (Open)', category: 'Open' },
  { name: 'Estimate Shared (Open)', category: 'Open' },
  { name: 'Waiting for Approval (Open)', category: 'Open' },
  { name: 'In Progress (Open)', category: 'Open' },
  { name: 'Waiting for Parts (Open)', category: 'Open' },
  { name: 'Completed', category: 'Completed' },
  { name: 'Closed', category: 'Closed' }
];

/* ── NOT SEEDED (kept for reference) ──────────────────────────────────────
const CUSTOMER_VOICE_OPTIONS = [
  'Servicing', 'General Repair', 'Accidental Repair', 'Wheel Alignment',
  'Balancing', 'Washing', 'Oil Check and Change', 'Customization',
  'Brake Check', 'Battery Check', 'Vibration', 'Mileage Check', 'Full Body Check'
];

const VEHICLE_DATA = {
  Hero: ['Glamour', 'Splendor Plus', 'HF Deluxe', 'Passion Pro', 'Xtreme 160R', 'Maestro Edge'],
  Honda: ['Activa 6G', 'Shine', 'Unicorn', 'CB Hornet 160R', 'SP 125', 'Dio'],
  Bajaj: ['Pulsar 150', 'Pulsar NS200', 'Dominar 400', 'CT 100', 'Platina 110', 'Avenger 220'],
  TVS: ['Apache RTR 160', 'Jupiter', 'Star City Plus', 'Ntorq 125', 'Raider 125', 'Sport'],
  'Royal Enfield': ['Classic 350', 'Meteor 350', 'Thunderbird 350', 'Himalayan', 'Bullet 350', 'Hunter 350'],
  Suzuki: ['Access 125', 'Burgman Street', 'Gixxer 150', 'Gixxer SF', 'Intruder', 'Avenis 125'],
  Yamaha: ['FZ S V3', 'R15 V4', 'MT-15', 'Fascino 125', 'RayZR 125', 'Aerox 155']
};

const LABOUR_ITEMS = [
  { name: 'Carburator Setting', jobCode: 'CS001', unitPrice: 70, isFrequent: true },
  { name: 'Wiring Work', jobCode: 'WW001', unitPrice: 500, isFrequent: true },
  { name: 'Excel Repair', jobCode: 'ER001', unitPrice: 200, isFrequent: true },
  { name: 'Clutch Hub Fitting Labour', jobCode: 'CHF001', unitPrice: 300, isFrequent: true },
  { name: 'Engine Oil Change', jobCode: 'EOC001', unitPrice: 100, isFrequent: true },
  { name: 'Air Filter Cleaning', jobCode: 'AFC001', unitPrice: 50, isFrequent: true },
  { name: 'Brake Adjustment', jobCode: 'BA001', unitPrice: 80, isFrequent: false },
  { name: 'Chain Cleaning & Lubing', jobCode: 'CCL001', unitPrice: 60, isFrequent: false }
];

const LUBE_ITEMS = [
  { name: 'Engine Oil', partNumber: 'EO001', unitPrice: 100, currentStock: 50, isFrequent: true },
  { name: 'Gear Box Oil', partNumber: 'GBO001', unitPrice: 70, currentStock: 30, isFrequent: true },
  { name: 'Chain Lube', partNumber: 'CL001', unitPrice: 100, currentStock: 20, isFrequent: true },
  { name: 'Coolant', partNumber: 'CO001', unitPrice: 80, currentStock: 25, isFrequent: false }
];
*/

// Only jobcard statuses + default staff roles are seeded. Jobcard types, customer
// voices, labour items, lubes and vehicle makes/models are intentionally NOT seeded —
// each franchise creates its own from Masters. Re-enable by uncommenting the blocks
// below together with their constants above.
const seedGarageData = async (garageId) => {
  try {
    await Promise.all([
      ...JOBCARD_STATUSES.map(s => JobcardStatus.create({ ...s, garageId, active: true })),
      StaffRole.insertMany(defaultRoles(garageId)),
      // ...JOBCARD_TYPES.map(name => JobcardType.create({ name, garageId, active: true })),
      // ...CUSTOMER_VOICE_OPTIONS.map(name => CustomerVoice.create({ name, garageId, active: true })),
      // ...LABOUR_ITEMS.map(item => LabourItem.create({ ...item, garageId, active: true })),
      // ...LUBE_ITEMS.map(item => Lube.create({ ...item, garageId, active: true })),
    ]);

    /* Vehicle makes/models — not seeded; franchises add their own.
    for (const [makeName, models] of Object.entries(VEHICLE_DATA)) {
      const make = await VehicleMake.create({ name: makeName, garageId, active: true });
      await Promise.all(
        models.map(modelName =>
          VehicleModel.create({ name: modelName, makeId: make._id, makeName, garageId, active: true })
        )
      );
    }
    */

    console.log(`Seeded data for garage ${garageId}`);
  } catch (error) {
    console.error('Seed error:', error.message);
  }
};

// Idempotent backfill for garages that were created without default masters
// (e.g. franchises created from the Super Admin panel before seeding was wired in).
// Only seeds a master type when that garage currently has NONE of it — existing
// data is never touched, duplicated or overwritten. Safe to run more than once.
const seedMissingGarageData = async (garageId) => {
  const added = {};

  const seedIfEmpty = async (key, Model, buildDocs) => {
    const count = await Model.countDocuments({ garageId });
    if (count > 0) { added[key] = 0; return; }
    const docs = buildDocs();
    await Model.insertMany(docs);
    added[key] = docs.length;
  };

  await seedIfEmpty('jobcardStatuses', JobcardStatus, () => JOBCARD_STATUSES.map(s => ({ ...s, garageId, active: true })));
  await seedIfEmpty('staffRoles',      StaffRole,     () => defaultRoles(garageId));

  // Not backfilled — franchises create these themselves from Masters:
  // await seedIfEmpty('jobcardTypes',   JobcardType,   () => JOBCARD_TYPES.map(name => ({ name, garageId, active: true })));
  // await seedIfEmpty('customerVoices', CustomerVoice, () => CUSTOMER_VOICE_OPTIONS.map(name => ({ name, garageId, active: true })));
  // await seedIfEmpty('labourItems',    LabourItem,    () => LABOUR_ITEMS.map(i => ({ ...i, garageId, active: true })));
  // await seedIfEmpty('lubes',          Lube,          () => LUBE_ITEMS.map(i => ({ ...i, garageId, active: true })));

  /* Vehicle makes/models — not backfilled either.
  const makeCount = await VehicleMake.countDocuments({ garageId });
  if (makeCount > 0) {
    added.vehicleMakes = 0;
  } else {
    let n = 0;
    for (const [makeName, models] of Object.entries(VEHICLE_DATA)) {
      const make = await VehicleMake.create({ name: makeName, garageId, active: true });
      await VehicleModel.insertMany(
        models.map(modelName => ({ name: modelName, makeId: make._id, makeName, garageId, active: true }))
      );
      n++;
    }
    added.vehicleMakes = n;
  }
  */

  return added;
};

module.exports = { seedGarageData, seedMissingGarageData, defaultRoles };
