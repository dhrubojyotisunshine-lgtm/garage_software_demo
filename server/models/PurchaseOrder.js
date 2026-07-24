const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId:       { type: mongoose.Schema.Types.ObjectId },
  itemType:     { type: String, enum: ['Spare', 'Lube'] },
  name:         String,
  partNumber:   String,
  hsn:          String,
  qty:          { type: Number, default: 1 },
  unitPrice:    { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  gstPercent:   { type: Number, default: 18 },
  gstType:      { type: String, default: 'Incl' },
  discount:     { type: Number, default: 0 },
  amount:       { type: Number, default: 0 }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  poNumber:         String,
  billNumber:       String,
  billDate:         Date,
  poDate:           { type: Date, default: Date.now },
  supplierId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName:     String,
  supplierPhone:    String,
  supplierBalance:  { type: Number, default: 0 },
  status:           { type: String, enum: ['Open', 'Placed', 'Received', 'Closed'], default: 'Open' },
  mode:             { type: String, enum: ['create', 'addstock'], default: 'create' },
  items:            [itemSchema],
  transporterName:  String,
  receivedDate:     Date,
  vehicleNumber:    String,
  deliveryPerson:   String,
  ltNumber:         String,
  note:             String,
  subtotal:         { type: Number, default: 0 },
  gstAmount:        { type: Number, default: 0 },
  totalPayable:     { type: Number, default: 0 },
  paidAmount:       { type: Number, default: 0 },
  pendingAmount:    { type: Number, default: 0 },
  transactionType:  { type: String, default: 'Cash' },
  transactionDate:  Date,
  transactionNumber: String,
  garageId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active:           { type: Boolean, default: true },
  createdAt:        { type: Date, default: Date.now }
});

// Auto-generate PO number before save
purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments({ garageId: this.garageId });
    const year = new Date().getFullYear();
    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
