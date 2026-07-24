const express = require('express');
const router = express.Router();
const { list, create, update, remove } = require('../controllers/mastersController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/:entity', list);
router.post('/:entity', create);
router.put('/:entity/:id', update);
router.delete('/:entity/:id', remove);

module.exports = router;
