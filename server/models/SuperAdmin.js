const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const superAdminSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  brandName: { type: String },   // display name in the super-admin sidebar (e.g. "RECKON MOTORS")
  logoUrl:   { type: String },   // uploaded super-admin logo (raster image only, no SVG)
  active:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

superAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

superAdminSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
