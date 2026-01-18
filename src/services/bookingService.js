const { query, getClient } = require('../config/database');
const { generateBookingReference } = require('../utils/helpers');
const { checkCarAvailability, updateCarStatus } = require('./availabilityService');
const notificationService = require('./notificationService');

/**
 * Create a new booking with transaction support
 */
async function createBooking(bookingData) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const { eventName, eventType, clientName, clientEmail, startDate, endDate, carIds, notes } = bookingData;

        // Step 1: Check all cars are available
        for (const carId of carIds) {
            const { isAvailable, conflicts } = await checkCarAvailability(carId, startDate, endDate);

            if (!isAvailable) {
                // Send conflict notification before rolling back
                await notificationService.sendConflictNotification(bookingData, carId, conflicts);
                throw {
                    code: 'BOOKING_CONFLICT',
                    message: `Car ${carId} is not available for the selected dates`,
                    conflicts
                };
            }
        }

        // Step 2: Generate booking reference
        const bookingReference = generateBookingReference();

        // Step 3: Create booking record
        const bookingQuery = `
            INSERT INTO bookings (booking_reference, event_name, event_type, client_name, client_email, start_date, end_date, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed')
            RETURNING *
        `;

        const bookingResult = await client.query(bookingQuery, [
            bookingReference,
            eventName,
            eventType,
            clientName,
            clientEmail,
            startDate,
            endDate,
            notes || null
        ]);

        const booking = bookingResult.rows[0];

        // Step 4: Link cars to booking
        for (const carId of carIds) {
            await client.query(
                'INSERT INTO booking_cars (booking_id, car_id) VALUES ($1, $2)',
                [booking.id, carId]
            );

            // Update car status
            await updateCarStatus(carId);
        }

        await client.query('COMMIT');

        // Step 5: Send notifications (outside transaction)
        await notificationService.sendBookingNotification('booking_created', booking);

        // Return booking with car details
        return await getBookingByReference(bookingReference);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating booking:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get booking by reference
 */
