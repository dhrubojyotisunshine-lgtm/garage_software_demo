const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  make:      { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleMake' },
  model:     { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleModel' },
  makeName:  String,
  modelName: String,
  vehicleNo: String,
  engineNo:  String,
  chassisNo: String,
  color:     String,
  year:      Number
});

const noteSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Insurance claim details (only meaningful when applied === true)
const insuranceSchema = new mongoose.Schema({
  applied:      { type: Boolean, default: false },
  companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceCompany' },
  companyName:  { type: String, default: '' },
  policyNo:     { type: String, default: '' },
  accidentDate: Date,
  idv:          { type: Number, default: 0 },
  claimNo:      { type: String, default: '' }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  garageId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  name:        { type: String, required: true },
  mobile:      { type: String, required: true },
  customerType: String,
  email:       String,
  dob:         Date,
  gstNo:       String,
  address:     String,
  vehicles:    [vehicleSchema],
  driver:      { name: String, mobile: String },
  insurance:   { type: insuranceSchema, default: () => ({ applied: false }) },

  // CRM fields
  status:      { type: String, enum: ['Lead', 'Active', 'VIP', 'Inactive'], default: 'Active' },
  tags:        [String],
  notes:       [noteSchema],
  followUpDate: Date,
  followUpNote: String,

  deletedAt:   Date,
  createdAt:   { type: Date, default: Date.now }
});

customerSchema.index({ garageId: 1, mobile: 1 });
customerSchema.index({ garageId: 1, status: 1 });
customerSchema.index({ garageId: 1, followUpDate: 1 });

module.exports = mongoose.model('Customer', customerSchema);
