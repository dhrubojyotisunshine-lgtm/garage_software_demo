require('dotenv').config();
const mongoose = require('mongoose');
const Garage = require('../models/Garage');
const Staff = require('../models/masters/Staff');
const SparePart = require('../models/masters/SparePart');

const STAFF = [
  { name: 'Ramesh Kumar',    role: 'Mechanic',   mobile: '9876543210' },
  { name: 'Suresh Patel',    role: 'Mechanic',   mobile: '9876543211' },
  { name: 'Mahesh Singh',    role: 'Mechanic',   mobile: '9876543212' },
  { name: 'Dinesh Yadav',    role: 'Supervisor', mobile: '9876543213' },
  { name: 'Rajesh Sharma',   role: 'Supervisor', mobile: '9876543214' },
];

const SPARES = [
  { name: 'Brake Shoe (Front)',        partNumber: 'BS-F-001', unitPrice: 350,  currentStock: 20, isFrequent: true  },
  { name: 'Brake Shoe (Rear)',         partNumber: 'BS-R-001', unitPrice: 300,  currentStock: 20, isFrequent: true  },
  { name: 'Air Filter',                partNumber: 'AF-001',   unitPrice: 174,  currentStock: 30, isFrequent: true  },
  { name: 'Oil Filter',                partNumber: 'OF-001',   unitPrice: 120,  currentStock: 25, isFrequent: true  },
  { name: 'Spark Plug (NGK)',          partNumber: 'SP-NGK-01',unitPrice: 85,   currentStock: 40, isFrequent: true  },
  { name: 'Chain Kit (Standard)',      partNumber: 'CK-STD-01',unitPrice: 850,  currentStock: 10, isFrequent: false },
  { name: 'Clutch Cable',              partNumber: 'CC-001',   unitPrice: 120,  currentStock: 15, isFrequent: false },
  { name: 'Accelerator Cable',         partNumber: 'AC-001',   unitPrice: 110,  currentStock: 15, isFrequent: false },
  { name: 'Rear Brake Liner',          partNumber: 'RBL-001',  unitPrice: 203,  currentStock: 12, isFrequent: false },
  { name: 'Head Light Bulb (12V/35W)', partNumber: 'HLB-001',  unitPrice: 114,  currentStock: 20, isFrequent: false },
  { name: 'Tail Light Bulb',           partNumber: 'TLB-001',  unitPrice: 45,   currentStock: 25, isFrequent: false },
  { name: 'Battery (12V/5Ah)',         partNumber: 'BAT-001',  unitPrice: 1200, currentStock: 5,  isFrequent: false },
  { name: 'Tyre (Front 90/90-17)',     partNumber: 'TYF-001',  unitPrice: 1400, currentStock: 8,  isFrequent: false },
  { name: 'Tyre (Rear 100/90-17)',     partNumber: 'TYR-001',  unitPrice: 1600, currentStock: 8,  isFrequent: false },
  { name: 'Tube (Front)',              partNumber: 'TBF-001',  unitPrice: 180,  currentStock: 10, isFrequent: false },
  { name: 'Tube (Rear)',               partNumber: 'TBR-001',  unitPrice: 200,  currentStock: 10, isFrequent: false },
  { name: 'Piston Ring Set',           partNumber: 'PRS-001',  unitPrice: 450,  currentStock: 6,  isFrequent: false },
  { name: 'Throttle Body Gasket',      partNumber: 'TBG-001',  unitPrice: 95,   currentStock: 12, isFrequent: false },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const garage = await Garage.findOne({ mobile: '9999999999' });
  if (!garage) { console.error('Demo garage not found. Run createDemo.js first.'); process.exit(1); }

  const garageId = garage._id;

  // Staff
  let staffAdded = 0;
  for (const s of STAFF) {
    const exists = await Staff.findOne({ garageId, name: s.name });
    if (!exists) {
      await Staff.create({ ...s, garageId, active: true });
      staffAdded++;
    }
  }
  console.log(`Added ${staffAdded} staff members`);

  // Spare parts
  let sparesAdded = 0;
  for (const sp of SPARES) {
    const exists = await SparePart.findOne({ garageId, partNumber: sp.partNumber });
    if (!exists) {
      await SparePart.create({ ...sp, garageId, active: true });
      sparesAdded++;
    }
  }
  console.log(`Added ${sparesAdded} spare parts`);

  await mongoose.disconnect();
  console.log('Done.');
})();
