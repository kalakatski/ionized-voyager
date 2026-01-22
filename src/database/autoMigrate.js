/**
 * Auto-Migration System
 * Runs V2 migration automatically on server startup
 * Safe to run multiple times (idempotent)
 */

const { query } = require('../config/database');

async function runAutoMigration() {
    try {
        console.log('🔄 Checking for pending V2 migrations...');

        // Check if migration is needed by looking for image_url column
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'event_cars' 
            AND column_name = 'image_url'
        `;

        const checkResult = await query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✅ V2 migration already applied, skipping...');
            return { alreadyMigrated: true };
        }

        console.log('🚀 Running V2 migration...');

        // Step 1: Add image_url column
        await query('ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)');
        console.log('  ✓ Added image_url column');

        // Step 2: Add is_static column
        await query('ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE');
        console.log('  ✓ Added is_static column');

        // Step 3: Add city column to bookings
        await query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
        console.log('  ✓ Added city column');

        // Step 4: Add region column to bookings
        await query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region VARCHAR(50)');
        console.log('  ✓ Added region column');

        // Step 5: Update region constraints
        await query('ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_current_region_check');
        await query(`ALTER TABLE event_cars ADD CONSTRAINT event_cars_current_region_check 
                     CHECK (current_region IN ('North', 'West', 'South West', 'South East', 'East', 'South'))`);
        console.log('  ✓ Updated region constraints');

        // Step 6: Update car_number constraint
        await query('ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_car_number_check');
        await query('ALTER TABLE event_cars ADD CONSTRAINT event_cars_car_number_check CHECK (car_number >= 0 AND car_number <= 10)');
        console.log('  ✓ Updated car_number constraints');

        // Step 7: Add Event Car 4 (Static)
        const carCheck = await query('SELECT COUNT(*) FROM event_cars WHERE car_number = 3');
        if (parseInt(carCheck.rows[0].count) === 0) {
            await query(`INSERT INTO event_cars (car_number, name, registration, current_region, status, image_url, is_static, preferred_regions)
                         VALUES (3, 'Event Car 4 (Static)', '', 'West', 'Available', '/cars/car4.png', TRUE, ARRAY['North', 'West', 'South', 'East'])`);
            console.log('  ✓ Added Event Car 4 (Static)');
        } else {
            console.log('  ✓ Event Car 4 already exists');
        }

        // Step 8: Add indexes
        await query('CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city)');
        await query('CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region)');
        console.log('  ✓ Added indexes');

        console.log('✅ V2 migration completed successfully!');

        return { success: true };

    } catch (error) {
        console.error('❌ V2 migration failed:', error);
        // Don't throw - allow server to start even if migration fails
        return { success: false, error: error.message };
    }
}

module.exports = { runAutoMigration };
