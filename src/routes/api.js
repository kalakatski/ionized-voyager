const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

// Controllers
const carController = require('../controllers/carController');
const bookingController = require('../controllers/bookingController');
const calendarController = require('../controllers/calendarController');

// Routes
const regionRoutes = require('./regionRoutes');
const adminRoutes = require('./adminRoutes');

// Middleware
const { checkAdmin } = require('../middleware/authMiddleware');

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

// --- Region & City Routes ---
router.use('/', regionRoutes);

// --- Admin Routes ---
router.use('/admin', adminRoutes);

// --- Booking Routes ---
router.post('/bookings', checkAdmin, [
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

router.get('/migrate', async (req, res) => {
    try {
        await dbQuery('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT');
        res.json({ message: 'Migration successful: Added region column' });
    } catch (error) {
        res.status(500).json({ error: 'Migration failed: ' + error.message });
    }
});

// EMERGENCY DATABASE FIX ENDPOINT
router.get('/fix-db-schema', async (req, res) => {
    try {
        console.log('🔧 Running Emergency DB Fix...');
        const steps = [];

        // 1. Add approval columns
        await dbQuery(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100),
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT
        `);
        steps.push('Added approval columns');

        // 2. Fix client_name/user_name confusion if needed
        // We don't rename columns blindly, but we ensure at least one exists or we handle it in code.
        // Assuming code uses 'client_name', let's check if 'user_name' exists and 'client_name' does not, maybe rename?
        // Safe check: just ensure approval columns for now.

        res.json({
            success: true,
            message: 'Database schema fixed successfully!',
            steps: steps
        });
    } catch (error) {
        console.error('❌ DB Fix Failed:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// V2 Migration Endpoint (Inline SQL for serverless compatibility)
router.post('/migrate/v2', async (req, res) => {
    try {
        console.log('🚀 Starting V2 Migration...');

        // Execute migration steps
        const steps = [];

        // Step 1: Add image_url column
        await dbQuery('ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)');
        steps.push('Added image_url column to event_cars');

        // Step 2: Add is_static column
        await dbQuery('ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE');
        steps.push('Added is_static column to event_cars');

        // Step 3: Add city column to bookings
        await dbQuery('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
        steps.push('Added city column to bookings');

        // Step 4: Add region column to bookings (if not exists)
        await dbQuery('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region VARCHAR(50)');
        steps.push('Added region column to bookings');

        // Step 5: Update region constraints
        await dbQuery('ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_current_region_check');
        await dbQuery(`ALTER TABLE event_cars ADD CONSTRAINT event_cars_current_region_check 
                       CHECK (current_region IN ('North', 'West', 'South West', 'South East', 'East', 'South'))`);
        steps.push('Updated region constraints');

        // Step 6: Update car_number constraint
        await dbQuery('ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_car_number_check');
        await dbQuery('ALTER TABLE event_cars ADD CONSTRAINT event_cars_car_number_check CHECK (car_number >= 0 AND car_number <= 10)');
        steps.push('Updated car_number constraints');

        // Step 7: Add Event Car 4 (Static)
        const carCheck = await dbQuery('SELECT COUNT(*) FROM event_cars WHERE car_number = 3');
        if (parseInt(carCheck.rows[0].count) === 0) {
            await dbQuery(`INSERT INTO event_cars (car_number, name, registration, current_region, status, image_url, is_static, preferred_regions)
                           VALUES (3, 'Event Car 4 (Static)', '', 'West', 'Available', '/cars/car4.png', TRUE, ARRAY['North', 'West', 'South', 'East'])`);
            steps.push('Added Event Car 4 (Static)');
        } else {
            steps.push('Event Car 4 already exists (skipped)');
        }

        // Step 8: Add indexes
        await dbQuery('CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city)');
        await dbQuery('CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region)');
        steps.push('Added indexes for city and region');

        console.log('✅ V2 Migration completed successfully!');

        res.json({
            success: true,
            message: 'V2 Migration completed successfully',
            steps: steps
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            message: error.message
        });
    }
});

const notificationService = require('../services/notificationService');
router.get('/debug/email', async (req, res) => {
    try {
        const to = req.query.to; // Read from URL parameter
        if (!to) return res.status(400).json({ error: 'Recipient email required' });

        const result = await notificationService.sendEmail(
            to,
            'Juggernaut Test Email',
            `This is a test email from the Juggernaut Backend.\nUser: ${process.env.SMTP_USER}\nHost: ${process.env.SMTP_HOST}`
        );

        res.json({
            result,
            config: {
                host: process.env.SMTP_HOST,
                user: process.env.SMTP_USER ? '***' : 'missing',
                secure: process.env.SMTP_SECURE
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
