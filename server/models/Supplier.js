const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  firmName:  { type: String, required: true },
  address:   { type: String, required: true },
  gstin:     String,
  firstName: { type: String, required: true },
  contact1:  { type: String, required: true },
  contact2:  String,
  email:     String,
  garageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Supplier', supplierSchema);
