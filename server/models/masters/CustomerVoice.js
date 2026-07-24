const mongoose = require('mongoose');

const customerVoiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CustomerVoice', customerVoiceSchema);
