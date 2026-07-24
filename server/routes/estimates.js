const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { list, create, getById, update, remove, convertToJobcard } = require('../controllers/estimateController');

router.use(protect);

router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/convert', convertToJobcard);

module.exports = router;
