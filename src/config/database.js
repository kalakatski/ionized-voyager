const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'juggernaut_booking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
let mockMode = process.env.USE_MOCK_DB === 'true';

pool.on('connect', () => {
    console.log('✓ Database connected successfully');
    mockMode = false;
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    if (!mockMode) {
        console.warn('⚠️ Switching to MOCK MODE due to database error.');
        mockMode = true;
    }
});

// Helper function to execute queries
const query = async (text, params) => {
    if (mockMode) {
        console.log('🧪 MOCK QUERY (Ignored):', text.substring(0, 100));
        return { rows: [], rowCount: 0 };
    }
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

const isMockMode = () => mockMode;
const setMockMode = (val) => { mockMode = val; };

// Helper function to get a client for transactions
const getClient = async () => {
    const client = await pool.connect();
    return client;
};

module.exports = {
    pool,
    query,
    getClient,
    isMockMode,
    setMockMode
};
