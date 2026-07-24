const express = require('express');
const router  = express.Router();
const { list, search, create, update, getById, addNote, setFollowUp } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',         list);
router.get('/search',   search);
router.get('/:id',      getById);
router.post('/',        create);
router.put('/:id',      update);
router.post('/:id/notes',    addNote);
router.put('/:id/followup',  setFollowUp);

module.exports = router;
