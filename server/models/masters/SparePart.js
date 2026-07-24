const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: { type: String },
  partNumber: { type: String, required: true },
  company: String,
  subCategory: { type: String, default: 'Frequent Items' },
  unit: { type: String, default: 'units' },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  lowerLimit: { type: Number, default: 0 },
  rackNumber: String,
  allVehicles: { type: Boolean, default: true },
  compatibleVehicles: [{ make: String, model: String, variant: String }],
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  isFrequent: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SparePart', sparePartSchema);
