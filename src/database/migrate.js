const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting database migration...');

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await pool.query(schema);
        console.log('✓ Schema created successfully');

        // Read seed file
        const seedPath = path.join(__dirname, 'seed.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');

        // Execute seed data
        await pool.query(seed);
        console.log('✓ Seed data inserted successfully');

        console.log('\nMigration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrate();
