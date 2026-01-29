/**
 * V2 Migration Runner
 * Applies V2 schema updates to the database
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runV2Migration() {
    try {
        console.log('🚀 Starting V2 Migration...\n');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', 'v2_migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration SQL...');

        // Execute the migration
        await query(migrationSQL);

        console.log('✅ V2 Migration completed successfully!\n');
        console.log('Changes applied:');
        console.log('  ✓ Added image_url column to event_cars');
        console.log('  ✓ Added city column to bookings');
        console.log('  ✓ Updated car names (Event Car 0→1, 1→2, 2→3)');
        console.log('  ✓ Added Event Car 4 (Static Car)');
        console.log('  ✓ Added indexes for city and region');
        console.log('\n🎉 Database is now V2 ready!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('\nError details:', error.message);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    runV2Migration();
}

module.exports = { runV2Migration };