async function getBookingByReference(bookingReference) {
    try {
        const bookingQuery = `
            SELECT b.*,
                   json_agg(json_build_object(
                       'carId', ec.id,
                       'carNumber', ec.car_number,
                       'carName', ec.name,
                       'registration', ec.registration,
                       'currentRegion', ec.current_region
                   )) as cars
            FROM bookings b
            LEFT JOIN booking_cars bc ON b.id = bc.booking_id
            LEFT JOIN event_cars ec ON bc.car_id = ec.id
            WHERE b.booking_reference = $1
            GROUP BY b.id
        `;

        const result = await query(bookingQuery, [bookingReference]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error getting booking by reference:', error);
        throw error;
    }
}

/**
 * Get all bookings with filters
 */
async function getAllBookings(filters = {}) {
    try {
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (filters.status) {
            whereConditions.push(`b.status = $${paramIndex}`);
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.startDate) {
            whereConditions.push(`b.end_date >= $${paramIndex}`);
            params.push(filters.startDate);
            paramIndex++;
        }

        if (filters.endDate) {
            whereConditions.push(`b.start_date <= $${paramIndex}`);
            params.push(filters.endDate);
            paramIndex++;
        }

        if (filters.carId) {
            whereConditions.push(`bc.car_id = $${paramIndex}`);
            params.push(filters.carId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const bookingsQuery = `
            SELECT b.*,
                   json_agg(json_build_object(
                       'carId', ec.id,
                       'carNumber', ec.car_number,
                       'carName', ec.name,
                       'registration', ec.registration
                   )) as cars
            FROM bookings b
            LEFT JOIN booking_cars bc ON b.id = bc.booking_id
            LEFT JOIN event_cars ec ON bc.car_id = ec.id
            ${whereClause}
            GROUP BY b.id
            ORDER BY b.start_date DESC, b.created_at DESC
        `;

        const result = await query(bookingsQuery, params);
        return result.rows;
    } catch (error) {
        console.error('Error getting all bookings:', error);
        throw error;
    }
}

/**
 * Update a booking
 */
async function updateBooking(bookingReference, updateData) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Get current booking
        const currentBooking = await getBookingByReference(bookingReference);

        if (!currentBooking) {
            throw { code: 'NOT_FOUND', message: 'Booking not found' };
        }

        const { eventName, eventType, clientName, clientEmail, startDate, endDate, carIds, notes } = updateData;

        // If cars or dates are changing, check availability
        if (carIds || startDate || endDate) {
            const newCarIds = carIds || currentBooking.cars.map(c => c.carId);
            const newStartDate = startDate || currentBooking.start_date;
            const newEndDate = endDate || currentBooking.end_date;

            for (const carId of newCarIds) {
                const { isAvailable, conflicts } = await checkCarAvailability(
                    carId,
                    newStartDate,
                    newEndDate,
                    currentBooking.id
                );

                if (!isAvailable) {
                    throw {
                        code: 'BOOKING_CONFLICT',
                        message: `Car ${carId} is not available for the selected dates`,
                        conflicts
                    };
                }
            }
        }

        // Build update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (eventName) {
            updates.push(`event_name = $${paramIndex}`);
            params.push(eventName);
            paramIndex++;
        }

        if (eventType) {
            updates.push(`event_type = $${paramIndex}`);
            params.push(eventType);
            paramIndex++;
        }

        if (clientName) {
            updates.push(`client_name = $${paramIndex}`);
            params.push(clientName);
            paramIndex++;
        }

        if (clientEmail) {
            updates.push(`client_email = $${paramIndex}`);
            params.push(clientEmail);
            paramIndex++;
        }

        if (startDate) {
            updates.push(`start_date = $${paramIndex}`);
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            updates.push(`end_date = $${paramIndex}`);
            params.push(endDate);
            paramIndex++;
        }

        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex}`);
            params.push(notes);
            paramIndex++;
        }

        // Always update the updated_at timestamp
        updates.push(`updated_at = NOW()`);

        if (updates.length > 0) {
            params.push(bookingReference);
            const updateQuery = `
                UPDATE bookings
                SET ${updates.join(', ')}
                WHERE booking_reference = $${paramIndex}
                RETURNING *
            `;

            await client.query(updateQuery, params);
        }

        // Update car associations if needed
        if (carIds) {
            // Remove old associations
            await client.query('DELETE FROM booking_cars WHERE booking_id = $1', [currentBooking.id]);

            // Add new associations
            for (const carId of carIds) {
                await client.query(
                    'INSERT INTO booking_cars (booking_id, car_id) VALUES ($1, $2)',
                    [currentBooking.id, carId]
                );

                await updateCarStatus(carId);
            }

            // Update status of old cars
            for (const car of currentBooking.cars) {
                await updateCarStatus(car.carId);
            }
        }

        await client.query('COMMIT');

        // Send notification
        const updatedBooking = await getBookingByReference(bookingReference);
        await notificationService.sendBookingNotification('booking_edited', updatedBooking);

        return updatedBooking;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating booking:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Cancel a booking (soft delete)
 */
async function cancelBooking(bookingReference) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const booking = await getBookingByReference(bookingReference);

        if (!booking) {
            throw { code: 'NOT_FOUND', message: 'Booking not found' };
        }

        // Update status to Cancelled
        await client.query(
            'UPDATE bookings SET status = $1 WHERE booking_reference = $2',
            ['Cancelled', bookingReference]
        );

        // Update car statuses to free the calendar
        for (const car of booking.cars) {
            await updateCarStatus(car.carId);
        }

        await client.query('COMMIT');

        // Send notification
        await notificationService.sendBookingNotification('booking_cancelled', booking);

        return { message: 'Booking cancelled successfully' };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling booking:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    createBooking,
    getBookingByReference,
    getAllBookings,
    updateBooking,
    cancelBooking
};
