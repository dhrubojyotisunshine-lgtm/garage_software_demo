const express = require('express');
const router = express.Router();
const { register, verifyOtp, login, staffLogin, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/staff-login', staffLogin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
