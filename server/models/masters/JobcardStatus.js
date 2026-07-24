const mongoose = require('mongoose');

const jobcardStatusSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['Open', 'Completed', 'Closed'], default: 'Open' },
  // Whether the jobcard "Add Transaction" section shows for this status.
  // Left unset by default → falls back to showing only for the Completed category.
  allowAddTransaction: { type: Boolean },
  // Whether the jobcard bill Discount control shows for this status.
  // Left unset by default → falls back to showing only for the Completed category.
  allowDiscount: { type: Boolean },
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobcardStatus', jobcardStatusSchema);
