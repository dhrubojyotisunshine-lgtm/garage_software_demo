/**
 * One-time migration: ensure every existing garage has the default
 * Mechanic + Supervisor roles (full permissions).
 *
 * Idempotent — only creates a role if one with that name is missing for the
 * garage; never overwrites an existing (possibly customised) role.
 *
 * Run: node utils/migrateDefaultRoles.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Garage = require('../models/Garage');
const StaffRole = require('../models/masters/StaffRole');
const { defaultRoles } = require('./seedData');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const garages = await Garage.find({}, '_id workshopName').lean();
  let created = 0, skipped = 0;

  for (const g of garages) {
    const existing = await StaffRole.find({ garageId: g._id }, 'name').lean();
    const have = new Set(existing.map(r => r.name.toLowerCase()));
    const toAdd = defaultRoles(g._id).filter(r => !have.has(r.name.toLowerCase()));

    if (toAdd.length) {
      await StaffRole.insertMany(toAdd);
      created += toAdd.length;
      console.log(`+ ${g.workshopName || g._id}: added ${toAdd.map(r => r.name).join(', ')}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. ${garages.length} garages · ${created} roles created · ${skipped} already had both.`);
  await mongoose.disconnect();
})().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
