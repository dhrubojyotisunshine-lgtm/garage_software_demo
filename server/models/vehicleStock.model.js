const mongoose = require('mongoose');

// Standalone Vehicle Stock module — tracks vehicle inventory.
// Named VehicleStock to avoid any clash with the existing spare-parts stock.
const vehicleStockSchema = new mongoose.Schema({
  vehicleModel:  { type: String, required: true, trim: true },
  variant:       { type: String, default: '' },
  color:         { type: String, default: '' },
  chassisNumber: { type: String, default: '' },
  engineNumber:  { type: String, default: '' },
  qty:           { type: Number, default: 1 },
  inDate:        { type: Date },              // when the vehicle arrived at the showroom
  dealerName:    { type: String, default: '' }, // whom it came from
  garageId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active:        { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VehicleStock', vehicleStockSchema);
