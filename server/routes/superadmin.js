const express        = require('express');
const router         = express.Router();
const jwt            = require('jsonwebtoken');
const bcrypt         = require('bcryptjs');
const path           = require('path');
const fs             = require('fs');
const upload         = require('../middleware/settingsUpload');
const SuperAdmin     = require('../models/SuperAdmin');
const Garage         = require('../models/Garage');
const StaffRole      = require('../models/masters/StaffRole');
const { defaultRoles, seedGarageData, seedMissingGarageData } = require('../utils/seedData');
const Jobcard        = require('../models/Jobcard');
const CounterSale    = require('../models/CounterSale');
const Expense        = require('../models/Expense');
const { superAdminProtect } = require('../middleware/auth');

/* ── Login ─────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!admin.active) return res.status(403).json({ message: 'Account disabled' });

    const token = jwt.sign(
      { id: admin._id, role: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, admin: { _id: admin._id, name: admin.name, email: admin.email, brandName: admin.brandName, logoUrl: admin.logoUrl } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Public branding (NO auth) ─────────────────────────────────
   Used by the login page, which has no authenticated user yet.
   Exposes only the display brand name + logo — nothing sensitive. */
router.get('/branding', async (req, res) => {
  try {
    const admin = await SuperAdmin.findOne({ active: { $ne: false } })
      .sort({ createdAt: 1 })
      .select('brandName logoUrl');
    res.json({ brandName: admin?.brandName || '', logoUrl: admin?.logoUrl || '' });
  } catch {
    // Never break the login page over branding — fall back to the built-in defaults.
    res.json({ brandName: '', logoUrl: '' });
  }
});

/* ── Me ────────────────────────────────────────────────────── */
router.get('/me', superAdminProtect, (req, res) => {
  res.json(req.superAdmin);
});

