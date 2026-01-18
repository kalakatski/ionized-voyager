const bookingService = require('../services/bookingService');
const { validationResult } = require('express-validator');

/**
 * Create new booking
 */
async function createBooking(req, res) {
    try {
        // Validation check
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const booking = await bookingService.createBooking(req.body);
        res.status(201).json(booking);

    } catch (error) {
        if (error.code === 'BOOKING_CONFLICT') {
            return res.status(409).json({
                error: 'Booking conflict detected',
                message: error.message,
                conflicts: error.conflicts
            });
        }

        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
}

/**
 * Get all bookings
 */
async function getBookings(req, res) {
    try {
        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            carId: req.query.carId
        };

        const bookings = await bookingService.getAllBookings(filters);
        res.json(bookings);

    } catch (error) {
        console.error('Error getting bookings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get booking by reference
 */
async function getBooking(req, res) {
    try {
        const { reference } = req.params;
        const booking = await bookingService.getBookingByReference(reference);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(booking);

    } catch (error) {
        console.error('Error getting booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Update booking
 */
async function updateBooking(req, res) {
    try {
        const booking = await bookingService.updateBooking(req.params.reference, req.body);
        res.json(booking);

    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (error.code === 'BOOKING_CONFLICT') {
            return res.status(409).json({
                error: 'Booking update conflict detected',
                message: error.message,
                conflicts: error.conflicts
            });
        }

        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Cancel booking
 */
async function cancelBooking(req, res) {
    try {
        const result = await bookingService.cancelBooking(req.params.reference);
        res.json(result);

    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Booking not found' });
        }

        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createBooking,
    getBookings,
    getBooking,
    updateBooking,
    cancelBooking
};
