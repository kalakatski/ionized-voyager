const availabilityService = require('../services/availabilityService');
const { query } = require('../config/database');

/**
 * Get unified calendar view
 */
async function getCalendar(req, res) {
    try {
        // Default to current month if no dates provided
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startDate = req.query.startDate || startOfMonth.toISOString().split('T')[0];
        const endDate = req.query.endDate || endOfMonth.toISOString().split('T')[0];

        const calendar = await availabilityService.getUnifiedCalendar(startDate, endDate);

        // Add Caching Headers (Cache for 60s, serve stale up to 30s)
        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

        res.json(calendar);

    } catch (error) {
        console.error('Error getting calendar:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Check availability for specific cars
 */
async function checkAvailability(req, res) {
    try {
        const { carIds, startDate, endDate } = req.body;

        if (!carIds || !Array.isArray(carIds) || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const results = {};
        let allAvailable = true;

        for (const carId of carIds) {
            const { isAvailable, conflicts } = await availabilityService.checkCarAvailability(carId, startDate, endDate);

            results[carId] = {
                isAvailable,
                conflicts: isAvailable ? [] : conflicts
            };

            if (!isAvailable) allAvailable = false;
        }

        res.json({
            allAvailable,
            details: results
        });

    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Create date block
 */
async function createBlock(req, res) {
    try {
        const { carId, startDate, endDate, blockReason, blockDetails } = req.body;

        // Validate inputs
        if (!carId || !startDate || !endDate || !blockReason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['Service', 'Breakdown', 'Manual'].includes(blockReason)) {
            return res.status(400).json({ error: 'Invalid block reason' });
        }

        // Create block
        const result = await query(
            `INSERT INTO date_blocks (car_id, start_date, end_date, block_reason, block_details)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [carId, startDate, endDate, blockReason, blockDetails]
        );

        // Update car status
        await availabilityService.updateCarStatus(carId);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating block:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get date blocks
 */
async function getBlocks(req, res) {
    try {
        const { carId, activeOnly } = req.query;
        let queryText = 'SELECT * FROM date_blocks';
        const params = [];
        const conditions = [];

        if (carId) {
            conditions.push(`car_id = $${params.length + 1}`);
            params.push(carId);
        }

        if (activeOnly === 'true') {
            conditions.push(`end_date >= CURRENT_DATE`);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        queryText += ' ORDER BY start_date DESC';

        const result = await query(queryText, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Error getting blocks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Delete date block
 */
async function deleteBlock(req, res) {
    try {
        const { id } = req.params;

        // Get block to find car_id before deleting
        const blockResult = await query('SELECT car_id FROM date_blocks WHERE id = $1', [id]);

        if (blockResult.rows.length === 0) {
            return res.status(404).json({ error: 'Block not found' });
        }

        const carId = blockResult.rows[0].car_id;

        await query('DELETE FROM date_blocks WHERE id = $1', [id]);

        // Update car status
        await availabilityService.updateCarStatus(carId);

        res.json({ message: 'Block deleted successfully' });

    } catch (error) {
        console.error('Error deleting block:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getCalendar,
    checkAvailability,
    createBlock,
    getBlocks,
    deleteBlock
};
