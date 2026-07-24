const mongoose = require('mongoose');

const vehicleModelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleMake', required: true },
  makeName: String,
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  variant: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VehicleModel', vehicleModelSchema);
