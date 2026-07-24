const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  garageId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  type:            { type: String, enum: ['Visit', 'Pick'], required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  vehicleNo:       { type: String, default: '' },
  vehicleMake:     { type: String, default: '' },
  vehicleModel:    { type: String, default: '' },
  customerName:    { type: String, required: true },
  mobile1:         { type: String, required: true },
  mobile2:         { type: String, default: '' },
  email:           { type: String, default: '' },
  pickupAddress:   { type: String, default: '' },
  dropAddress:     { type: String, default: '' },
  notes:           { type: String, default: '' },
  status:          { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  active:          { type: Boolean, default: true },
  createdAt:       { type: Date, default: Date.now }
});

appointmentSchema.index({ garageId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
