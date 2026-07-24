const mongoose = require('mongoose');

// Standalone Party master for the Ledger module. Scoped per garage.
// A party is uniquely identified by phone number within its garage.
const partySchema = new mongoose.Schema({
  garageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  partyName: { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true }
}, { timestamps: true });

// Phone is unique per garage (not globally), so different franchises can reuse numbers.
partySchema.index({ garageId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Party', partySchema);
