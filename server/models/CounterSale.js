const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId:       { type: mongoose.Schema.Types.ObjectId },
  itemType:     { type: String, enum: ['Spare', 'Lube'] },
  name:         String,
  partNumber:   String,
  qty:          { type: Number, default: 1 },
  unitPrice:    { type: Number, default: 0 },
  discount:     { type: Number, default: 0 },
  discountType: { type: String, enum: ['amount', 'percent'], default: 'amount' },
  amount:       { type: Number, default: 0 }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  date:              { type: Date, default: Date.now },
  amount:            { type: Number, default: 0 },
  paymentType:       { type: String, enum: ['Cash', 'UPI', 'Card', 'Cheque'], default: 'Cash' },
  transactionNumber: String
}, { _id: true });

const counterSaleSchema = new mongoose.Schema({
  garageId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  counterNumber:   { type: String },
  date:            { type: Date, default: Date.now },
  customerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName:    { type: String, required: true },
  customerMobile:  { type: String, required: true },
  customerEmail:   String,
  customerAddress: String,
  vehicleNumber:   String,
  items:           [itemSchema],
  note:            String,
  total:           { type: Number, default: 0 },
  paidAmount:      { type: Number, default: 0 },
  balanceDue:      { type: Number, default: 0 },
  transactions:    [transactionSchema],
  active:          { type: Boolean, default: true },
  createdAt:       { type: Date, default: Date.now }
});

counterSaleSchema.pre('save', async function (next) {
  if (!this.counterNumber) {
    const now = this.date || new Date();
    const yy  = String(now.getFullYear()).slice(2);
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const dd  = String(now.getDate()).padStart(2, '0');
    const prefix = `${yy}${mm}${dd}`;
    const count = await mongoose.model('CounterSale').countDocuments({ garageId: this.garageId });
    this.counterNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CounterSale', counterSaleSchema);
