const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: mongoose.Schema.Types.ObjectId,
  itemType: { type: String, enum: ['Labour', 'Spare', 'Lube', 'Outsource'] },
  name: String,
  partNumber: String,
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'amount' },
  finalAmount: { type: Number, default: 0 },
  mechanicId: mongoose.Schema.Types.ObjectId,
  mechanicName: String
}, { _id: true });

const transactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Advance', 'Payment', 'Refund'] },
  amount: Number,
  paymentType: { type: String, enum: ['Cash', 'UPI', 'Card', 'Cheque'] },
  details: String
}, { _id: true });

const workNoteSchema = new mongoose.Schema({
  note: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const jobcardSchema = new mongoose.Schema({
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  jobcardNumber: { type: String, required: true },
  type: { type: mongoose.Schema.Types.ObjectId, ref: 'JobcardType' },
  typeLabel: String,
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'JobcardStatus' },
  statusLabel: String,
  statusCategory: { type: String, enum: ['Open', 'Completed', 'Closed'], default: 'Open' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  customerMobile: String,
  vehicleId: mongoose.Schema.Types.ObjectId,
  vehicleNo: String,
  vehicleMake: String,
  vehicleModel: String,
  vehicleColour: String,
  customerEmail: String,
  customerBirthday: Date,
  customerPickupAddr: String,
  customerDeliveryAddr: String,
  driverName: String,
  driverMobile: String,
  kmReading: Number,
  fuelLevel: { type: Number, default: 0 },
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  mechanicName: String,
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  supervisorName: String,
  customerVoice: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerVoice' }],
  customerVoiceLabels: [String],
  dentMarks: String,
  photos: [String],
  accessories: [String],
  workNotes: [workNoteSchema],
  items: [itemSchema],
  labourTotal: { type: Number, default: 0 },
  spareTotal: { type: Number, default: 0 },
  lubeTotal: { type: Number, default: 0 },
  outsourceTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'amount'], default: 'amount' },
  billAmount: { type: Number, default: 0 },
  costEstimate: Number,
  deliveryDate: Date,
  deliveryTime: String,
  reminderKm: String,
  reminderPeriod: String,
  reminderPriority: String,
  exitNote: String,
  transactions: [transactionSchema],
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  smsAlert: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date
});

jobcardSchema.index({ garageId: 1, jobcardNumber: 1 }, { unique: true });
jobcardSchema.index({ garageId: 1, statusCategory: 1 });
jobcardSchema.index({ garageId: 1, customerId: 1 });

module.exports = mongoose.model('Jobcard', jobcardSchema);
