const express     = require('express');
const router      = express.Router();
const Jobcard     = require('../models/Jobcard');
const CounterSale = require('../models/CounterSale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer    = require('../models/Customer');
const SparePart   = require('../models/masters/SparePart');
const Lube        = require('../models/masters/Lube');
const InventoryImportLog = require('../models/InventoryImportLog');
const { protect } = require('../middleware/auth');

router.use(protect);

function mkRange(startDate, endDate) {
  const s = new Date(startDate); s.setHours(0, 0, 0, 0);
  const e = new Date(endDate);   e.setHours(23, 59, 59, 999);
  return { $gte: s, $lte: e };
}

router.get('/', async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const gid = req.garage._id;
  if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate required' });

  // Profit report is permission-gated for staff (owners always allowed).
  if (type === 'profit' && req.staff && !req.staff.roleId?.reportPermissions?.canViewProfit) {
    return res.status(403).json({ message: 'You do not have permission to view the Profit report' });
  }

  const dateRange = mkRange(startDate, endDate);

  try {
    /* ── Inventory CSV Import Logs ───────────────────────────── *
     * Audit of every successful inventory CSV import in the range. */
    if (type === 'csv-import-logs') {
      const TYPE_LABEL = { spares: 'Spare', lubes: 'Lube', jobs: 'Job' };
      const logs = await InventoryImportLog.find({ garageId: gid, createdAt: dateRange })
        .select('-content').sort({ createdAt: -1 }).lean();
      const data = logs.map(l => ({
        _id: l._id,
        date: l.createdAt,
        importedByName: l.importedByName || '—',
        importedByType: l.importedByType || 'Owner',
        itemType: TYPE_LABEL[l.type] || l.type,
        fileName: l.fileName || 'import.csv',
        insertedRows: l.insertedRows || 0,
        totalRows: l.totalRows || 0,
      }));
      const summary = {
        imports: data.length,
        rowsInserted: data.reduce((s, d) => s + (d.insertedRows || 0), 0),
      };
      return res.json({ data, summary });
    }

    /* ── 1. Jobcard Revenue ─────────────────────────────────── *
     * Per-jobcard records with customer + vehicle details.       *
     * Status filter: All | Open | Completed | Closed (default).  */
    if (type === 'jobcard-revenue') {
      const { status, mechanic, supervisor } = req.query;
      const q = { garageId: gid, deletedAt: null, createdAt: dateRange };
      if (!status) q.statusCategory = 'Closed';            // default → closed only
      else if (status !== 'All') q.statusCategory = status;
      if (mechanic   && mechanic   !== 'All') q.mechanicName   = mechanic;
      if (supervisor && supervisor !== 'All') q.supervisorName = supervisor;

      const jobs = await Jobcard.find(q).sort({ createdAt: 1 }).lean();

      /* Join chassis/engine no — stored on Customer.vehicles[], not on jobcard */
      const custIds = [...new Set(jobs.map(j => j.customerId && String(j.customerId)).filter(Boolean))];
      const customers = custIds.length
        ? await Customer.find({ _id: { $in: custIds } }, 'vehicles').lean()
        : [];
      const vehById = {}, vehByNo = {};
      customers.forEach(c => (c.vehicles || []).forEach(v => {
        if (v._id) vehById[String(v._id)] = v;
        if (v.vehicleNo) vehByNo[v.vehicleNo] = v;
      }));

      const data = jobs.map(j => {
        const bill = j.billAmount || 0;
        const paid = j.paidAmount || 0;
        const bal  = j.balanceDue || 0;
        let paymentStatus = 'Unpaid';
        if (bal <= 0 && (paid > 0 || bill > 0)) paymentStatus = 'Paid';
        else if (paid > 0)                      paymentStatus = 'Partial';
        const veh = (j.vehicleId && vehById[String(j.vehicleId)]) || vehByNo[j.vehicleNo] || {};
        return {
          _id: j._id,
          date: j.createdAt,
          closedDate: j.statusCategory === 'Closed' ? j.updatedAt : null,
          jobcardNumber: j.jobcardNumber,
          typeLabel: j.typeLabel || '',
          customerName: j.customerName || '',
          customerMobile: j.customerMobile || '',
          customerEmail: j.customerEmail || '',
          vehicleNo: j.vehicleNo || '',
          chassisNo: veh.chassisNo || '',
          engineNo: veh.engineNo || '',
          vehicleDesc: [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' '),
          mechanicName: j.mechanicName || '',
          supervisorName: j.supervisorName || '',
          spareTotal: j.spareTotal || 0,
          lubeTotal: j.lubeTotal || 0,
          labourTotal: j.labourTotal || 0,
          total: j.total || 0,
          discount: j.discount || 0,
          billAmount: bill,
          paidAmount: paid,
          balanceDue: bal,
          paymentStatus,
          statusLabel: j.statusLabel || j.statusCategory || ''
        };
      });

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        count: data.length,
        totalSpare: sum('spareTotal'), totalLube: sum('lubeTotal'), totalLabour: sum('labourTotal'),
        total: sum('total'), discount: sum('discount'), finalAmount: sum('billAmount'),
        received: sum('paidAmount'), pending: sum('balanceDue')
      };
      return res.json({ data, summary });
    }

    /* ── 2. Counter Sale Revenue ────────────────────────────── *
     * Per-sale records with customer + vehicle details.         *
     * Status filter: All | Paid | Partial | Unpaid.             */
    if (type === 'counter-sale-revenue') {
      const sales = await CounterSale.find({
        garageId: gid, active: { $ne: false }, createdAt: dateRange
      }).sort({ createdAt: 1 }).lean();

      /* Join chassis/engine/make-model from Customer.vehicles[] (match by vehicleNumber) */
      const custIds = [...new Set(sales.map(s => s.customerId && String(s.customerId)).filter(Boolean))];
      const customers = custIds.length
        ? await Customer.find({ _id: { $in: custIds } }, 'vehicles').lean()
        : [];
      const vehByNo = {};
      customers.forEach(c => (c.vehicles || []).forEach(v => { if (v.vehicleNo) vehByNo[v.vehicleNo] = v; }));

      let data = sales.map(s => {
        const total = s.total || 0;
        const paid  = s.paidAmount || 0;
        const bal   = s.balanceDue || 0;
        let paymentStatus = 'Unpaid';
        if (bal <= 0 && (paid > 0 || total > 0)) paymentStatus = 'Paid';
        else if (paid > 0)                       paymentStatus = 'Partial';
        const veh = vehByNo[s.vehicleNumber] || {};
        const items = s.items || [];
        const spareTotal = items.filter(i => i.itemType === 'Spare').reduce((a, i) => a + (i.amount || 0), 0);
        const lubeTotal  = items.filter(i => i.itemType === 'Lube').reduce((a, i) => a + (i.amount || 0), 0);
        return {
          _id: s._id,
          date: s.createdAt,
          counterNumber: s.counterNumber || '',
          customerName: s.customerName || '',
          customerMobile: s.customerMobile || '',
          customerEmail: s.customerEmail || '',
          vehicleNumber: s.vehicleNumber || '',
          chassisNo: veh.chassisNo || '',
          engineNo: veh.engineNo || '',
          vehicleDesc: [veh.makeName, veh.modelName].filter(Boolean).join(' '),
          itemCount: items.length,
          spareTotal, lubeTotal,
          total, paidAmount: paid, balanceDue: bal, paymentStatus
        };
      });

      const status = req.query.status;
      if (status && status !== 'All') data = data.filter(d => d.paymentStatus === status);

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        count: data.length, totalSpare: sum('spareTotal'), totalLube: sum('lubeTotal'),
        total: sum('total'), received: sum('paidAmount'), pending: sum('balanceDue')
      };
      return res.json({ data, summary });
    }

    /* ── 3. Customer Details (advanced KPI) ─────────────────── *
     * Per-customer aggregate across jobcards + counter sales.   */
    if (type === 'customer-details') {
      const [customers, jobcards, sales] = await Promise.all([
        Customer.find({ garageId: gid, deletedAt: null }).sort({ createdAt: -1 }).lean(),
        Jobcard.find({ garageId: gid, deletedAt: null }, 'customerId createdAt total billAmount paidAmount balanceDue statusCategory transactions').lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false } }, 'customerId createdAt total paidAmount balanceDue transactions').lean(),
      ]);

      const ts = new Date(); ts.setHours(0, 0, 0, 0);
      const te = new Date(); te.setHours(23, 59, 59, 999);
      const isToday = d => d && new Date(d) >= ts && new Date(d) <= te;

      const agg = {};
      const ensure = id => (agg[id] || (agg[id] = { jobCount: 0, closedJobs: 0, saleCount: 0, totalSpend: 0, received: 0, pending: 0, todayPaid: 0, firstVisit: null, lastVisit: null }));
      const touch = (a, d) => {
        if (!a.firstVisit || d < a.firstVisit) a.firstVisit = d;
        if (!a.lastVisit  || d > a.lastVisit)  a.lastVisit  = d;
      };

      jobcards.forEach(j => {
        if (!j.customerId) return;
        const a = ensure(String(j.customerId));
        a.jobCount++;
        if (j.statusCategory === 'Closed') a.closedJobs++;
        a.totalSpend += j.billAmount || j.total || 0;
        a.received   += j.paidAmount || 0;
        a.pending    += j.balanceDue || 0;
        (j.transactions || []).forEach(t => { if (isToday(t.date)) a.todayPaid += t.amount || 0; });
        touch(a, j.createdAt);
      });
      sales.forEach(s => {
        if (!s.customerId) return;
        const a = ensure(String(s.customerId));
        a.saleCount++;
        a.totalSpend += s.total || 0;
        a.received   += s.paidAmount || 0;
        a.pending    += s.balanceDue || 0;
        (s.transactions || []).forEach(t => { if (isToday(t.date)) a.todayPaid += t.amount || 0; });
        touch(a, s.createdAt);
      });

      const data = customers.map(c => {
        const a = agg[String(c._id)] || {};
        const visits = (a.jobCount || 0) + (a.saleCount || 0);
        const spend  = a.totalSpend || 0;
        return {
          _id: c._id,
          name: c.name, mobile: c.mobile, email: c.email || '',
          status: c.status || '', address: c.address || '',
          vehicleCount: (c.vehicles || []).length,
          jobCount: a.jobCount || 0, closedJobs: a.closedJobs || 0, saleCount: a.saleCount || 0,
          visits, totalSpend: spend, received: a.received || 0, pending: a.pending || 0,
          todayPaid: a.todayPaid || 0,
          avgTicket: visits ? spend / visits : 0,
          firstVisit: a.firstVisit || null, lastVisit: a.lastVisit || null,
        };
      });

      const rows = req.query.repeat === 'true' ? data.filter(d => d.visits > 1) : data;

      const sum = f => rows.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        totalCustomers: rows.length,
        activeCustomers: rows.filter(d => d.visits > 0).length,
        withDues: rows.filter(d => d.pending > 0).length,
        totalRevenue: sum('totalSpend'),
        totalReceived: sum('received'),
        totalPending: sum('pending'),
        todayCollected: sum('todayPaid'),
      };
      return res.json({ data: rows, summary });
    }

    /* ── 4. Pending Balance ─────────────────────────────────── */
    if (type === 'pending-balance') {
      const now = Date.now();
      const ageDays = d => Math.max(0, Math.floor((now - new Date(d).getTime()) / 86400000));

      const [jobs, sales] = await Promise.all([
        Jobcard.find({ garageId: gid, deletedAt: null, balanceDue: { $gt: 0 } }).lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false }, balanceDue: { $gt: 0 } }).lean(),
      ]);

      const data = [
        ...jobs.map(j => ({
          _id: j._id, date: j.createdAt, sourceType: 'Jobcard', sourceNumber: j.jobcardNumber, sourceId: j._id,
          customerName: j.customerName || '', customerMobile: j.customerMobile || '',
          vehicle: [j.vehicleMake, j.vehicleModel, j.vehicleNo].filter(Boolean).join(' '),
          total: j.billAmount || j.total || 0, paid: j.paidAmount || 0, pending: j.balanceDue || 0,
          ageDays: ageDays(j.createdAt),
        })),
        ...sales.map(s => ({
          _id: s._id, date: s.createdAt, sourceType: 'Counter Sale', sourceNumber: s.counterNumber, sourceId: s._id,
          customerName: s.customerName || '', customerMobile: s.customerMobile || '',
          vehicle: s.vehicleNumber || '',
          total: s.total || 0, paid: s.paidAmount || 0, pending: s.balanceDue || 0,
          ageDays: ageDays(s.createdAt),
        })),
      ].sort((a, b) => b.pending - a.pending);

      const top5 = data.slice(0, 5).map(d => ({ customerName: d.customerName, total: d.total, pendingBalance: d.pending }));
      const summary = {
        count: data.length,
        totalPending: data.reduce((s, d) => s + d.pending, 0),
        jobcardPending: data.filter(d => d.sourceType === 'Jobcard').reduce((s, d) => s + d.pending, 0),
        counterPending: data.filter(d => d.sourceType === 'Counter Sale').reduce((s, d) => s + d.pending, 0),
        top5,
      };
      return res.json({ data, summary });
    }

    /* ── 5-8. Usage reports (detailed, per-occurrence) ──────── *
     * spare/lube/job usages + counter-sale usage.               *
     * Each row = one item line in a jobcard or counter sale,    *
     * with source type, source #, customer, qty, amount.        *
     * Toggles: topOnly (most-used item per category),           *
     *          outOfStock (only items with stock <= 0).         */
    if (['spare-usages', 'lube-usages', 'job-usages', 'counter-sale-usage'].includes(type)) {
      const wantJobType = { 'spare-usages': 'Spare', 'lube-usages': 'Lube', 'job-usages': 'Labour' }[type];
      const wantSaleType = { 'spare-usages': 'Spare', 'lube-usages': 'Lube' }[type]; // counter-sale-usage = all
      const useJobs  = type !== 'counter-sale-usage';
      const useSales = type !== 'job-usages';

      const [jobs, sales] = await Promise.all([
        useJobs  ? Jobcard.find({ garageId: gid, deletedAt: null, createdAt: dateRange },
                    'items jobcardNumber customerName customerMobile customerId vehicleNo vehicleMake vehicleModel createdAt').lean() : [],
        useSales ? CounterSale.find({ garageId: gid, active: { $ne: false }, createdAt: dateRange },
                    'items counterNumber customerName customerMobile customerId vehicleNumber createdAt').lean() : [],
      ]);

      /* chassis/engine/make-model from Customer.vehicles[] (by vehicleNo) */
      const custIds = [...new Set([...jobs.map(j => j.customerId), ...sales.map(s => s.customerId)].filter(Boolean).map(String))];
      const customers = custIds.length ? await Customer.find({ _id: { $in: custIds } }, 'vehicles').lean() : [];
      const vehByNo = {};
      customers.forEach(c => (c.vehicles || []).forEach(v => { if (v.vehicleNo) vehByNo[v.vehicleNo] = v; }));
      const veh = no => vehByNo[no] || {};

      let rows = [];
      jobs.forEach(j => (j.items || []).filter(i => i.itemType === wantJobType).forEach(i => {
        const cv = veh(j.vehicleNo);
        rows.push({
          date: j.createdAt, sourceType: 'Jobcard', sourceNumber: j.jobcardNumber, sourceId: j._id,
          customerName: j.customerName || '', customerMobile: j.customerMobile || '',
          vehicleNo: j.vehicleNo || '',
          vehicleDesc: [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ') || [cv.makeName, cv.modelName].filter(Boolean).join(' '),
          chassisNo: cv.chassisNo || '', engineNo: cv.engineNo || '',
          itemName: i.name || '', partNumber: i.partNumber || '',
          qty: i.qty || 0, amount: i.finalAmount || 0, itemCategory: i.itemType,
        });
      }));
      sales.forEach(s => (s.items || []).filter(i => !wantSaleType || i.itemType === wantSaleType).forEach(i => {
        const cv = veh(s.vehicleNumber);
        rows.push({
          date: s.createdAt, sourceType: 'Counter Sale', sourceNumber: s.counterNumber, sourceId: s._id,
          customerName: s.customerName || '', customerMobile: s.customerMobile || '',
          vehicleNo: s.vehicleNumber || '',
          vehicleDesc: [cv.makeName, cv.modelName].filter(Boolean).join(' '),
          chassisNo: cv.chassisNo || '', engineNo: cv.engineNo || '',
          itemName: i.name || '', partNumber: i.partNumber || '',
          qty: i.qty || 0, amount: i.amount || 0, itemCategory: i.itemType,
        });
      }));

      /* category → keep only Spare / Lube / Labour rows */
      const cat = req.query.category;
      if (cat && cat !== 'All') rows = rows.filter(r => r.itemCategory === cat);

      /* topOnly → keep only the highest-qty item per category */
      if (req.query.topOnly === 'true') {
        const byKey = {};   // category|name → total qty
        rows.forEach(r => { const k = `${r.itemCategory}|${r.itemName}`; byKey[k] = (byKey[k] || 0) + r.qty; });
        const topName = {};  // category → winning name
        Object.entries(byKey).forEach(([k, q]) => {
          const [cat, name] = k.split('|');
          if (!topName[cat] || q > topName[cat].q) topName[cat] = { name, q };
        });
        rows = rows.filter(r => topName[r.itemCategory] && topName[r.itemCategory].name === r.itemName);
      }

      /* outOfStock → keep only items currently at/below 0 stock */
      if (req.query.outOfStock === 'true') {
        const [spares, lubes] = await Promise.all([
          SparePart.find({ garageId: gid }, 'name partNumber currentStock').lean(),
          Lube.find({ garageId: gid }, 'name partNumber currentStock').lean(),
        ]);
        const byPart = {}, byName = {};
        [...spares, ...lubes].forEach(it => {
          if (it.partNumber) byPart[it.partNumber] = it.currentStock || 0;
          byName[(it.name || '').toLowerCase()] = it.currentStock || 0;
        });
        rows = rows.filter(r => {
          const s = (r.partNumber && byPart[r.partNumber] != null) ? byPart[r.partNumber] : byName[(r.itemName || '').toLowerCase()];
          return s != null && s <= 0;
        });
      }

      // Point 21: Spare/Lube usage shown aggregated per item → Part #, Name, Total Sold.
      if (type === 'spare-usages' || type === 'lube-usages') {
        const agg = {};
        rows.forEach(r => {
          const key = `${(r.partNumber || '').toLowerCase()}|${(r.itemName || '').toLowerCase()}`;
          if (!agg[key]) agg[key] = { partNumber: r.partNumber || '', name: r.itemName || '', itemType: r.itemCategory, totalSold: 0 };
          agg[key].totalSold += r.qty || 0;
        });
        const list = Object.values(agg).sort((a, b) => b.totalSold - a.totalSold);
        return res.json({ data: list, summary: { items: list.length, totalQty: list.reduce((s, d) => s + d.totalSold, 0) } });
      }

      rows.sort((a, b) => new Date(b.date) - new Date(a.date));

      const distinct = new Set(rows.map(r => r.itemName)).size;
      const summary = {
        occurrences: rows.length,
        items: distinct,
        totalQty: rows.reduce((s, d) => s + (d.qty || 0), 0),
        totalAmount: rows.reduce((s, d) => s + (d.amount || 0), 0),
      };
      return res.json({ data: rows, summary });
    }

    /* ── 9. Vehicle ─────────────────────────────────────────── */
    if (type === 'vehicle') {
      const jobs = await Jobcard.find({
        garageId: gid, deletedAt: null, createdAt: dateRange
      }, 'vehicleNo vehicleMake vehicleModel customerId customerName customerMobile total billAmount paidAmount balanceDue reminderPeriod createdAt').lean();

      /* parse "<n> Day|Week|Month|Year" → add to a base date */
      const nextDate = (base, period) => {
        if (!base || !period) return null;
        const m = String(period).match(/(\d+)\s*(day|week|month|year)/i);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        const d = new Date(base);
        const unit = m[2].toLowerCase();
        if (unit === 'day')   d.setDate(d.getDate() + n);
        if (unit === 'week')  d.setDate(d.getDate() + n * 7);
        if (unit === 'month') d.setMonth(d.getMonth() + n);
        if (unit === 'year')  d.setFullYear(d.getFullYear() + n);
        return d;
      };

      const map = {};
      jobs.forEach(j => {
        const k = j.vehicleNo || 'Unknown';
        if (!map[k]) map[k] = {
          vehicleNo: j.vehicleNo, customerId: j.customerId,
          vehicleDesc: [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' '),
          customerName: j.customerName, customerMobile: j.customerMobile,
          visitCount: 0, totalRevenue: 0, received: 0, pending: 0,
          firstVisit: null, lastVisit: null, _reminderAt: null, _reminderPeriod: ''
        };
        const v = map[k];
        v.visitCount++;
        v.totalRevenue += j.billAmount || j.total || 0;
        v.received     += j.paidAmount || 0;
        v.pending      += j.balanceDue || 0;
        if (!v.firstVisit || j.createdAt < v.firstVisit) v.firstVisit = j.createdAt;
        if (!v.lastVisit  || j.createdAt > v.lastVisit)  v.lastVisit  = j.createdAt;
        // keep the most recent visit that carries a reminder period
        if (j.reminderPeriod && (!v._reminderAt || j.createdAt > v._reminderAt)) {
          v._reminderAt = j.createdAt; v._reminderPeriod = j.reminderPeriod;
        }
      });

      /* join chassis/engine from Customer.vehicles[] */
      const custIds = [...new Set(Object.values(map).map(v => v.customerId && String(v.customerId)).filter(Boolean))];
      const customers = custIds.length ? await Customer.find({ _id: { $in: custIds } }, 'vehicles').lean() : [];
      const vehByNo = {};
      customers.forEach(c => (c.vehicles || []).forEach(ve => { if (ve.vehicleNo) vehByNo[ve.vehicleNo] = ve; }));

      const data = Object.values(map).map(v => {
        const ve = vehByNo[v.vehicleNo] || {};
        const nv = nextDate(v._reminderAt, v._reminderPeriod);
        const { customerId, _reminderAt, _reminderPeriod, ...rest } = v;
        return { ...rest, chassisNo: ve.chassisNo || '', engineNo: ve.engineNo || '', nextVisit: nv };
      }).sort((a, b) => b.visitCount - a.visitCount);

      const summary = {
        vehicles: data.length,
        totalRevenue: data.reduce((s, d) => s + d.totalRevenue, 0),
        totalReceived: data.reduce((s, d) => s + d.received, 0),
        totalPending: data.reduce((s, d) => s + d.pending, 0),
      };
      return res.json({ data, summary });
    }

    /* ── 10. Mechanic ───────────────────────────────────────── */
    if (type === 'mechanic') {
      const jobs = await Jobcard.find({
        garageId: gid, deletedAt: null, createdAt: dateRange
      }, 'mechanicName statusCategory total billAmount labourTotal spareTotal lubeTotal paidAmount balanceDue customerId createdAt').lean();

      const map = {};
      jobs.forEach(j => {
        const k = j.mechanicName || 'Unassigned';
        if (!map[k]) map[k] = {
          mechanicName: k, totalJobs: 0, closedJobs: 0,
          totalLabour: 0, spareTotal: 0, lubeTotal: 0,
          totalRevenue: 0, received: 0, pending: 0,
          lastJob: null, _customers: new Set()
        };
        const m = map[k];
        m.totalJobs++;
        if (j.statusCategory === 'Closed') m.closedJobs++;
        m.totalLabour  += j.labourTotal || 0;
        m.spareTotal   += j.spareTotal  || 0;
        m.lubeTotal    += j.lubeTotal   || 0;
        m.totalRevenue += j.billAmount || j.total || 0;
        m.received     += j.paidAmount || 0;
        m.pending      += j.balanceDue || 0;
        if (j.customerId) m._customers.add(String(j.customerId));
        if (!m.lastJob || j.createdAt > m.lastJob) m.lastJob = j.createdAt;
      });

      const data = Object.values(map).map(m => {
        const { _customers, ...rest } = m;
        return { ...rest, customers: _customers.size, avgTicket: m.totalJobs ? m.totalRevenue / m.totalJobs : 0 };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        mechanics: data.length,
        totalJobs: sum('totalJobs'),
        totalRevenue: sum('totalRevenue'),
        totalReceived: sum('received'),
        totalPending: sum('pending'),
      };
      return res.json({ data, summary });
    }

    /* ── 11. Services Due ───────────────────────────────────── */
    if (type === 'services-due') {
      const jobs = await Jobcard.find({
        garageId: gid, deletedAt: null,
        $or: [{ reminderKm: { $nin: ['', null] } }, { reminderPeriod: { $nin: ['', null] } }]
      }).sort({ createdAt: -1 }).lean();

      const nextDue = (base, period) => {
        if (!base || !period) return null;
        const m = String(period).match(/(\d+)\s*(day|week|month|year)/i);
        if (!m) return null;
        const n = parseInt(m[1], 10), d = new Date(base), u = m[2].toLowerCase();
        if (u === 'day') d.setDate(d.getDate() + n);
        if (u === 'week') d.setDate(d.getDate() + n * 7);
        if (u === 'month') d.setMonth(d.getMonth() + n);
        if (u === 'year') d.setFullYear(d.getFullYear() + n);
        return d;
      };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const seen = new Set();
      const data = [];
      jobs.forEach(j => {
        const k = j.vehicleNo || String(j.customerId);
        if (seen.has(k)) return;
        seen.add(k);
        const nd = nextDue(j.createdAt, j.reminderPeriod);
        data.push({
          customerName: j.customerName || '', customerMobile: j.customerMobile || '',
          vehicleNo: j.vehicleNo || '', vehicleDesc: [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' '),
          reminderKm: j.reminderKm || '', reminderPeriod: j.reminderPeriod || '',
          lastVisit: j.createdAt, nextDue: nd,
          status: nd ? (nd < today ? 'Overdue' : 'Upcoming') : '—',
        });
      });

      const summary = {
        total: data.length,
        overdue: data.filter(d => d.status === 'Overdue').length,
        upcoming: data.filter(d => d.status === 'Upcoming').length,
      };
      return res.json({ data, summary });
    }

    /* ── 12. Recurring Customers ────────────────────────────── */
    if (type === 'recurring-customers') {
      const minVisits = Math.max(2, parseInt(req.query.minVisits, 10) || 2);
      const jobs = await Jobcard.find({
        garageId: gid, deletedAt: null, createdAt: dateRange
      }, 'customerName customerMobile customerId vehicleNo vehicleMake vehicleModel total billAmount paidAmount balanceDue createdAt').lean();

      const map = {};
      jobs.forEach(j => {
        const k = String(j.customerId) || j.customerMobile;
        if (!map[k]) map[k] = { customerName: j.customerName, customerMobile: j.customerMobile, vehicleNo: '', vehicleDesc: '', visitCount: 0, totalSpend: 0, received: 0, pending: 0, firstVisit: null, lastVisit: null, _vehAt: null };
        const m = map[k];
        m.visitCount++;
        m.totalSpend += j.billAmount || j.total || 0;
        m.received   += j.paidAmount || 0;
        m.pending    += j.balanceDue || 0;
        if (!m.firstVisit || j.createdAt < m.firstVisit) m.firstVisit = j.createdAt;
        if (!m.lastVisit  || j.createdAt > m.lastVisit)  m.lastVisit  = j.createdAt;
        // keep the vehicle from the most recent visit
        if (!m._vehAt || j.createdAt > m._vehAt) {
          m._vehAt = j.createdAt;
          m.vehicleNo = j.vehicleNo || '';
          m.vehicleDesc = [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');
        }
      });

      const data = Object.values(map)
        .filter(c => c.visitCount >= minVisits)
        .map(({ _vehAt, ...c }) => ({ ...c, avgTicket: c.visitCount ? c.totalSpend / c.visitCount : 0 }))
        .sort((a, b) => b.visitCount - a.visitCount);

      const summary = {
        customers: data.length,
        totalRevenue: data.reduce((s, d) => s + d.totalSpend, 0),
        totalReceived: data.reduce((s, d) => s + d.received, 0),
        totalPending: data.reduce((s, d) => s + d.pending, 0),
      };
      return res.json({ data, summary });
    }

    /* ── 13. Inventory Summary ──────────────────────────────── */
    if (type === 'inventory-summary') {
      const { itemType, stockStatus, mostUsed, usageSource } = req.query;
      const LOW_THRESHOLD = 10;

      const [spares, lubes, jobs, sales] = await Promise.all([
        SparePart.find({ garageId: gid, active: { $ne: false } }).lean(),
        Lube.find({ garageId: gid, active: { $ne: false } }).lean(),
        Jobcard.find({ garageId: gid, deletedAt: null, createdAt: dateRange }, 'items').lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false }, createdAt: dateRange }, 'items').lean(),
      ]);

      /* usage (qty consumed in period) split by channel, keyed by partNumber + name */
      const jobByPart = {}, jobByName = {}, cntByPart = {}, cntByName = {};
      const addUse = (byPart, byName, name, part, qty) => {
        if (part) byPart[part] = (byPart[part] || 0) + qty;
        byName[(name || '').toLowerCase()] = (byName[(name || '').toLowerCase()] || 0) + qty;
      };
      jobs.forEach(j => (j.items || []).filter(i => i.itemType === 'Spare' || i.itemType === 'Lube').forEach(i => addUse(jobByPart, jobByName, i.name, i.partNumber, i.qty || 0)));
      sales.forEach(s => (s.items || []).forEach(i => addUse(cntByPart, cntByName, i.name, i.partNumber, i.qty || 0)));
      const lookup = (byPart, byName, name, part) => (part && byPart[part] != null) ? byPart[part] : (byName[(name || '').toLowerCase()] || 0);

      const build = (it, t) => {
        const stock = it.currentStock || 0, lower = it.lowerLimit || 0;
        const pp = it.purchasePrice || 0, sp = it.sellingPrice || 0;
        const usedJob = lookup(jobByPart, jobByName, it.name, it.partNumber);
        const usedCounter = lookup(cntByPart, cntByName, it.name, it.partNumber);
        let status = 'OK';
        if (stock <= 0) status = 'Out of Stock';
        else if (stock < LOW_THRESHOLD || stock <= lower) status = 'Low';
        return {
          name: it.name, partNumber: it.partNumber || '', type: t,
          currentStock: stock, lowerLimit: lower,
          used: usedJob + usedCounter, usedJob, usedCounter,
          channel: usedJob === 0 && usedCounter === 0 ? '—' : (usedJob >= usedCounter ? 'Jobcard' : 'Counter'),
          purchasePrice: pp, sellingPrice: sp,
          stockValue: stock * pp, potentialValue: stock * sp,
          margin: sp - pp, status, low: status !== 'OK',
        };
      };

      let data = [...spares.map(s => build(s, 'Spare')), ...lubes.map(l => build(l, 'Lube'))];

      if (itemType && itemType !== 'All') data = data.filter(d => d.type === itemType);
      if (stockStatus === 'out')      data = data.filter(d => d.currentStock <= 0);
      else if (stockStatus === 'low') data = data.filter(d => d.currentStock > 0 && (d.currentStock < LOW_THRESHOLD || d.currentStock <= d.lowerLimit));
      else if (stockStatus === 'in')  data = data.filter(d => d.currentStock > 0);

      /* usageSource → most sold via a given channel (filter + sort by it) */
      if (usageSource === 'jobcard')      data = data.filter(d => d.usedJob > 0).sort((a, b) => b.usedJob - a.usedJob);
      else if (usageSource === 'counter') data = data.filter(d => d.usedCounter > 0).sort((a, b) => b.usedCounter - a.usedCounter);
      else if (mostUsed === 'true')       data = data.filter(d => d.used > 0).sort((a, b) => b.used - a.used);
      else data.sort((a, b) => a.name.localeCompare(b.name));

      const summary = {
        totalItems: data.length,
        outOfStock: data.filter(d => d.currentStock <= 0).length,
        lowStock: data.filter(d => d.currentStock > 0 && (d.currentStock < LOW_THRESHOLD || d.currentStock <= d.lowerLimit)).length,
        totalUnits: data.reduce((s, d) => s + d.currentStock, 0),
        stockValue: data.reduce((s, d) => s + d.stockValue, 0),
        potentialValue: data.reduce((s, d) => s + d.potentialValue, 0),
      };
      return res.json({ data, summary });
    }

    /* ── 14. Jobcard (billing list) ─────────────────────────── */
    if (type === 'gst-jobcard') {
      const jobs = await Jobcard.find({
        garageId: gid, deletedAt: null, createdAt: dateRange
      }, 'jobcardNumber customerName customerMobile vehicleNo vehicleMake vehicleModel spareTotal lubeTotal labourTotal total discount billAmount paidAmount balanceDue statusLabel statusCategory createdAt').sort({ createdAt: 1 }).lean();

      const data = jobs.map(j => ({
        _id: j._id, sourceId: j._id, date: j.createdAt,
        jobcardNumber: j.jobcardNumber, customerName: j.customerName || '', customerMobile: j.customerMobile || '',
        vehicle: [j.vehicleMake, j.vehicleModel, j.vehicleNo].filter(Boolean).join(' '),
        spareTotal: j.spareTotal || 0, lubeTotal: j.lubeTotal || 0, labourTotal: j.labourTotal || 0,
        subtotal: j.total || 0, discount: j.discount || 0, billAmount: j.billAmount || 0,
        paidAmount: j.paidAmount || 0, balanceDue: j.balanceDue || 0,
        statusLabel: j.statusLabel || j.statusCategory || '',
      }));

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        count: data.length, subtotal: sum('subtotal'), discount: sum('discount'),
        billAmount: sum('billAmount'), received: sum('paidAmount'), pending: sum('balanceDue'),
      };
      return res.json({ data, summary });
    }

    /* ── 15. GST Jobcard HSN ────────────────────────────────── */
    if (type === 'gst-jobcard-hsn') {
      return res.json({ data: [], summary: {}, note: 'HSN codes not stored in jobcard items. Use GST Purchase Order HSN report.' });
    }

    /* ── 16. Purchase Order ─────────────────────────────────── */
    if (type === 'gst-purchase-order') {
      const pos = await PurchaseOrder.find({
        garageId: gid, active: { $ne: false }, createdAt: dateRange
      }).sort({ createdAt: 1 }).lean();

      const data = pos.map(p => ({
        date: p.createdAt, poNumber: p.poNumber, billNumber: p.billNumber || '',
        supplierName: p.supplierName || '', supplierPhone: p.supplierPhone || '',
        itemCount: (p.items || []).length,
        subtotal: p.subtotal || 0, gstAmount: p.gstAmount || 0, totalPayable: p.totalPayable || 0,
        paidAmount: p.paidAmount || 0,
        pendingAmount: p.pendingAmount || ((p.totalPayable || 0) - (p.paidAmount || 0)),
        status: p.status || '',
      }));

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = {
        count: data.length, subtotal: sum('subtotal'), gstAmount: sum('gstAmount'),
        totalPayable: sum('totalPayable'), paid: sum('paidAmount'), pending: sum('pendingAmount'),
      };
      return res.json({ data, summary });
    }

    /* ── 17. GST Purchase Order HSN ─────────────────────────── */
    if (type === 'gst-purchase-order-hsn') {
      const pos = await PurchaseOrder.find({
        garageId: gid, active: { $ne: false }, createdAt: dateRange
      }, 'items poNumber').lean();

      const map = {};
      pos.forEach(p => {
        (p.items || []).forEach(i => {
          const k = i.hsn || 'N/A';
          if (!map[k]) map[k] = { hsn: k, itemCount: 0, qty: 0, taxableValue: 0, gstPercent: i.gstPercent || 0, gstAmount: 0 };
          const taxable = (i.unitPrice || 0) * (i.qty || 0);
          const gst = taxable * ((i.gstPercent || 0) / 100);
          map[k].itemCount++;
          map[k].qty          += i.qty || 0;
          map[k].taxableValue += taxable;
          map[k].gstAmount    += gst;
        });
      });

      const data = Object.values(map).sort((a, b) => b.gstAmount - a.gstAmount);
      const summary = { totalGST: data.reduce((s, d) => s + d.gstAmount, 0) };
      return res.json({ data, summary });
    }

    /* ── 18. Counter Sale (billing list) ────────────────────── */
    if (type === 'gst-counter-sale') {
      const sales = await CounterSale.find({
        garageId: gid, active: { $ne: false }, createdAt: dateRange
      }).sort({ createdAt: 1 }).lean();

      const data = sales.map(s => {
        const total = s.total || 0, paid = s.paidAmount || 0, bal = s.balanceDue || 0;
        let paymentStatus = 'Unpaid';
        if (bal <= 0 && (paid > 0 || total > 0)) paymentStatus = 'Paid';
        else if (paid > 0)                       paymentStatus = 'Partial';
        return {
          _id: s._id, sourceId: s._id, date: s.createdAt, counterNumber: s.counterNumber || '',
          customerName: s.customerName || '', customerMobile: s.customerMobile || '',
          vehicleNumber: s.vehicleNumber || '', itemCount: (s.items || []).length,
          total, paidAmount: paid, balanceDue: bal, paymentStatus,
        };
      });

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      const summary = { count: data.length, total: sum('total'), received: sum('paidAmount'), pending: sum('balanceDue') };
      return res.json({ data, summary });
    }

    /* ── 19. GST Counter Sale HSN ───────────────────────────── */
    if (type === 'gst-counter-sale-hsn') {
      return res.json({ data: [], summary: {}, note: 'HSN codes not stored in counter sale items.' });
    }

    /* ── 20. Insurance Expiry ───────────────────────────────── */
    if (type === 'insurance-expiry') {
      return res.json({ data: [], summary: {}, note: 'Insurance expiry data not available. Add insurance fields to customer vehicles in Settings.' });
    }

    /* ── 21. Item Usage (drill-down for Inventory Summary popup) ──── *
     * Per-occurrence usage of ONE item across jobcards + counter      *
     * sales in the date range: date, source no, vehicle no, qty.      */
    if (type === 'item-usage') {
      const name = (req.query.item || '').trim();
      const part = (req.query.partNumber || '').trim();
      if (!name && !part) return res.json({ data: [], summary: { occurrences: 0, totalQty: 0 } });

      const nameLc = name.toLowerCase();
      const matchItem = (i) =>
        (part && (i.partNumber || '').trim().toLowerCase() === part.toLowerCase()) ||
        (name && (i.name || '').trim().toLowerCase() === nameLc);

      const [jobs, sales] = await Promise.all([
        Jobcard.find({ garageId: gid, deletedAt: null, createdAt: dateRange },
          'items jobcardNumber vehicleNo vehicleMake vehicleModel createdAt').lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false }, createdAt: dateRange },
          'items counterNumber vehicleNumber createdAt').lean(),
      ]);

      const data = [];
      jobs.forEach(j => (j.items || []).filter(matchItem).forEach(i => {
        data.push({
          date: j.createdAt, sourceType: 'Jobcard', sourceNumber: j.jobcardNumber,
          vehicleNo: j.vehicleNo || '', qty: i.qty || 0,
        });
      }));
      sales.forEach(s => (s.items || []).filter(matchItem).forEach(i => {
        data.push({
          date: s.createdAt, sourceType: 'Counter Sale', sourceNumber: s.counterNumber,
          vehicleNo: s.vehicleNumber || '', qty: i.qty || 0,
        });
      }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json({
        data,
        summary: { occurrences: data.length, totalQty: data.reduce((s, d) => s + (d.qty || 0), 0) },
      });
    }

    /* ── 22. Item Statement (stock ledger popup for Spare/Lube Uses) ── *
     * One item's movement: USE (jobcard+counter) + ADD (received POs),  *
     * with a running BAL reconstructed so the latest row = current stock.*/
    if (type === 'item-statement') {
      const name = (req.query.item || '').trim();
      const part = (req.query.partNumber || '').trim();
      if (!name && !part) return res.json({ data: [], summary: {} });

      const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const orq = [];
      if (part) orq.push({ partNumber: new RegExp(`^${esc(part)}$`, 'i') });
      if (name) orq.push({ name: new RegExp(`^${esc(name)}$`, 'i') });
      const master = await SparePart.findOne({ garageId: gid, $or: orq }).lean()
                  || await Lube.findOne({ garageId: gid, $or: orq }).lean();
      const currentStock = master ? (master.currentStock || 0) : 0;

      const nameLc = name.toLowerCase();
      const matchItem = (i) =>
        (part && (i.partNumber || '').trim().toLowerCase() === part.toLowerCase()) ||
        (name && (i.name || '').trim().toLowerCase() === nameLc);

      const [jobs, sales, pos] = await Promise.all([
        Jobcard.find({ garageId: gid, deletedAt: null }, 'items jobcardNumber vehicleNo createdAt').lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false } }, 'items counterNumber vehicleNumber createdAt').lean(),
        PurchaseOrder.find({ garageId: gid, active: { $ne: false }, status: 'Received' }, 'items poNumber supplierName receivedDate createdAt').lean(),
      ]);

      const events = [];
      jobs.forEach(j => (j.items || []).filter(matchItem).forEach(i =>
        events.push({ date: j.createdAt, source: j.jobcardNumber, sourceType: 'Jobcard', vehicleNo: j.vehicleNo || '', useQty: i.qty || 0, addQty: 0 })));
      sales.forEach(s => (s.items || []).filter(matchItem).forEach(i =>
        events.push({ date: s.createdAt, source: s.counterNumber, sourceType: 'Counter Sale', vehicleNo: s.vehicleNumber || '', useQty: i.qty || 0, addQty: 0 })));
      pos.forEach(p => (p.items || []).filter(matchItem).forEach(i =>
        events.push({ date: p.receivedDate || p.createdAt, source: p.poNumber, sourceType: 'Purchase', vehicleNo: '', useQty: 0, addQty: i.qty || 0 })));

      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Reconstruct running balance so the final event lands on current stock.
      const netAll = events.reduce((s, e) => s + e.addQty - e.useQty, 0);
      let bal = currentStock - netAll;
      events.forEach(e => { bal += e.addQty - e.useQty; e.balQty = bal; });

      const inRange = events.filter(e => {
        const d = new Date(e.date);
        return d >= dateRange.$gte && d <= dateRange.$lte;
      });

      return res.json({
        data: inRange,
        summary: {
          currentStock,
          totalUse: inRange.reduce((s, e) => s + e.useQty, 0),
          totalAdd: inRange.reduce((s, e) => s + e.addQty, 0),
        },
      });
    }

    /* ── 23. Profit (COGS) ──────────────────────────────────── *
     * SALE  = spare+lube+labour selling on jobcards/counter sales.     *
     * PURCHASE = sold spare/lube cost (master purchasePrice × qty)     *
     *            + outsource line amount (treated as cost).            *
     * Grouped month-wise or date-wise; PENDING = unpaid bill balance.  */
    if (type === 'profit') {
      const groupBy = req.query.groupBy === 'month' ? 'month' : 'date';
      const keyOf = d => groupBy === 'month'
        ? new Date(d).toISOString().slice(0, 7)
        : new Date(d).toISOString().slice(0, 10);

      const [spares, lubes, jobs, sales] = await Promise.all([
        SparePart.find({ garageId: gid }, 'name partNumber purchasePrice').lean(),
        Lube.find({ garageId: gid }, 'name partNumber purchasePrice').lean(),
        Jobcard.find({ garageId: gid, deletedAt: null, createdAt: dateRange }, 'items balanceDue billAmount paidAmount jobcardNumber createdAt').lean(),
        CounterSale.find({ garageId: gid, active: { $ne: false }, createdAt: dateRange }, 'items balanceDue total paidAmount counterNumber createdAt').lean(),
      ]);

      const costByPart = {}, costByName = {};
      [...spares, ...lubes].forEach(it => {
        if (it.partNumber) costByPart[it.partNumber.toLowerCase()] = it.purchasePrice || 0;
        costByName[(it.name || '').toLowerCase()] = it.purchasePrice || 0;
      });
      const costOf = (it) => (it.partNumber && costByPart[it.partNumber.toLowerCase()] != null)
        ? costByPart[it.partNumber.toLowerCase()]
        : (costByName[(it.name || '').toLowerCase()] || 0);

      const map = {};
      const ensure = k => map[k] || (map[k] = { date: k, purchase: 0, sale: 0, profit: 0, pending: 0 });
      // Record-level rows so the UI can drill into "what was received on that date".
      const records = [];

      jobs.forEach(j => {
        const m = ensure(keyOf(j.createdAt));
        (j.items || []).forEach(i => {
          if (i.itemType === 'Spare' || i.itemType === 'Lube') {
            m.sale += i.finalAmount || 0;
            m.purchase += (i.qty || 0) * costOf(i);
          } else if (i.itemType === 'Labour') {
            m.sale += i.finalAmount || 0;
          } else if (i.itemType === 'Outsource') {
            m.purchase += i.finalAmount || 0;
          }
        });
        m.pending += j.balanceDue || 0;
        records.push({
          date: j.createdAt, sourceType: 'Jobcard', number: j.jobcardNumber || '',
          sale: j.billAmount || 0, received: j.paidAmount || 0, pending: j.balanceDue || 0,
        });
      });
      sales.forEach(s => {
        const m = ensure(keyOf(s.createdAt));
        (s.items || []).forEach(i => {
          if (i.itemType === 'Spare' || i.itemType === 'Lube') {
            m.sale += i.amount || 0;
            m.purchase += (i.qty || 0) * costOf(i);
          } else {
            m.sale += i.amount || 0;
          }
        });
        m.pending += s.balanceDue || 0;
        records.push({
          date: s.createdAt, sourceType: 'Counter Sale', number: s.counterNumber || '',
          sale: s.total || 0, received: s.paidAmount || 0, pending: s.balanceDue || 0,
        });
      });

      const data = Object.values(map)
        .map(m => ({ ...m, profit: m.sale - m.purchase }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));

      const sum = f => data.reduce((s, d) => s + (d[f] || 0), 0);
      return res.json({
        data,
        records,
        summary: { periods: data.length, purchase: sum('purchase'), sale: sum('sale'), profit: sum('profit'), pending: sum('pending') },
      });
    }

    res.status(400).json({ message: 'Unknown report type' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
