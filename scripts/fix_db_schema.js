const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?sslmode=require`,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        console.log('Checking database schema...'); // Log to standard out for capture

        // Check if columns exist
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
        `);

        const columns = result.rows.map(r => r.column_name);
        console.log('Existing columns:', columns.join(', '));

        const missing = [];
        if (!columns.includes('approved_by')) missing.push('approved_by');
        if (!columns.includes('approved_at')) missing.push('approved_at');
        if (!columns.includes('rejection_reason')) missing.push('rejection_reason');

        if (missing.length > 0) {
            console.log('❌ MISSING COLUMNS:', missing.join(', '));
            console.log('Attempting to fix automatically...');

            await pool.query(`
                ALTER TABLE bookings 
                ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100),
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
            `);
            console.log('✅ Success! Columns added.');
        } else {
            console.log('✅ All required columns exist.');
        }

    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
