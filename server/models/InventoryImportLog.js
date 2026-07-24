const mongoose = require('mongoose');

// Audit record of every successful inventory CSV import: who imported, when,
// the file name, row counts, and the raw CSV text (kept for re-download).
const inventoryImportLogSchema = new mongoose.Schema({
  garageId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true, index: true },
  type:           { type: String, enum: ['spares', 'lubes', 'jobs'], required: true },
  fileName:       String,
  content:        String,        // raw CSV text, exactly as uploaded
  totalRows:      Number,
  insertedRows:   Number,
  importedById:   { type: mongoose.Schema.Types.ObjectId },
  importedByName: String,
  importedByType: { type: String, enum: ['Owner', 'Staff'], default: 'Owner' },
  createdAt:      { type: Date, default: Date.now },
});

inventoryImportLogSchema.index({ garageId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryImportLog', inventoryImportLogSchema);
