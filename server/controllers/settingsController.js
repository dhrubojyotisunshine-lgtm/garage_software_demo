const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Garage = require('../models/Garage');
const Staff = require('../models/masters/Staff');

const sanitize = (garage) => ({
  _id: garage._id,
  firstName: garage.firstName,
  lastName: garage.lastName,
  workshopName: garage.workshopName,
  mobile: garage.mobile,
  mobile2: garage.mobile2,
  email: garage.email,
  rtoNo: garage.rtoNo,
  vehicleTypes: garage.vehicleTypes,
  city: garage.city,
  state: garage.state,
  zipcode: garage.zipcode,
  address: garage.address,
  gstNo: garage.gstNo,
  isVerified: garage.isVerified,
  logoUrl: garage.logoUrl,
  signatureUrl: garage.signatureUrl,
  profilePicUrl: garage.profilePicUrl,
  upiId: garage.upiId,
  branding: garage.branding,
  menuConfig: garage.menuConfig,
  jobcardSettings: garage.jobcardSettings,
  billingSettings: garage.billingSettings,
  inventorySettings: garage.inventorySettings
});

const getSettings = async (req, res) => {
  res.json({ garage: sanitize(req.garage) });
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, workshopName, email, mobile2, rtoNo,
      city, state, zipcode, address, gstNo, vehicleTypes } = req.body;

    const garage = await Garage.findById(req.garage._id);
    if (firstName !== undefined) garage.firstName = firstName;
    if (lastName !== undefined) garage.lastName = lastName;
    if (workshopName !== undefined) garage.workshopName = workshopName;
    if (email !== undefined) garage.email = email;
    if (mobile2 !== undefined) garage.mobile2 = mobile2;
    if (rtoNo !== undefined) garage.rtoNo = rtoNo;
    if (city !== undefined) garage.city = city;
    if (state !== undefined) garage.state = state;
    if (zipcode !== undefined) garage.zipcode = zipcode;
    if (address !== undefined) garage.address = address;
    if (gstNo !== undefined) garage.gstNo = gstNo;
    if (vehicleTypes !== undefined) garage.vehicleTypes = vehicleTypes;

    await garage.save();
    res.json({ message: 'Profile updated', garage: sanitize(garage) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }
    const garage = await Garage.findById(req.garage._id);
    if (garage.password) {
      const isMatch = await garage.matchPassword(currentPassword);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    }
    garage.password = newPassword;
    await garage.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateJobcardSettings = async (req, res) => {
  try {
    const garage = await Garage.findById(req.garage._id);
    garage.jobcardSettings = { ...garage.jobcardSettings.toObject(), ...req.body };
    await garage.save();
    res.json({ message: 'Jobcard settings saved', jobcardSettings: garage.jobcardSettings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBillingSettings = async (req, res) => {
  try {
    const garage = await Garage.findById(req.garage._id);
    garage.billingSettings = { ...garage.billingSettings.toObject(), ...req.body };
    await garage.save();
    res.json({ message: 'Billing settings saved', billingSettings: garage.billingSettings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInventorySettings = async (req, res) => {
  try {
    const garage = await Garage.findById(req.garage._id);
    garage.inventorySettings = { ...garage.inventorySettings.toObject(), ...req.body };
    await garage.save();
    res.json({ message: 'Inventory settings saved', inventorySettings: garage.inventorySettings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUpi = async (req, res) => {
  try {
    const { upiId } = req.body;
    const garage = await Garage.findById(req.garage._id);
    garage.upiId = upiId || '';
    await garage.save();
    res.json({ message: 'UPI ID saved', upiId: garage.upiId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadImage = async (req, res) => {
  try {
    const { type } = req.params;
    if (!['logo', 'signature', 'profile-pic'].includes(type)) {
      return res.status(400).json({ message: 'Invalid image type' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const garage = await Garage.findById(req.garage._id);
    const fieldMap = { logo: 'logoUrl', signature: 'signatureUrl', 'profile-pic': 'profilePicUrl' };
    const field = fieldMap[type];

    // Delete old file if exists
    if (garage[field]) {
      const oldPath = path.join(__dirname, '../', garage[field].replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const url = `/uploads/settings/${req.file.filename}`;
    garage[field] = url;
    await garage.save();

    res.json({ message: 'Image uploaded', url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStaffUsers = async (req, res) => {
  try {
    const staff = await Staff.find({ garageId: req.garage._id, active: true })
      .select('name role mobile');
    res.json({ staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSettings, updateProfile, updatePassword,
  updateJobcardSettings, updateBillingSettings, updateInventorySettings,
  updateUpi, uploadImage, getStaffUsers
};
