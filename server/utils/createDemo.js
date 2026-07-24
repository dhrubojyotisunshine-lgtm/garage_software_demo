require('dotenv').config();
const mongoose = require('mongoose');
const Garage = require('../models/Garage');
const { seedGarageData } = require('./seedData');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  let garage = await Garage.findOne({ mobile: '9999999999' });
  if (!garage) {
    garage = new Garage({
      firstName: 'Demo',
      lastName: 'Owner',
      workshopName: 'Demo Auto Works',
      mobile: '9999999999',
      email: 'demo@ttngarage.com',
      password: 'demo123',
      rtoNo: 'MH50',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      vehicleTypes: ['2W', '4W'],
      isVerified: true
    });
    await garage.save();
    console.log('Demo garage created');
  } else {
    garage.password = 'demo123';
    garage.isVerified = true;
    await garage.save();
    console.log('Demo garage updated');
  }

  if (!garage.seeded) {
    await seedGarageData(garage._id);
    garage.seeded = true;
    await garage.save();
    console.log('Masters seeded');
  }

  await mongoose.disconnect();
  console.log('Done. Login with mobile: 9999999999 / password: demo123');
})();
