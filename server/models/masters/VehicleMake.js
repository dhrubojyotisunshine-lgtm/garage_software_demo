const mongoose = require('mongoose');

const vehicleMakeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VehicleMake', vehicleMakeSchema);
