const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  garageId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  category:     { type: String, default: '' },
  supplierName: { type: String, default: '' },
  supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  billNumber:   { type: String, default: '' },
  expenseDate:  { type: Date, required: true },
  totalAmount:  { type: Number, required: true, min: 0 },
  paidAmount:   { type: Number, required: true, min: 0, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  description:  { type: String, default: '' },
  active:       { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now }
});

expenseSchema.index({ garageId: 1, createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
