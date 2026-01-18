const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

// Controllers
const carController = require('../controllers/carController');
const bookingController = require('../controllers/bookingController');
const calendarController = require('../controllers/calendarController');

// Helper for date validation
const isValidDate = (value) => {
    if (!value) return true; // Optional fields handled separately
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
    }
    return true;
};

// --- Car Routes ---
router.get('/cars', carController.getAllCars);
router.get('/cars/:id', carController.getCarById);
router.put('/cars/:id/location', carController.updateCarLocation);
router.put('/cars/:id/status', carController.updateCarStatusManual);

// --- Booking Routes ---
router.post('/bookings', [
    body('eventName').notEmpty().withMessage('Event name is required'),
    body('eventType').notEmpty().withMessage('Event type is required'),
    body('clientName').notEmpty().withMessage('Client name is required'),
    body('clientEmail').isEmail().withMessage('Valid client email is required'),
    body('startDate').custom(isValidDate).withMessage('Start date must be YYYY-MM-DD'),
    body('endDate').custom(isValidDate).withMessage('End date must be YYYY-MM-DD').custom((value, { req }) => {
        if (new Date(value) < new Date(req.body.startDate)) {
            throw new Error('End date must be after or equal to start date');
        }
        return true;
    }),
    body('carIds').isArray({ min: 1 }).withMessage('At least one car must be selected')
], bookingController.createBooking);

router.get('/bookings', bookingController.getBookings);
router.get('/bookings/:reference', bookingController.getBooking);
router.put('/bookings/:reference', bookingController.updateBooking);
router.patch('/bookings/:reference/cancel', bookingController.cancelBooking);
router.delete('/bookings/:reference', bookingController.cancelBooking);

// --- Calendar & Block Routes ---
router.get('/calendar', calendarController.getCalendar);
router.post('/availability/check', calendarController.checkAvailability);

router.post('/blocks', [
    body('carId').isInt(),
    body('startDate').custom(isValidDate),
    body('endDate').custom(isValidDate),
    body('blockReason').isIn(['Service', 'Breakdown', 'Manual'])
], calendarController.createBlock);

router.get('/blocks', calendarController.getBlocks);
router.delete('/blocks/:id', calendarController.deleteBlock);

// --- Notification Routes (Audit Only) ---
// Simple read-only endpoint for checking notifications
const { query: dbQuery } = require('../config/database');
router.get('/notifications', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const result = await dbQuery('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT $1', [limit]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
