const { query, getClient, isMockMode } = require('../config/database');

/**
 * Check if a car is available for a date range
 * Returns availability status and conflicts if any
 */
async function checkCarAvailability(carId, startDate, endDate, excludeBookingId = null) {
    try {
        // Check for booking conflicts
        const bookingQuery = `
            SELECT b.id, b.booking_reference, b.event_name, b.start_date, b.end_date
            FROM bookings b
            INNER JOIN booking_cars bc ON b.id = bc.booking_id
            WHERE bc.car_id = $1
              AND b.status = 'Confirmed'
              AND ($2::integer IS NULL OR b.id != $2::integer)
              AND (
                  (b.start_date <= $4 AND b.end_date >= $3) OR
                  (b.start_date <= $3 AND b.end_date >= $3) OR
                  (b.start_date >= $3 AND b.end_date <= $4)
              )
        `;

        const bookingResult = await query(bookingQuery, [carId, excludeBookingId, startDate, endDate]);

        // Check for date block conflicts
        const blockQuery = `
            SELECT id, block_reason, block_details, start_date, end_date
            FROM date_blocks
            WHERE car_id = $1
              AND (
                  (start_date <= $3 AND end_date >= $2) OR
                  (start_date <= $2 AND end_date >= $2) OR
                  (start_date >= $2 AND end_date <= $3)
              )
        `;

        const blockResult = await query(blockQuery, [carId, startDate, endDate]);

        const conflicts = [
            ...bookingResult.rows.map(row => ({
                type: 'booking',
                ...row
            })),
            ...blockResult.rows.map(row => ({
                type: 'block',
                ...row
            }))
        ];

        return {
            isAvailable: conflicts.length === 0,
            conflicts
        };
    } catch (error) {
        console.error('Error checking car availability:', error);
        throw error;
    }
}

/**
 * Get availability for a specific car over a date range
 */
async function getCarAvailability(carId, startDate, endDate) {
    try {
        const { generateDateArray } = require('../utils/helpers');
        const dates = generateDateArray(startDate, endDate);
        const availability = [];

        for (const date of dates) {
            // Check bookings for this date
            const bookingQuery = `
                SELECT b.booking_reference, b.event_name, b.event_type, b.client_name
                FROM bookings b
                INNER JOIN booking_cars bc ON b.id = bc.booking_id
                WHERE bc.car_id = $1
                  AND b.status = 'Confirmed'
                  AND b.start_date <= $2
                  AND b.end_date >= $2
                LIMIT 1
            `;

            const bookingResult = await query(bookingQuery, [carId, date]);

            // Check blocks for this date
            const blockQuery = `
                SELECT block_reason, block_details
                FROM date_blocks
                WHERE car_id = $1
                  AND start_date <= $2
                  AND end_date >= $2
                LIMIT 1
            `;

            const blockResult = await query(blockQuery, [carId, date]);

            availability.push({
                date,
                isAvailable: bookingResult.rows.length === 0 && blockResult.rows.length === 0,
                booking: bookingResult.rows[0] || null,
                block: blockResult.rows[0] || null
            });
        }

        return availability;
    } catch (error) {
        console.error('Error getting car availability:', error);
        throw error;
    }
}

/**
 * Update car status based on current bookings and blocks
 */
async function updateCarStatus(carId) {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Check for active blocks
        const blockQuery = `
            SELECT block_reason
            FROM date_blocks
            WHERE car_id = $1
              AND start_date <= $2
              AND end_date >= $2
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const blockResult = await query(blockQuery, [carId, today]);

        if (blockResult.rows.length > 0) {
            const reason = blockResult.rows[0].block_reason;
            let status = 'Available';

            if (reason === 'Service') {
                status = 'In Service';
            } else if (reason === 'Breakdown') {
                status = 'Breakdown';
            }

            await query('UPDATE event_cars SET status = $1 WHERE id = $2', [status, carId]);
            return status;
        }

        // Check for active bookings
        const bookingQuery = `
            SELECT COUNT(*) as count
            FROM bookings b
            INNER JOIN booking_cars bc ON b.id = bc.booking_id
            WHERE bc.car_id = $1
              AND b.status = 'Confirmed'
              AND b.start_date <= $2
              AND b.end_date >= $2
        `;

        const bookingResult = await query(bookingQuery, [carId, today]);

        const status = bookingResult.rows[0].count > 0 ? 'Booked' : 'Available';
        await query('UPDATE event_cars SET status = $1 WHERE id = $2', [status, carId]);

        return status;
    } catch (error) {
        console.error('Error updating car status:', error);
        throw error;
    }
}

/**
 * Get unified calendar view for all cars
 */
async function getUnifiedCalendar(startDate, endDate) {
    try {
        let cars;
        if (isMockMode()) {
            cars = [
                { id: 1, car_number: 0, name: 'Event Car 0', registration: 'REDBULL-0', current_region: 'EU North', status: 'Available' },
                { id: 2, car_number: 1, name: 'Event Car 1', registration: 'REDBULL-1', current_region: 'EU West', status: 'Available' },
                { id: 3, car_number: 2, name: 'Event Car 2', registration: 'REDBULL-2', current_region: 'EU East', status: 'Available' }
            ];
        } else {
            // Get all cars
            const carsResult = await query('SELECT * FROM event_cars ORDER BY car_number');
            cars = carsResult.rows;
        }

        const calendar = [];

        for (const car of cars) {
            const availability = await getCarAvailability(car.id || car.carId, startDate, endDate);

            calendar.push({
                carId: car.id || car.carId,
                carNumber: car.car_number || car.carNumber,
                carName: car.name || car.carName,
                registration: car.registration,
                currentRegion: car.current_region || car.currentRegion,
                currentLocation: car.current_location || car.currentLocation,
                status: car.status,
                preferredRegions: car.preferred_regions || car.preferredRegions,
                availability
            });
        }

        return calendar;
    } catch (error) {
        console.error('Error getting unified calendar:', error);
        throw error;
    }
}

module.exports = {
    checkCarAvailability,
    getCarAvailability,
    updateCarStatus,
    getUnifiedCalendar
};
