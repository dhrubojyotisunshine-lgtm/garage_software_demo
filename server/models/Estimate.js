const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: mongoose.Schema.Types.ObjectId,
  itemType: { type: String, enum: ['Labour', 'Spare', 'Lube'] },
  name: String,
  partNumber: String,
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 }
}, { _id: true });

const estimateSchema = new mongoose.Schema({
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  estimateNumber: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  customerMobile: String,
  vehicleId: mongoose.Schema.Types.ObjectId,
  vehicleNo: String,
  vehicleMake: String,
  vehicleModel: String,
  estimateDate: { type: Date, default: Date.now },
  additionalNote: String,
  items: [itemSchema],
  labourTotal: { type: Number, default: 0 },
  spareTotal: { type: Number, default: 0 },
  lubeTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['Open', 'Converted'], default: 'Open' },
  convertedJobcardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jobcard' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

estimateSchema.index({ garageId: 1, estimateNumber: 1 }, { unique: true });
estimateSchema.index({ garageId: 1, customerId: 1 });

module.exports = mongoose.model('Estimate', estimateSchema);
