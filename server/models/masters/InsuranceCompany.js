const mongoose = require('mongoose');

const insuranceCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  mobile: { type: String, default: '', trim: true },
  address: { type: String, default: '' },
  pincode: { type: String, default: '', trim: true },
  gstin: { type: String, default: '', trim: true },
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InsuranceCompany', insuranceCompanySchema);
