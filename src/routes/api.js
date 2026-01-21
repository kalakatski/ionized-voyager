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
    body('eventType')
        .notEmpty().withMessage('Event type is required')
        .isIn(['REDBULL_EVENT', 'THIRD_PARTY_EVENT', 'COLLEGE_FEST'])
        .withMessage('Event type must be one of: REDBULL_EVENT, THIRD_PARTY_EVENT, COLLEGE_FEST'),
    body('clientName').notEmpty().withMessage('Client name is required'),
    body('clientEmail').isEmail().withMessage('Valid client email is required'),
    body('startDate').custom(isValidDate).withMessage('Start date must be YYYY-MM-DD'),
    body('endDate').custom(isValidDate).withMessage('End date must be YYYY-MM-DD').custom((value, { req }) => {
        if (new Date(value) < new Date(req.body.startDate)) {
            throw new Error('End date must be after or equal to start date');
        }
        return true;
    }),
    body('carId').isInt({ min: 1 }).withMessage('A valid car ID must be selected')
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
// --- Debug & Seed Routes ---
router.get('/debug', async (req, res) => {
    try {
        const result = await dbQuery('SELECT * FROM event_cars ORDER BY id');
        res.json({
            count: result.rowCount,
            rows: result.rows,
            env: {
                node_env: process.env.NODE_ENV,
                host: process.env.DB_HOST ? 'Set' : 'Unset'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

router.post('/seed', async (req, res) => {
    try {
        // Check if cars exist
        const check = await dbQuery('SELECT COUNT(*) FROM event_cars');
        if (parseInt(check.rows[0].count) > 0) {
            return res.json({ message: 'Database is already seeded', count: check.rows[0].count });
        }

        const cars = [
            { car_number: 0, name: 'Event Car 0', registration: 'MH 02 FG 0232', current_region: 'West', status: 'Available' },
            { car_number: 1, name: 'Event Car 1', registration: 'MH 04 LE 5911', current_region: 'North', status: 'Available' },
            { car_number: 2, name: 'Event Car 2', registration: 'MH 04 LE 5912', current_region: 'East', status: 'Available' }
        ];

        for (const car of cars) {
            await dbQuery(
                `INSERT INTO event_cars (car_number, name, registration, current_region, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [car.car_number, car.name, car.registration, car.current_region, car.status]
            );
        }

        res.json({ message: 'Seeded successfully', cars });
    } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

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
