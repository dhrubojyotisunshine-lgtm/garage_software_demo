const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/ledger.controller');

// Auth gate only — matches every other module. No tenant scoping by design.
router.use(protect);

router.get('/', ctrl.list);
router.get('/by-party/:partyId', ctrl.partyLedgerById);
router.get('/party/:name', ctrl.partyLedger);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
