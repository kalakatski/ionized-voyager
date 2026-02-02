const pool = require('../config/database');
const { generateToken } = require('../middleware/authMiddleware');
const { sendEmail, generateEmailTemplate } = require('../services/notificationService');

/**
 * Admin login - verify password and issue JWT token
 */
exports.login = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        // Check against environment variable
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT token
        const token = generateToken('admin');

        res.json({
            success: true,
            token,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Get all bookings with optional status filter
 */
exports.getBookings = async (req, res) => {
    try {
        const { status } = req.query;

        // Select all columns to avoid column name mismatches
        let query = `
      SELECT 
        b.*,
        ec.name as car_name
      FROM bookings b
      LEFT JOIN event_cars ec ON b.car_id = ec.id
    `;

        const params = [];

        // Only filter by status if the column exists
        if (status) {
            query += ' WHERE b.status = $1';
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            bookings: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        // Log the actual error for debugging
        console.error('SQL Error details:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }
};

/**
 * Approve a pending booking
 */
exports.approveBooking = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Get booking details
        const bookingResult = await client.query(
            `SELECT b.*, ec.name as car_name 
       FROM bookings b
       LEFT JOIN event_cars ec ON b.car_id = ec.id
       WHERE b.id = $1`,
            [id]
        );

        if (bookingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResult.rows[0];

        if (booking.status === 'approved') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Booking is already approved' });
        }

        // Update booking status
        await client.query(
            `UPDATE bookings 
       SET status = 'approved', 
           approved_by = 'admin', 
           approved_at = NOW()
       WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        // Send approval confirmation email to user
        /* TEMPORARILY DISABLED FOR DEBUGGING
        try {
            const emailContent = generateEmailTemplate('booking_approved', {
                userName: booking.client_name,
                eventName: booking.event_name,
                carName: booking.car_name,
                startDate: booking.start_date,
                endDate: booking.end_date,
                city: booking.city || '',
                region: booking.region || ''
            });

            await sendEmail(
                booking.client_email,
                emailContent.subject,
                emailContent.body
            );
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't fail the approval if email fails
        }
        */

        res.json({
            success: true,
            message: 'Booking approved successfully',
            booking: {
                ...booking,
                status: 'approved',
                approved_by: 'admin',
                approved_at: new Date()
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving booking:', error);
        res.status(500).json({ error: 'Failed to approve booking' });
    } finally {
        client.release();
    }
};

/**
 * Reject a pending booking
 */
exports.rejectBooking = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { reason } = req.body;

        await client.query('BEGIN');

        // Get booking details
        const bookingResult = await client.query(
            `SELECT b.*, ec.name as car_name 
       FROM bookings b
       LEFT JOIN event_cars ec ON b.car_id = ec.id
       WHERE b.id = $1`,
            [id]
        );

        if (bookingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResult.rows[0];

        // Update booking status
        await client.query(
            `UPDATE bookings 
       SET status = 'rejected', 
           approved_by = 'admin', 
           approved_at = NOW(),
           rejection_reason = $2
       WHERE id = $1`,
            [id, reason || 'No reason provided']
        );

        await client.query('COMMIT');

        // Send rejection email to user
        /* TEMPORARILY DISABLED FOR DEBUGGING
        try {
            const emailContent = generateEmailTemplate('booking_rejected', {
                userName: booking.client_name,
                eventName: booking.event_name,
                carName: booking.car_name,
                startDate: booking.start_date,
                endDate: booking.end_date,
                reason: reason || 'The booking could not be approved at this time.'
            });

            await sendEmail(
                booking.client_email,
                emailContent.subject,
                emailContent.body
            );
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
            // Don't fail the rejection if email fails
        }
        */

        res.json({
            success: true,
            message: 'Booking rejected successfully',
            booking: {
                ...booking,
                status: 'rejected',
                approved_by: 'admin',
                approved_at: new Date(),
                rejection_reason: reason
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting booking:', error);
        res.status(500).json({ error: 'Failed to reject booking' });
    } finally {
        client.release();
    }
};

/**
 * Get admin dashboard stats
 */
exports.getStats = async (req, res) => {
    try {
        const statsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM bookings
      GROUP BY status
    `);

        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0
        };

        statsResult.rows.forEach(row => {
            stats[row.status] = parseInt(row.count);
        });

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
