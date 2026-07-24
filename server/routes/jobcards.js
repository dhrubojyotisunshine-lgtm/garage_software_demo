const express = require('express');
const router = express.Router();
const {
  list, create, getById, update, remove, uploadPhotos, generatePdf
} = require('../controllers/jobcardController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.get('/', list);
router.post('/', create);
router.get('/:id/pdf', generatePdf);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/photos', upload.array('photos', 10), uploadPhotos);

module.exports = router;
