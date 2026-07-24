const mongoose = require('mongoose');

const staffRoleSchema = new mongoose.Schema({
  garageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  name: { type: String, required: true },
  menuAccess: [{ type: String }],
  jobcardPermissions: {
    canCreate:       { type: Boolean, default: false },
    canEdit:         { type: Boolean, default: false },
    canChangeStatus: { type: Boolean, default: false },
    canAddItems:     { type: Boolean, default: false },
    canAddPayment:   { type: Boolean, default: false },
    canApplyDiscount:{ type: Boolean, default: false },
    canDelete:       { type: Boolean, default: false },
    // Closed jobcards are view-only unless this is granted.
    canEditClosed:   { type: Boolean, default: false },
  },
  stockPermissions: {
    canAdd:       { type: Boolean, default: false },
    canEdit:      { type: Boolean, default: false },
    canUploadCsv: { type: Boolean, default: false },
  },
  vehicleSalePermissions: {
    canEditVehicle:   { type: Boolean, default: false },
    canDeleteVehicle: { type: Boolean, default: false },
  },
  reportPermissions: {
    canViewProfit: { type: Boolean, default: false },
  },
  isDefault: { type: Boolean, default: false },
  active:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StaffRole', staffRoleSchema);
