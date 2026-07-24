require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose   = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');
const connectDB  = require('../config/db');

async function seed() {
  await connectDB();

  const email    = process.env.SUPER_ADMIN_EMAIL    || 'superadmin@ttngarage.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
  const name     = process.env.SUPER_ADMIN_NAME     || 'Super Admin';

  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    console.log('Super admin already exists:', email);
    process.exit(0);
  }

  await SuperAdmin.create({ name, email, password });
  console.log('✅ Super admin created');
  console.log('   Email   :', email);
  console.log('   Password:', password);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
