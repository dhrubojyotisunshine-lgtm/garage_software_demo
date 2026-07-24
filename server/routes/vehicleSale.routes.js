const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/vehicleSale.controller');

router.use(protect);

router.get('/', ctrl.list);
router.get('/reports/summary', ctrl.summary);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.post('/:id/payments', ctrl.addPayment);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
