const mongoose = require('mongoose');

const cashbookEntrySchema = new mongoose.Schema({
  garageId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  type:             { type: String, enum: ['IN', 'OUT'], required: true },
  amount:           { type: Number, required: true },
  paymentMethod:    { type: String, enum: ['Cash', 'UPI', 'Card', 'Cheque'], required: true },
  category:         { type: String, required: true },
  transactionNumber: String,
  date:             { type: Date, default: Date.now },
  description:      String,
  // Linked reference (optional)
  referenceId:      { type: mongoose.Schema.Types.ObjectId },
  referenceType:    { type: String, enum: ['Jobcard', 'CounterSale', 'PurchaseOrder'] },
  referenceNumber:  String,
  referenceName:    String,
  referenceMobile:  String,
  referenceDate:    Date,
  linkedPaidAmount: { type: Number, default: 0 },
  active:           { type: Boolean, default: true },
  createdAt:        { type: Date, default: Date.now }
});

cashbookEntrySchema.index({ garageId: 1, createdAt: -1 });

module.exports = mongoose.model('CashbookEntry', cashbookEntrySchema);
