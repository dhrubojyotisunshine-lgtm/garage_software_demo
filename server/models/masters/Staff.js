const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  garageId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Garage', required: true },
  name:          { type: String, required: true },
  role:          { type: String, required: true },
  roleId:        { type: mongoose.Schema.Types.ObjectId, ref: 'StaffRole' },
  mobile:        String,
  username:      { type: String, default: '' },
  password:      { type: String, default: '' },
  plainPassword: { type: String, default: '' },
  active:        { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

staffSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('Staff', staffSchema);
