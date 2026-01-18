const { query } = require('../config/database');
const { updateCarStatus } = require('../services/availabilityService');

/**
 * Get all event cars
 */
async function getAllCars(req, res) {
    try {
        const result = await query('SELECT * FROM event_cars ORDER BY car_number');
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting cars:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get single car by ID
 */
async function getCarById(req, res) {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM event_cars WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting car:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Update car location
 */
async function updateCarLocation(req, res) {
    try {
        const { id } = req.params;
        const { region, location } = req.body;

        if (!region && !location) {
            return res.status(400).json({ error: 'Region or location is required' });
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (region) {
            if (!['West', 'North', 'East', 'South'].includes(region)) {
                return res.status(400).json({ error: 'Invalid region' });
            }
            updates.push(`current_region = $${paramIndex}`);
            params.push(region);
            paramIndex++;
        }

        if (location) {
            updates.push(`current_location = $${paramIndex}`);
            params.push(location);
            paramIndex++;
        }

        params.push(id);

        const updateQuery = `
            UPDATE event_cars
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await query(updateQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating car location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Update car status manually
 */
async function updateCarStatusManual(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Available', 'In Service', 'Breakdown'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Note: 'Booked' status is managed automatically by bookings
        const result = await query(
            'UPDATE event_cars SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }

        // If setting to available, we should re-check if it should actually be 'Booked'
        if (status === 'Available') {
            const calculatedStatus = await updateCarStatus(id);
            if (calculatedStatus !== 'Available') {
                // Return the actual calculated status
                const updatedCar = await query('SELECT * FROM event_cars WHERE id = $1', [id]);
                return res.json(updatedCar.rows[0]);
            }
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating car status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getAllCars,
    getCarById,
    updateCarLocation,
    updateCarStatusManual
};
