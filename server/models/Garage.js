const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const garageSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: String,
  workshopName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  mobile2: String,
  email: { type: String, sparse: true },
  password: { type: String },
  address: String,
  city: String,
  state: String,
  zipcode: String,
  country: { type: String, default: 'India' },
  rtoNo: { type: String, required: true },
  vehicleTypes: [String],
  gstNo: String,
  language: { type: String, default: 'English' },
  active:          { type: Boolean, default: true },
  branding: {
    primaryColor: { type: String, default: '#E53935' },
    headerColor:  { type: String, default: '#ffffff' },
    menuColor:    { type: String, default: '#1C1F26' },
    logoUrl:      { type: String, default: '' }
  },
  menuConfig: [{
    key:     String,
    label:   String,
    enabled: { type: Boolean, default: true },
    order:   Number
  }],
  plan:            { type: String, enum: ['Trial', 'Basic', 'Professional', 'Enterprise'], default: 'Trial' },
  planExpiry:      { type: Date, default: null },
  planStatus:      { type: String, enum: ['Active', 'Expired', 'Trial'], default: 'Trial' },
  plainPassword: { type: String, default: '' },
  createdBySuperAdmin: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  isVerified: { type: Boolean, default: false },
  seeded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  logoUrl: { type: String, default: '' },
  signatureUrl: { type: String, default: '' },
  profilePicUrl: { type: String, default: '' },
  upiId: { type: String, default: '' },
  jobcardSettings: {
    engineChassisNumber: { type: Boolean, default: false },
    vehicleColour: { type: Boolean, default: false },
    customerMobileNo: { type: Boolean, default: false },
    customerEmail: { type: Boolean, default: false },
    customerBirthday: { type: Boolean, default: false },
    customerPickupAddr: { type: Boolean, default: false },
    customerDeliveryAddr: { type: Boolean, default: false },
    driverDetails: { type: Boolean, default: false },
    jobwiseMechanic: { type: Boolean, default: false },
    customerSignature: { type: Boolean, default: false },
    customJobcardNo: { type: Boolean, default: false },
    itemWiseDiscount: { type: Boolean, default: false },
    jobcardSeries: { type: Boolean, default: false },
    defaultMechanic: { type: String, default: '' }
  },
  billingSettings: {
    reminderKm: { type: String, default: '' },
    reminderPeriod: { type: String, default: '1 Month' },
    billFormat: { type: String, default: 'Complete' },
    gst: { type: Boolean, default: false },
    billHeader: { type: String, default: '' },
    tagLine: { type: String, default: '' },
    billFooter: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' }
  },
  inventorySettings: {
    billDetails: { type: Boolean, default: false },
    purchaseOrderDetails: { type: Boolean, default: false },
    account: { type: Boolean, default: false },
    negativeInventory: { type: Boolean, default: false },
    lowerLimit: { type: Boolean, default: false }
  },
  expenseOpeningBalance: { type: Number, default: 0 }
});

garageSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

garageSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Garage', garageSchema);
