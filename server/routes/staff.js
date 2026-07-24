const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { protect } = require('../middleware/auth');
const Staff     = require('../models/masters/Staff');
const StaffRole = require('../models/masters/StaffRole');

router.use(protect);

/* ── Roles ──────────────────────────────────────────────────── */

router.get('/roles', async (req, res) => {
  try {
    const roles = await StaffRole.find({ garageId: req.garage._id, active: { $ne: false } }).sort({ createdAt: 1 });
    res.json(roles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/roles', async (req, res) => {
  try {
    const role = await StaffRole.create({ ...req.body, garageId: req.garage._id });
    res.status(201).json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/roles/:id', async (req, res) => {
  try {
    const role = await StaffRole.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* Role deletion is disabled — deleting a role that staff are assigned to causes
   knock-on access problems. Uncomment this route (plus staffApi.deleteRole, the
   handleDeleteRole handler and the button in StaffPage) to re-enable it.
router.delete('/roles/:id', async (req, res) => {
  try {
    const inUse = await Staff.countDocuments({ roleId: req.params.id, garageId: req.garage._id, active: { $ne: false } });
    if (inUse > 0) return res.status(400).json({ message: `Role in use by ${inUse} staff member(s). Reassign first.` });
    await StaffRole.findOneAndUpdate({ _id: req.params.id, garageId: req.garage._id }, { active: false });
    res.json({ message: 'Role deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
*/

/* ── Staff CRUD ─────────────────────────────────────────────── */

router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find({ garageId: req.garage._id, active: { $ne: false } })
      .populate('roleId', 'name menuAccess jobcardPermissions stockPermissions')
      .select('-password')
      .sort({ createdAt: 1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, roleId, mobile, username, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!roleId)       return res.status(400).json({ message: 'Role is required' });

    const roleDoc = await StaffRole.findById(roleId);
    if (!roleDoc) return res.status(400).json({ message: 'Role not found' });

    if (username?.trim()) {
      const taken = await Staff.findOne({ garageId: req.garage._id, username: username.trim(), active: { $ne: false } });
      if (taken) return res.status(400).json({ message: 'Username already taken in this garage' });
    }

    const staff = new Staff({
      garageId: req.garage._id,
      name: name.trim(),
      role: roleDoc.name,
      roleId,
      mobile: mobile || '',
      username: username?.trim() || '',
      plainPassword: password || '',
    });
    if (password) staff.password = password;

    await staff.save();
    const out = staff.toObject(); delete out.password;
    res.status(201).json(out);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { password, username, roleId, name, mobile, ...rest } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    if (username !== undefined && username.trim() !== staff.username) {
      const taken = await Staff.findOne({ garageId: req.garage._id, username: username.trim(), active: { $ne: false }, _id: { $ne: staff._id } });
      if (taken) return res.status(400).json({ message: 'Username already taken in this garage' });
      staff.username = username.trim();
    }

    if (roleId) {
      const roleDoc = await StaffRole.findById(roleId);
      if (roleDoc) { staff.role = roleDoc.name; staff.roleId = roleId; }
    }

    if (name?.trim())     staff.name   = name.trim();
    if (mobile !== undefined) staff.mobile = mobile;

    if (password) { staff.password = password; staff.plainPassword = password; }

    await staff.save();
    const out = staff.toObject(); delete out.password;
    res.json(out);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Staff.findOneAndUpdate(
      { _id: req.params.id, garageId: req.garage._id },
      { active: false }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Credentials & reset ────────────────────────────────────── */

router.get('/:id/credentials', async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, garageId: req.garage._id })
      .select('name username plainPassword role');
    if (!staff) return res.status(404).json({ message: 'Not found' });
    res.json({ name: staff.name, username: staff.username, plainPassword: staff.plainPassword, role: staff.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'New password required' });

    const staff = await Staff.findOne({ _id: req.params.id, garageId: req.garage._id });
    if (!staff) return res.status(404).json({ message: 'Not found' });

    staff.password      = password;
    staff.plainPassword = password;
    await staff.save();

    res.json({ message: 'Password reset successfully', username: staff.username, plainPassword: password });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
