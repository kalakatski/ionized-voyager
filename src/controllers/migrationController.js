/**
 * Migration Endpoint - V2 Schema Updates
 * This endpoint can be called via HTTP to run the V2 migration
 * 
 * SECURITY: In production, this should be protected with authentication
 * For now, it's a one-time migration endpoint
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runV2Migration(req, res) {
    try {
        console.log('🚀 Starting V2 Migration via API endpoint...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/v2_migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration SQL...');

        // Execute the migration
        await query(migrationSQL);

        console.log('✅ V2 Migration completed successfully!');

        res.json({
            success: true,
            message: 'V2 Migration completed successfully',
            changes: [
                'Added image_url column to event_cars',
                'Added city column to bookings',
                'Added region column to bookings',
                'Added is_static column to event_cars',
                'Added Event Car 4 (Static)',
                'Updated region constraints',
                'Added indexes for city and region'
            ]
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);

        res.status(500).json({
            success: false,
            error: 'Migration failed',
            message: error.message,
            details: error.stack
        });
    }
}

module.exports = {
    runV2Migration
};
