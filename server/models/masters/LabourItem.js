const mongoose = require('mongoose');

const labourItemSchema = new mongoose.Schema({
  name: { type: String },
  jobCode: { type: String, required: true },
  unit: { type: String, default: 'units' },
  subCategory: { type: String, default: 'out_source' },
  sellingPrice: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  allVehicles: { type: Boolean, default: true },
  compatibleVehicles: [{ make: String, model: String, variant: String }],
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  isFrequent: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabourItem', labourItemSchema);
