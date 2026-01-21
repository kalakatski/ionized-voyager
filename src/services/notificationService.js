const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const { formatDate } = require('../utils/helpers');

// Email configuration from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@redbull.com').split(',');
const OPERATIONS_EMAILS = (process.env.OPERATIONS_EMAILS || 'operations@redbull.com').split(',');

const INTERNAL_RECIPIENTS = [
    "Karan.Kalyaniwalla@redbull.com",
    "joshua.cherian@redbull.com"
];

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

/**
 * Send email
 * UPDATED: Returns status for proper logging
 */
async function sendEmail(to, subject, body, cc = []) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@redbulljuggernaut.com',
            to,
            cc,
            subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId, error: null };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, messageId: null, error: error.message };
    }
}

/**
 * Log notification to database
 * UPDATED: Enhanced with booking_id, all_recipients, and error tracking
 */
async function logNotification(type, recipientEmail, recipientType, bookingId, bookingReference, subject, body, status = 'sent', errorMessage = null, allRecipients = null) {
    try {
        await query(
            `INSERT INTO notifications (notification_type, recipient_email, recipient_type, booking_id, booking_reference, subject, body, status, error_message, all_recipients)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [type, recipientEmail, recipientType, bookingId, bookingReference, subject, body, status, errorMessage, allRecipients]
        );
    } catch (error) {
        console.error('Error logging notification:', error);
        // Don't throw - logging failure shouldn't stop the process
    }
}

/**
 * Get cars for a booking
 */
async function getBookingCars(bookingId) {
    const result = await query(
        `SELECT ec.* FROM event_cars ec
         INNER JOIN booking_cars bc ON ec.id = bc.car_id
         WHERE bc.booking_id = $1`,
        [bookingId]
    );
    return result.rows;
}

/**
 * Generate client booking email
 */
function generateClientBookingEmail(booking, cars, action) {
    const viewLink = `${process.env.BASE_URL}/booking/${booking.booking_reference}`;
    const carsList = cars.map(c => `${c.name} (${c.registration})`).join('\n        ');

    let actionText = '';
    switch (action) {
        case 'created':
            actionText = 'confirmed';
            break;
        case 'updated':
            actionText = 'updated';
            break;
        case 'cancelled':
            actionText = 'cancelled';
            break;
    }

    return `
Hi ${booking.client_name},

Your booking has been ${actionText}.

Booking Details:
----------------
Booking Reference: ${booking.booking_reference}
Event Name: ${booking.event_name}
Event Type: ${booking.event_type}
Dates: ${formatDate(booking.start_date)} to ${formatDate(booking.end_date)}

Event Cars:
${carsList}

${action !== 'cancelled' ? `View your booking: ${viewLink}` : ''}

${action === 'created' ? 'Please save this booking reference for future correspondence.' : ''}

Best regards,
Red Bull Juggernaut Team
    `.trim();
}

/**
 * Generate admin booking email
 */
function generateAdminBookingEmail(booking, cars, action) {
    const carsList = cars.map(c => `${c.name} (${c.registration}) - Region: ${c.current_region}`).join('\n        ');

    let actionText = '';
    switch (action) {
        case 'created':
            actionText = 'New Booking Created';
            break;
        case 'updated':
            actionText = 'Booking Updated';
            break;
        case 'cancelled':
            actionText = 'Booking Cancelled';
            break;
        case 'upcoming':
            actionText = 'Upcoming Booking Reminder';
            break;
    }

    return `
${actionText}

Booking Details:
----------------
Booking Reference: ${booking.booking_reference}
Status: ${booking.status}

Event Information:
------------------
Event Name: ${booking.event_name}
Event Type: ${booking.event_type}
Dates: ${formatDate(booking.start_date)} to ${formatDate(booking.end_date)}

Client Information:
-------------------
Name: ${booking.client_name}
Email: ${booking.client_email}

Event Cars:
-----------
${carsList}

${booking.notes ? `Notes:\n${booking.notes}` : ''}

Created: ${new Date(booking.created_at).toLocaleString('en-IN')}
${booking.updated_at !== booking.created_at ? `Last Updated: ${new Date(booking.updated_at).toLocaleString('en-IN')}` : ''}

---
Red Bull Juggernaut Booking System
    `.trim();
}

/**
 * Send booking notification
 * UPDATED: Handles single car, enhanced email logging with status tracking
 */
async function sendBookingNotification(type, booking) {
    try {
        // Get car information - booking now has car_id directly
        const car = booking.car || { name: 'Unknown', registration: 'N/A', current_region: 'N/A' };
        const carInfo = [car]; // Wrap in array for email template compatibility

        let subject, clientBody, adminBody;

        switch (type) {
            case 'booking_created':
                subject = `Booking Confirmed - ${booking.booking_reference}`;
                clientBody = generateClientBookingEmail(booking, carInfo, 'created');
                adminBody = generateAdminBookingEmail(booking, carInfo, 'created');
                break;

            case 'booking_edited':
                subject = `Booking Updated - ${booking.booking_reference}`;
                clientBody = generateClientBookingEmail(booking, carInfo, 'updated');
                adminBody = generateAdminBookingEmail(booking, carInfo, 'updated');
                break;

            case 'booking_cancelled':
                subject = `Booking Cancelled - ${booking.booking_reference}`;
                clientBody = generateClientBookingEmail(booking, carInfo, 'cancelled');
                adminBody = generateAdminBookingEmail(booking, carInfo, 'cancelled');
                break;
        }

        // Send single email with client in TO and internal in CC
        // We use adminBody for everyone to ensure all recipients have full context
        const allRecipients = [booking.client_email, ...INTERNAL_RECIPIENTS].join(', ');
        const emailResult = await sendEmail(booking.client_email, subject, adminBody, INTERNAL_RECIPIENTS);

        const status = emailResult.success ? 'sent' : 'failed';
        const errorMessage = emailResult.error || null;

        // Log for client
        await logNotification(
            type,
            booking.client_email,
            'client',
            booking.id,
            booking.booking_reference,
            subject,
            adminBody,
            status,
            errorMessage,
            allRecipients
        );

        // Log for internal recipients
        for (const email of INTERNAL_RECIPIENTS) {
            await logNotification(
                type,
                email,
                'admin',
                booking.id,
                booking.booking_reference,
                subject,
                adminBody,
                status,
                errorMessage,
                allRecipients
            );
        }

        if (emailResult.success) {
            console.log(`✓ Notifications sent for ${type}: ${booking.booking_reference} to ${allRecipients}`);
        } else {
            console.error(`✗ Notification failed for ${type}: ${booking.booking_reference}. Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error sending booking notification:', error);
        // Don't throw - notification failure shouldn't break the booking process
    }
}

/**
 * Send conflict notification
 */
async function sendConflictNotification(bookingData, carId, conflicts) {
    try {
        const carResult = await query('SELECT * FROM event_cars WHERE id = $1', [carId]);
        const car = carResult.rows[0];

        const subject = `Booking Conflict Detected - ${car.name}`;

        const conflictsList = conflicts.map(c => {
            if (c.type === 'booking') {
                return `  - Booking ${c.booking_reference} (${c.event_name}): ${formatDate(c.start_date)} to ${formatDate(c.end_date)}`;
            } else {
                return `  - ${c.block_reason} Block: ${formatDate(c.start_date)} to ${formatDate(c.end_date)}${c.block_details ? ` - ${c.block_details}` : ''}`;
            }
        }).join('\n');

        const body = `
A booking attempt was blocked due to conflicts:

Attempted Booking:
------------------
Event: ${bookingData.eventName}
Event Type: ${bookingData.eventType}
Client: ${bookingData.clientName} (${bookingData.clientEmail})
Dates: ${formatDate(bookingData.startDate)} to ${formatDate(bookingData.endDate)}

Car: ${car.name} (${car.registration})
Current Location: ${car.current_location}, ${car.current_region}

Conflicts Found:
----------------
${conflictsList}

This booking was automatically rejected. Please contact the client if needed.

---
Red Bull Juggernaut Booking System
        `.trim();

        // Send to admin only
        for (const email of ADMIN_EMAILS) {
            await sendEmail(email, subject, body);
            await logNotification('conflict_detected', email, 'admin', null, subject, body);
        }

        console.log(`✓ Conflict notification sent for car ${carId}`);
    } catch (error) {
        console.error('Error sending conflict notification:', error);
    }
}

/**
 * Send upcoming booking reminders (to be called by scheduled job)
 */
async function sendUpcomingBookingReminders() {
    try {
        const { addDays } = require('../utils/helpers');
        const reminderDays = parseInt(process.env.REMINDER_DAYS || '3');
        const reminderDate = addDays(new Date(), reminderDays);
        const reminderDateStr = reminderDate.toISOString().split('T')[0];

        const upcomingBookingsResult = await query(
            `SELECT * FROM bookings WHERE status = 'Confirmed' AND start_date = $1`,
            [reminderDateStr]
        );

        for (const booking of upcomingBookingsResult.rows) {
            const cars = await getBookingCars(booking.id);
            const subject = `Reminder: Booking in ${reminderDays} days - ${booking.booking_reference}`;
            const body = generateAdminBookingEmail(booking, cars, 'upcoming');

            // Send to client in TO and internal in CC
            await sendEmail(booking.client_email, subject, body, INTERNAL_RECIPIENTS);

            // Log for client
            await logNotification('booking_reminder', booking.client_email, 'client', booking.booking_reference, subject, body);

            // Log for internal recipients
            for (const email of INTERNAL_RECIPIENTS) {
                await logNotification('booking_reminder', email, 'admin', booking.booking_reference, subject, body);
            }
        }

        console.log(`✓ Sent ${upcomingBookingsResult.rows.length} reminder notifications`);
    } catch (error) {
        console.error('Error sending reminders:', error);
    }
}

module.exports = {
    sendEmail,
    sendBookingNotification,
    sendConflictNotification,
    sendUpcomingBookingReminders
};
