const jwt        = require('jsonwebtoken');
const Garage     = require('../models/Garage');
const SuperAdmin = require('../models/SuperAdmin');
const Staff      = require('../models/masters/Staff');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'superadmin') {
      return res.status(403).json({ message: 'Super admin token not valid for garage routes' });
    }

    if (decoded.role === 'staff') {
      const staff = await Staff.findById(decoded.id)
        .populate('roleId', 'name menuAccess jobcardPermissions stockPermissions vehicleSalePermissions reportPermissions')
        .select('-password');
      if (!staff || staff.active === false) return res.status(401).json({ message: 'Staff account not found or inactive' });
      const garage = await Garage.findById(decoded.garageId).select('-password -otp -otpExpiry');
      if (!garage) return res.status(401).json({ message: 'Garage not found' });
      if (garage.active === false) return res.status(403).json({ message: 'Garage account is deactivated. Contact support.' });
      req.garage = garage;
      req.staff  = staff;
      return next();
    }

    req.garage = await Garage.findById(decoded.id).select('-password -otp -otpExpiry');
    if (!req.garage) return res.status(401).json({ message: 'Not authorized, garage not found' });
    if (req.garage.active === false) return res.status(403).json({ message: 'Garage account is deactivated. Contact support.' });
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const superAdminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'superadmin') return res.status(403).json({ message: 'Not authorized as super admin' });
    req.superAdmin = await SuperAdmin.findById(decoded.id).select('-password');
    if (!req.superAdmin) return res.status(401).json({ message: 'Super admin not found' });
    if (!req.superAdmin.active) return res.status(403).json({ message: 'Super admin account disabled' });
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect, superAdminProtect };
