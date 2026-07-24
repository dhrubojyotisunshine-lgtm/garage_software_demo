const Jobcard = require('../models/Jobcard');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const CounterSale = require('../models/CounterSale');

const summary = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [current, previous, pending] = await Promise.all([
      Jobcard.aggregate([
        { $match: { garageId, createdAt: { $gte: thirtyDaysAgo }, deletedAt: { $exists: false } } },
        { $group: { _id: null, revenue: { $sum: '$billAmount' }, purchase: { $sum: '$spareTotal' } } }
      ]),
      Jobcard.aggregate([
        { $match: { garageId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, deletedAt: { $exists: false } } },
        { $group: { _id: null, revenue: { $sum: '$billAmount' }, purchase: { $sum: '$spareTotal' } } }
      ]),
      Jobcard.aggregate([
        { $match: { garageId, deletedAt: { $exists: false } } },
        { $group: { _id: null, pendingBalance: { $sum: '$balanceDue' } } }
      ])
    ]);

    const curr = current[0] || { revenue: 0, purchase: 0 };
    const prev = previous[0] || { revenue: 0, purchase: 0 };
    const pend = pending[0] || { pendingBalance: 0 };

    const revenueChange = prev.revenue > 0 ? Math.round(((curr.revenue - prev.revenue) / prev.revenue) * 100) : 0;
    const purchaseChange = prev.purchase > 0 ? Math.round(((curr.purchase - prev.purchase) / prev.purchase) * 100) : 0;

    res.json({
      revenue: curr.revenue,
      revenueChange,
      purchase: curr.purchase,
      purchaseChange,
      pendingBalance: pend.pendingBalance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const revenueChart = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const { period = 'weekly', startDate: qStart, endDate: qEnd } = req.query;
    const now = new Date();
    let startDate, endDate = null, groupFormat;

    if (qStart && qEnd) {
      // Custom From–To range. Group daily for spans up to ~90 days, else monthly.
      startDate = new Date(qStart); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(qEnd);   endDate.setHours(23, 59, 59, 999);
      const spanDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
      groupFormat = spanDays > 90 ? '%Y-%m' : '%Y-%m-%d';
    } else if (period === 'weekly') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      groupFormat = '%Y-%m-%d';
    } else {
      startDate = new Date(now - 180 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m';
    }

    const createdAt = { $gte: startDate };
    if (endDate) createdAt.$lte = endDate;

    const data = await Jobcard.aggregate([
      { $match: { garageId, createdAt, deletedAt: { $exists: false } } },
      { $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        spares: { $sum: '$spareTotal' },
        lubes: { $sum: '$lubeTotal' },
        jobs: { $sum: '$labourTotal' },
        revenue: { $sum: '$billAmount' }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({ period, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const vehicleMakeChart = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const data = await Jobcard.aggregate([
      { $match: { garageId, deletedAt: { $exists: false }, vehicleMake: { $exists: true, $ne: '' } } },
      { $group: { _id: '$vehicleMake', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    res.json(data.map(d => ({ name: d._id, value: d.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const closedJobcards = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const data = await Jobcard.aggregate([
      { $match: { garageId, statusCategory: 'Closed', createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json(data.map(d => ({ date: d._id, count: d.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const extendedSummary = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [todayStats, monthStats, openCount, totalCustomers, expenseMonth, csMonth] = await Promise.all([
      Jobcard.aggregate([
        { $match: { garageId, createdAt: { $gte: todayStart }, deletedAt: { $exists: false } } },
        { $group: { _id: null, revenue: { $sum: '$billAmount' }, count: { $sum: 1 } } }
      ]),
      Jobcard.aggregate([
        { $match: { garageId, createdAt: { $gte: monthStart }, deletedAt: { $exists: false } } },
        { $group: { _id: null, revenue: { $sum: '$billAmount' }, labour: { $sum: '$labourTotal' }, spare: { $sum: '$spareTotal' }, lube: { $sum: '$lubeTotal' }, count: { $sum: 1 } } }
      ]),
      Jobcard.countDocuments({ garageId, statusCategory: 'Open', deletedAt: { $exists: false } }),
      Customer.countDocuments({ garageId }),
      Expense.aggregate([
        { $match: { garageId, expenseDate: { $gte: monthStart }, active: { $ne: false } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      CounterSale.aggregate([
        { $match: { garageId, createdAt: { $gte: monthStart }, active: { $ne: false } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      today: { revenue: todayStats[0]?.revenue || 0, jobcards: todayStats[0]?.count || 0 },
      month: {
        revenue: monthStats[0]?.revenue || 0,
        labour:  monthStats[0]?.labour  || 0,
        spare:   monthStats[0]?.spare   || 0,
        lube:    monthStats[0]?.lube    || 0,
        jobcards: monthStats[0]?.count  || 0,
        expenses: expenseMonth[0]?.total || 0,
        counterSaleRevenue: csMonth[0]?.revenue || 0,
        counterSaleCount:   csMonth[0]?.count   || 0
      },
      openJobcards: openCount,
      totalCustomers
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const paymentBreakdown = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [jcTxns, csTxns] = await Promise.all([
      Jobcard.aggregate([
        { $match: { garageId, createdAt: { $gte: thirtyDaysAgo }, deletedAt: { $exists: false } } },
        { $unwind: '$transactions' },
        { $match: { 'transactions.type': { $ne: 'Refund' } } },
        { $group: { _id: '$transactions.paymentType', total: { $sum: '$transactions.amount' } } }
      ]),
      CounterSale.aggregate([
        { $match: { garageId, createdAt: { $gte: thirtyDaysAgo }, active: { $ne: false } } },
        { $unwind: '$transactions' },
        { $group: { _id: '$transactions.paymentType', total: { $sum: '$transactions.amount' } } }
      ])
    ]);

    const map = {};
    [...jcTxns, ...csTxns].forEach(r => {
      map[r._id] = (map[r._id] || 0) + r.total;
    });
    const modes = ['Cash', 'UPI', 'Card', 'Cheque'];
    res.json(modes.map(m => ({ mode: m, total: map[m] || 0 })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const recentOpenJobcards = async (req, res) => {
  try {
    const garageId = req.garage._id;
    const data = await Jobcard.find({ garageId, statusCategory: 'Open', deletedAt: { $exists: false } })
      .sort({ createdAt: -1 }).limit(8)
      .select('jobcardNumber customerName vehicleNo vehicleMake createdAt balanceDue statusLabel');
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { summary, revenueChart, vehicleMakeChart, closedJobcards, extendedSummary, paymentBreakdown, recentOpenJobcards };
