const express = require('express');
const router = express.Router();
const { summary, revenueChart, vehicleMakeChart, closedJobcards, extendedSummary, paymentBreakdown, recentOpenJobcards } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/summary', summary);
router.get('/revenue-chart', revenueChart);
router.get('/vehicle-make', vehicleMakeChart);
router.get('/closed-jobcards', closedJobcards);
router.get('/extended-summary', extendedSummary);
router.get('/payment-breakdown', paymentBreakdown);
router.get('/recent-open', recentOpenJobcards);

module.exports = router;
