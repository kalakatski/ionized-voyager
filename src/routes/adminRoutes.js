const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Public route - admin login
router.post('/login', adminController.login);

// Protected routes - require admin authentication
router.get('/bookings', requireAdmin, adminController.getBookings);
router.post('/bookings/:id/approve', requireAdmin, adminController.approveBooking);
router.post('/bookings/:id/reject', requireAdmin, adminController.rejectBooking);
router.get('/stats', requireAdmin, adminController.getStats);

module.exports = router;
