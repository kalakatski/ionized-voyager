const { query, getClient } = require('../config/database');
const { generateBookingReference } = require('../utils/helpers');
const { checkCarAvailability, updateCarStatus } = require('./availabilityService');
const notificationService = require('./notificationService');
const { validateBookingRegionCity } = require('../utils/cityValidation');

/**
 * Create a new booking with transaction support
 * UPDATED: Each booking now references exactly ONE car_id
 * UPDATED: Supports admin auto-approval workflow
 */
async function createBooking(bookingData, isAdmin = false) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const { eventName, eventType, clientName, clientEmail, startDate, endDate, carId, region, city, notes } = bookingData;

        // Step 1: Validate region and city
        const validation = validateBookingRegionCity({ region, city });
        if (!validation.valid) {
            throw {
                code: 'VALIDATION_ERROR',
                message: validation.error
            };
        }

        // Step 2: Check car is available
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

        // Step 3: Generate booking reference
        const bookingReference = generateBookingReference();

        // Step 4: Determine booking status (auto-approve for admins, pending for regular users)
        const bookingStatus = isAdmin ? 'approved' : 'pending';
        const approvedBy = isAdmin ? 'admin' : null;
        const approvedAt = isAdmin ? new Date() : null;

        // Step 5: Create booking record with car_id, city, and approval status
        const bookingQuery = `
            INSERT INTO bookings (
                booking_reference, event_name, event_type, client_name, client_email, 
                car_id, start_date, end_date, notes, region, city, 
                status, approved_by, approved_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const bookingResult = await client.query(bookingQuery, [
            bookingReference,
            eventName,
            eventType,
            clientName,
            clientEmail,
            carId,
            startDate,
            endDate,
            notes || null,
            region,
            city,
            bookingStatus,
            approvedBy,
            approvedAt
        ]);

        const booking = bookingResult.rows[0];

        // Step 6: Update car status
        await updateCarStatus(carId);

        await client.query('COMMIT');

        // Step 7: Send notifications (outside transaction)
        // Different email depending on approval status
        if (isAdmin) {
            // Admin created booking - send confirmation immediately
            await notificationService.sendBookingNotification('booking_created', booking);
        } else {
            // Regular user - send admin notification about pending booking
            await notificationService.sendAdminNotification('booking_pending', booking);
        }

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
 * UPDATED: Uses direct car_id join instead of booking_cars junction table
 */
async function getBookingByReference(bookingReference) {
    try {
        const bookingQuery = `
            SELECT b.*,
                   json_build_object(
                       'carId', ec.id,
                       'carNumber', ec.car_number,
                       'carName', ec.name,
                       'registration', ec.registration,
                       'currentRegion', ec.current_region
                   ) as car
            FROM bookings b
            LEFT JOIN event_cars ec ON b.car_id = ec.id
            WHERE b.booking_reference = $1
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
 * UPDATED: Uses direct car_id join instead of booking_cars junction table
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
            whereConditions.push(`b.car_id = $${paramIndex}`);
            params.push(filters.carId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const bookingsQuery = `
            SELECT b.*,
                   json_build_object(
                       'carId', ec.id,
                       'carNumber', ec.car_number,
                       'carName', ec.name,
                       'registration', ec.registration
                   ) as car
            FROM bookings b
            LEFT JOIN event_cars ec ON b.car_id = ec.id
            ${whereClause}
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
 * UPDATED: Handles single carId instead of carIds array
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

        const { eventName, eventType, clientName, clientEmail, startDate, endDate, carId, notes } = updateData;

        // If car or dates are changing, check availability
        if (carId || startDate || endDate) {
            const newCarId = carId || currentBooking.car_id;
            const newStartDate = startDate || currentBooking.start_date;
            const newEndDate = endDate || currentBooking.end_date;

            const { isAvailable, conflicts } = await checkCarAvailability(
                newCarId,
                newStartDate,
                newEndDate,
                currentBooking.id
            );

            if (!isAvailable) {
                throw {
                    code: 'BOOKING_CONFLICT',
                    message: `Car ${newCarId} is not available for the selected dates`,
                    conflicts
                };
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

        if (carId) {
            updates.push(`car_id = $${paramIndex}`);
            params.push(carId);
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

        // Update car statuses if car changed
        if (carId && carId !== currentBooking.car_id) {
            // Update both old and new car statuses
            await updateCarStatus(currentBooking.car_id);
            await updateCarStatus(carId);
        } else if (carId) {
            // Just update current car status
            await updateCarStatus(carId);
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
 * UPDATED: Works with single car_id
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

        // Update car status to free the calendar
        if (booking.car_id) {
            await updateCarStatus(booking.car_id);
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
