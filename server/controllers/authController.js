const jwt   = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Garage = require('../models/Garage');
const Staff  = require('../models/masters/Staff');
const { seedGarageData } = require('../utils/seedData');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateStaffToken = (staffId, garageId) =>
  jwt.sign({ id: staffId, garageId, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res) => {
  try {
    const { firstName, lastName, workshopName, email, address, city, state,
      zipcode, country, rtoNo, phone, phone2, vehicleTypes, acceptedTerms } = req.body;

    if (!acceptedTerms) {
      return res.status(400).json({ message: 'You must accept the terms and conditions' });
    }

    const existing = await Garage.findOne({ mobile: phone });
    if (existing) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const garage = await Garage.create({
      firstName, lastName, workshopName, email, address, city, state,
      zipcode, country: country || 'India', rtoNo,
      mobile: phone, mobile2: phone2,
      vehicleTypes: vehicleTypes || [],
      otp, otpExpiry, isVerified: false
    });

    console.log(`OTP for ${phone}: ${otp}`);

    res.status(201).json({ message: 'OTP sent to your mobile number', phone });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, password } = req.body;
    const garage = await Garage.findOne({ mobile: phone });

    if (!garage) return res.status(404).json({ message: 'Garage not found' });
    if (garage.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (garage.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (garage.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired' });

    garage.isVerified = true;
    garage.otp = undefined;
    garage.otpExpiry = undefined;
    if (password) garage.password = password;
    await garage.save();

    if (!garage.seeded) {
      await seedGarageData(garage._id);
      garage.seeded = true;
      await garage.save();
    }

    const token = generateToken(garage._id);
    res.json({ token, garage: sanitizeGarage(garage) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const garage = await Garage.findOne({ mobile });

    if (!garage) return res.status(401).json({ message: 'Invalid credentials' });
    if (!garage.isVerified) return res.status(401).json({ message: 'Account not verified' });
    if (!garage.password) return res.status(401).json({ message: 'Please set a password first' });

    const isMatch = await garage.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (!garage.seeded) {
      await seedGarageData(garage._id);
      garage.seeded = true;
      await garage.save();
    }

    const token = generateToken(garage._id);
    res.json({ token, garage: sanitizeGarage(garage) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = (req, res) => {
  res.json({ message: 'Logged out' });
};

const staffLogin = async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'Username/mobile and password are required' });

    const staff = await Staff.findOne({
      $or: [{ username: login }, { mobile: login }],
      active: { $ne: false }
    }).populate('roleId', 'name menuAccess jobcardPermissions stockPermissions');

    if (!staff || !staff.password) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const garage = await Garage.findById(staff.garageId).select('-password -otp -otpExpiry');
    if (!garage) return res.status(401).json({ message: 'Associated garage not found' });
    if (garage.active === false) return res.status(403).json({ message: 'Garage account is deactivated. Contact support.' });

    const token = generateStaffToken(staff._id, staff.garageId);
    const staffOut = staff.toObject(); delete staffOut.password; delete staffOut.plainPassword;
    res.json({ token, staff: staffOut, garage: sanitizeGarage(garage) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  if (req.staff) {
    const staffOut = req.staff.toObject(); delete staffOut.password; delete staffOut.plainPassword;
    return res.json({ garage: sanitizeGarage(req.garage), staff: staffOut });
  }
  res.json({ garage: sanitizeGarage(req.garage) });
};

const sanitizeGarage = (garage) => ({
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

module.exports = { register, verifyOtp, login, staffLogin, logout, getMe };
