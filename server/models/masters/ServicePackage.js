const mongoose = require('mongoose');

const servicePackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  groupNumber: String,
  allVehicles: { type: Boolean, default: true },
  compatibleVehicles: [{ make: String, model: String, variant: String }],
  items: [{
    itemId: mongoose.Schema.Types.ObjectId,
    itemType: { type: String, enum: ['Labour', 'Spare', 'Lube'] },
    name: String,
    qty: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 }
  }],
  totalPrice: { type: Number, default: 0 },
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServicePackage', servicePackageSchema);
