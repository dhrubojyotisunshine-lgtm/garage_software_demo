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
