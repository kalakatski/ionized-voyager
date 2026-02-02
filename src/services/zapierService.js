/**
 * Zapier Webhook Integration Service
 * Sends booking data to Zapier for automation workflows
 */

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/26287534/ul8i8lp/';

/**
 * Send booking data to Zapier webhook
 * @param {string} eventType - Type of event: 'booking_created', 'booking_approved', 'booking_rejected'
 * @param {object} bookingData - The booking data to send
 */
async function sendToZapier(eventType, bookingData) {
    try {
        const payload = {
            event_type: eventType,
            timestamp: new Date().toISOString(),
            booking: {
                reference: bookingData.booking_reference,
                event_name: bookingData.event_name,
                event_type: bookingData.event_type,
                client_name: bookingData.client_name,
                client_email: bookingData.client_email,
                start_date: bookingData.start_date,
                end_date: bookingData.end_date,
                city: bookingData.city || '',
                region: bookingData.region || '',
                car_id: bookingData.car_id,
                car_name: bookingData.car_name || `Event Car ${bookingData.car_id}`,
                status: bookingData.status,
                notes: bookingData.notes || ''
            }
        };

        console.log(`📤 Sending ${eventType} to Zapier...`);

        const response = await fetch(ZAPIER_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`✅ Zapier webhook sent successfully for ${eventType}`);
            return { success: true };
        } else {
            console.error(`❌ Zapier webhook failed: ${response.status} ${response.statusText}`);
            return { success: false, error: response.statusText };
        }
    } catch (error) {
        console.error('❌ Zapier webhook error:', error.message);
        // Don't throw - webhook failures shouldn't break the main flow
        return { success: false, error: error.message };
    }
}

/**
 * Send new booking notification to Zapier
 */
async function sendBookingCreated(bookingData) {
    return sendToZapier('booking_created', bookingData);
}

/**
 * Send booking approved notification to Zapier
 */
async function sendBookingApproved(bookingData) {
    return sendToZapier('booking_approved', bookingData);
}

/**
 * Send booking rejected notification to Zapier
 */
async function sendBookingRejected(bookingData) {
    return sendToZapier('booking_rejected', bookingData);
}

module.exports = {
    sendToZapier,
    sendBookingCreated,
    sendBookingApproved,
    sendBookingRejected
};
