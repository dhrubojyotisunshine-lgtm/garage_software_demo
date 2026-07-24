const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/settingsUpload');
const {
  getSettings, updateProfile, updatePassword,
  updateJobcardSettings, updateBillingSettings, updateInventorySettings,
  updateUpi, uploadImage, getStaffUsers
} = require('../controllers/settingsController');

router.use(protect);

router.get('/', getSettings);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.put('/jobcard', updateJobcardSettings);
router.put('/billing', updateBillingSettings);
router.put('/inventory', updateInventorySettings);
router.put('/upi', updateUpi);
router.post('/upload/:type', upload.single('image'), uploadImage);
router.get('/staff-users', getStaffUsers);

module.exports = router;
