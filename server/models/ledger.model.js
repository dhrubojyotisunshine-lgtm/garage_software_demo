const mongoose = require('mongoose');

// Standalone Ledger module — independent of Supplier/Inventory/Customer.
// Scoped per garage so each franchise sees only its own entries.
const ledgerSchema = new mongoose.Schema({
  garageId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  // Link to the Party master (phone-unique per garage). Optional for legacy entries
  // created before parties existed — those fall back to grouping by partyName.
  partyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  partyPhone: { type: String, default: '' },
  partyName: { type: String, required: true, trim: true },
  amount:    { type: Number, required: true },
  date:      { type: Date, required: true },
  type:      { type: String, enum: ['Credit', 'Debit'], required: true },
  narration: { type: String, default: '' },
  remark:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