/* ── Update own profile (name, brandName, email) ───────────── */
router.put('/profile', superAdminProtect, async (req, res) => {
  try {
    const { name, brandName, email } = req.body;
    const update = {};

    // Never allow the required login/display fields to be blanked out.
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: 'Admin name cannot be empty' });
      update.name = String(name).trim();
    }
    if (brandName !== undefined) update.brandName = String(brandName).trim();

    if (email !== undefined) {
      const clean = String(email).toLowerCase().trim();
      // Email is the login id — a blank or malformed value would lock the account out.
      if (!clean) return res.status(400).json({ message: 'Email cannot be empty' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return res.status(400).json({ message: 'Enter a valid email address' });
      const dup = await SuperAdmin.findOne({ email: clean, _id: { $ne: req.superAdmin._id } });
      if (dup) return res.status(400).json({ message: 'Email already in use' });
      update.email = clean;
    }
    const admin = await SuperAdmin.findByIdAndUpdate(req.superAdmin._id, update, { new: true }).select('-password');
    res.json(admin);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Upload own logo (raster image only; SVG rejected by filter) ── */
router.post('/profile/logo', superAdminProtect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const admin = await SuperAdmin.findById(req.superAdmin._id);
    if (!admin) return res.status(404).json({ message: 'Not found' });

    // Delete old logo file if present
    if (admin.logoUrl) {
      const oldPath = path.join(__dirname, '../', admin.logoUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const url = `/uploads/settings/${req.file.filename}`;
    admin.logoUrl = url;
    await admin.save();
    res.json({ message: 'Logo uploaded', url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Change own password ───────────────────────────────────── */
router.put('/profile/password', superAdminProtect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const admin = await SuperAdmin.findById(req.superAdmin._id);
    if (!admin) return res.status(404).json({ message: 'Not found' });
    if (!(await admin.matchPassword(currentPassword || ''))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    admin.password = newPassword;   // hashed by pre-save hook
    await admin.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Dashboard stats ───────────────────────────────────────── */
router.get('/dashboard', superAdminProtect, async (req, res) => {
  try {
    const { garageId } = req.query;

    const garages = await Garage.find({}, '_id workshopName city active plan planStatus createdAt firstName lastName mobile').lean();
    const allIds  = garages.map(g => g._id);

    // When filtered, only pull data for that one garage
    const scopeIds = garageId ? [garageId] : allIds;

    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

    const [jobcards, counterSales, expenses, openJobcards] = await Promise.all([
      Jobcard.find({ garageId: { $in: scopeIds }, deletedAt: null, statusCategory: 'Closed' },
        'garageId billAmount paidAmount balanceDue labourTotal spareTotal lubeTotal transactions discount discountType createdAt').lean(),
      CounterSale.find({ garageId: { $in: scopeIds }, active: { $ne: false } },
        'garageId total paidAmount balanceDue items transactions createdAt').lean(),
      Expense.find({ garageId: { $in: scopeIds }, active: { $ne: false } },
        'garageId category totalAmount paidAmount balanceAmount createdAt').lean(),
      Jobcard.countDocuments({ garageId: { $in: scopeIds }, deletedAt: null, statusCategory: 'Open' })
    ]);

    // Aggregates
    const totalJobcardRevenue = jobcards.reduce((s, j) => s + (j.billAmount || 0), 0);
    const totalCounterRevenue = counterSales.reduce((s, c) => s + (c.total || 0), 0);
    const totalExpenses       = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
    const totalRevenue        = totalJobcardRevenue + totalCounterRevenue;
    const netProfit           = totalRevenue - totalExpenses;
    const totalPending        = jobcards.reduce((s, j) => s + (j.balanceDue || 0), 0)
                              + counterSales.reduce((s, c) => s + Math.max(0, (c.total || 0) - (c.paidAmount || 0)), 0);

    // ── Item type breakdown ────────────────────────────────────
    let labourRevenue = 0, spareRevenue = 0, lubeRevenue = 0;
    jobcards.forEach(j => {
      labourRevenue += j.labourTotal || 0;
      spareRevenue  += j.spareTotal  || 0;
      lubeRevenue   += j.lubeTotal   || 0;
    });
    counterSales.forEach(c => {
      (c.items || []).forEach(it => {
        if (it.itemType === 'Spare') spareRevenue += it.amount || 0;
        if (it.itemType === 'Lube')  lubeRevenue  += it.amount || 0;
      });
    });

    // ── Payment mode breakdown (from transactions) ─────────────
    const payMode = { Cash: 0, UPI: 0, Card: 0, Cheque: 0 };
    [...jobcards, ...counterSales].forEach(doc => {
      (doc.transactions || []).forEach(t => {
        const k = t.paymentType;
        if (payMode[k] !== undefined) payMode[k] += t.amount || 0;
      });
    });

    // ── Collections ────────────────────────────────────────────
    const totalCollected = jobcards.reduce((s, j) => s + (j.paidAmount || 0), 0)
                         + counterSales.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalAdvance   = jobcards.reduce((s, j) => {
      const adv = (j.transactions || []).filter(t => t.type === 'Advance').reduce((a, t) => a + (t.amount || 0), 0);
      return s + adv;
    }, 0);

    // ── Discounts given ────────────────────────────────────────
    let totalDiscountGiven = 0;
    jobcards.forEach(j => {
      if (!j.discount) return;
      const base = (j.labourTotal || 0) + (j.spareTotal || 0) + (j.lubeTotal || 0);
      totalDiscountGiven += j.discountType === 'percent' ? base * (j.discount / 100) : j.discount;
    });
    counterSales.forEach(c => {
      (c.items || []).forEach(it => {
        if (!it.discount) return;
        const base = (it.qty || 1) * (it.unitPrice || 0);
        totalDiscountGiven += it.discountType === 'percent' ? base * (it.discount / 100) : it.discount;
      });
    });

    // ── Expense by category ────────────────────────────────────
    const expCat = {};
    expenses.forEach(e => {
      const k = e.category || 'Other';
      expCat[k] = (expCat[k] || 0) + (e.totalAmount || 0);
    });
    const expenseByCat = Object.entries(expCat)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ── Avg ticket size ────────────────────────────────────────
    const avgJobcardValue  = jobcards.length  ? Math.round(totalJobcardRevenue / jobcards.length)  : 0;
    const avgCounterValue  = counterSales.length ? Math.round(totalCounterRevenue / counterSales.length) : 0;

    // Period helpers
    const revIn = (arr, field, from) => arr.filter(x => new Date(x.createdAt) >= from).reduce((s, x) => s + (x[field] || 0), 0);
    const todayRevenue = revIn(jobcards, 'billAmount', todayStart) + revIn(counterSales, 'total', todayStart);
    const weekRevenue  = revIn(jobcards, 'billAmount', weekStart)  + revIn(counterSales, 'total', weekStart);
    const monthRevenue = revIn(jobcards, 'billAmount', monthStart) + revIn(counterSales, 'total', monthStart);

    const todayJobcards = jobcards.filter(j => new Date(j.createdAt) >= todayStart).length;
    const todayCounter  = counterSales.filter(c => new Date(c.createdAt) >= todayStart).length;

    // Per-garage breakdown (only when showing all)
    let garageStats = [];
    if (!garageId) {
      const garageRevMap = {};
      garages.forEach(g => {
        garageRevMap[String(g._id)] = { garage: g, jobcardRev: 0, counterRev: 0, expenses: 0, pending: 0, jobcardCount: 0, counterCount: 0 };
      });
      jobcards.forEach(j => {
        const k = String(j.garageId);
        if (garageRevMap[k]) { garageRevMap[k].jobcardRev += j.billAmount || 0; garageRevMap[k].jobcardCount++; garageRevMap[k].pending += j.balanceDue || 0; }
      });
      counterSales.forEach(c => {
        const k = String(c.garageId);
        if (garageRevMap[k]) { garageRevMap[k].counterRev += c.total || 0; garageRevMap[k].counterCount++; garageRevMap[k].pending += Math.max(0, (c.total || 0) - (c.paidAmount || 0)); }
      });
      expenses.forEach(e => {
        const k = String(e.garageId);
        if (garageRevMap[k]) garageRevMap[k].expenses += e.totalAmount || 0;
      });

      garageStats = Object.values(garageRevMap)
        .map(g => ({
          ...g.garage,
          jobcardRevenue: g.jobcardRev,
          counterRevenue: g.counterRev,
          totalRevenue:   g.jobcardRev + g.counterRev,
          expenses:       g.expenses,
          netProfit:      g.jobcardRev + g.counterRev - g.expenses,
          pending:        g.pending,
          jobcardCount:   g.jobcardCount,
          counterCount:   g.counterCount,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    // Garage detail (when filtered)
    let garageDetail = null;
    if (garageId) {
      garageDetail = garages.find(g => String(g._id) === String(garageId)) || null;
    }

    // Monthly trend (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth(), jobcard: 0, counter: 0, expenses: 0 });
    }
    jobcards.forEach(j => {
      const d = new Date(j.createdAt);
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
      if (m) m.jobcard += j.billAmount || 0;
    });
    counterSales.forEach(c => {
      const d = new Date(c.createdAt);
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
      if (m) m.counter += c.total || 0;
    });
    expenses.forEach(e => {
      const d = new Date(e.createdAt);
      const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
      if (m) m.expenses += e.totalAmount || 0;
    });

    res.json({
      summary: {
        totalGarages:       garages.length,
        activeGarages:      garages.filter(g => g.active !== false).length,
        inactiveGarages:    garages.filter(g => g.active === false).length,
        totalRevenue,
        totalJobcardRevenue,
        totalCounterRevenue,
        totalExpenses,
        netProfit,
        totalPending,
        openJobcards,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayJobcards,
        todayCounter,
        totalJobcardCount:  jobcards.length,
        totalCounterCount:  counterSales.length,
        // revenue detail
        labourRevenue,
        spareRevenue,
        lubeRevenue,
        payMode,
        totalCollected,
        totalAdvance,
        totalDiscountGiven,
        avgJobcardValue,
        avgCounterValue,
      },
      expenseByCat,
      garageStats,
      garageDetail,
      garageList: garages.map(g => ({ _id: g._id, workshopName: g.workshopName, city: g.city, active: g.active })),
      monthlyTrend: months,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── List all garages ──────────────────────────────────────── */
router.get('/garages', superAdminProtect, async (req, res) => {
  try {
    const { search, active } = req.query;
    const q = {};
    if (search) q.$or = [
      { workshopName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } }
    ];
    if (active === 'true')  q.active = true;
    if (active === 'false') q.active = false;

    const garages = await Garage.find(q, '-password -otp -otpExpiry').sort({ createdAt: -1 });
    res.json(garages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Create franchise ──────────────────────────────────────── */
router.post('/garages', superAdminProtect, async (req, res) => {
  try {
    const { firstName, lastName, workshopName, mobile, password, city, state, rtoNo, email } = req.body;

    const exists = await Garage.findOne({ mobile });
    if (exists) return res.status(400).json({ message: 'Mobile number already registered' });

    const garage = await Garage.create({
      firstName, lastName, workshopName, mobile, password,
      plainPassword: password || '',
      city: city || '', state: state || '', email: email || '',
      rtoNo: rtoNo || 'NA',
      active: true,
      plan: 'Trial',
      planStatus: 'Trial',
      createdBySuperAdmin: true,
      isVerified: true
    });

    // Seed the full default master set (jobcard types & statuses, customer voices,
    // labour, lubes, vehicle makes/models) plus the default staff roles — same as a
    // self-registered garage gets. Without this the new franchise opens with empty
    // Type/Status dropdowns and cannot create a jobcard.
    await seedGarageData(garage._id);

    const garageOut = garage.toObject();
    delete garageOut.password;
    res.status(201).json(garageOut);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Update franchise ──────────────────────────────────────── */
router.put('/garages/:id', superAdminProtect, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const update = { ...rest };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
      update.plainPassword = password;
    }

    const garage = await Garage.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password -otp -otpExpiry');
    if (!garage) return res.status(404).json({ message: 'Franchise not found' });
    res.json(garage);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Toggle active ─────────────────────────────────────────── */
router.patch('/garages/:id/toggle', superAdminProtect, async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id);
    if (!garage) return res.status(404).json({ message: 'Not found' });
    garage.active = !garage.active;
    await garage.save();
    res.json({ _id: garage._id, active: garage.active });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Log in as (impersonate) a garage — returns a garage token ── */
router.post('/garages/:id/login', superAdminProtect, async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!garage) return res.status(404).json({ message: 'Franchise not found' });
    if (garage.active === false) return res.status(403).json({ message: 'This franchise is deactivated.' });
    const token = jwt.sign({ id: garage._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, garage });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Backfill default masters for an existing franchise ────── */
/* Idempotent: only fills master types the garage has NONE of.  */
router.post('/garages/:id/seed-defaults', superAdminProtect, async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id).select('_id workshopName');
    if (!garage) return res.status(404).json({ message: 'Franchise not found' });
    const added = await seedMissingGarageData(garage._id);
    const total = Object.values(added).reduce((s, n) => s + n, 0);
    res.json({ message: total ? 'Default master data added' : 'Nothing missing — no changes made', added });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Single garage stats ───────────────────────────────────── */
router.get('/garages/:id/stats', superAdminProtect, async (req, res) => {
  try {
    const gid = req.params.id;
    const [jobcards, counterSales, expenses] = await Promise.all([
      Jobcard.find({ garageId: gid, deletedAt: null, statusCategory: 'Closed' }, 'billAmount balanceDue createdAt').lean(),
      CounterSale.find({ garageId: gid, active: { $ne: false } }, 'total paidAmount createdAt').lean(),
      Expense.find({ garageId: gid, active: { $ne: false } }, 'totalAmount createdAt').lean()
    ]);

    res.json({
      jobcardRevenue:  jobcards.reduce((s, j) => s + (j.billAmount || 0), 0),
      counterRevenue:  counterSales.reduce((s, c) => s + (c.total || 0), 0),
      totalExpenses:   expenses.reduce((s, e) => s + (e.totalAmount || 0), 0),
      totalPending:    jobcards.reduce((s, j) => s + (j.balanceDue || 0), 0),
      jobcardCount:    jobcards.length,
      counterCount:    counterSales.length,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Branding ────────────────────────────────────────────── */
router.put('/garages/:id/branding', superAdminProtect, async (req, res) => {
  try {
    const { primaryColor, headerColor, menuColor, logoUrl } = req.body;
    const set = {};
    if (primaryColor !== undefined) set['branding.primaryColor'] = primaryColor;
    if (headerColor  !== undefined) set['branding.headerColor']  = headerColor;
    if (menuColor    !== undefined) set['branding.menuColor']    = menuColor;
    if (logoUrl      !== undefined) set['branding.logoUrl']      = logoUrl;

    const garage = await Garage.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { new: true }
    ).select('-password -otp -otpExpiry');
    if (!garage) return res.status(404).json({ message: 'Not found' });
    res.json(garage);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Branding logo upload ────────────────────────────────── */
router.post('/garages/:id/logo', superAdminProtect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const garage = await Garage.findById(req.params.id);
    if (!garage) return res.status(404).json({ message: 'Not found' });

    // Delete old brand logo if exists
    if (garage.branding?.logoUrl) {
      const oldPath = path.join(__dirname, '../', garage.branding.logoUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const url = `/uploads/settings/${req.file.filename}`;
    garage.branding.logoUrl = url;
    garage.markModified('branding');
    await garage.save();
    res.json({ message: 'Logo uploaded', url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Credentials ─────────────────────────────────────────── */
router.get('/garages/:id/credentials', superAdminProtect, async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id).select('mobile plainPassword workshopName firstName lastName');
    if (!garage) return res.status(404).json({ message: 'Not found' });
    res.json({ mobile: garage.mobile, plainPassword: garage.plainPassword || '', workshopName: garage.workshopName, name: [garage.firstName, garage.lastName].filter(Boolean).join(' ') });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Reset Franchise Password ────────────────────────────── */
router.post('/garages/:id/reset-password', superAdminProtect, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const garage = await Garage.findById(req.params.id);
    if (!garage) return res.status(404).json({ message: 'Not found' });
    garage.password = newPassword;
    garage.plainPassword = newPassword;
    await garage.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ── Menu Config ─────────────────────────────────────────── */
router.put('/garages/:id/menu', superAdminProtect, async (req, res) => {
  try {
    const { menuConfig } = req.body;
    const garage = await Garage.findByIdAndUpdate(
      req.params.id,
      { menuConfig },
      { new: true }
    ).select('-password -otp -otpExpiry');
    if (!garage) return res.status(404).json({ message: 'Not found' });
    res.json(garage);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
