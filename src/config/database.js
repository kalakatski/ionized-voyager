const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'juggernaut_booking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // Enable SSL for any non-localhost connection (e.g. Neon.tech), or if explicitly properly set
    ssl: (process.env.NODE_ENV === 'production' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost'))
        ? { rejectUnauthorized: false }
        : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Logs for debugging (exclude sensitive info)
console.log('Database Configuration:', {
    host: process.env.DB_HOST || 'localhost',
    ssl: (process.env.NODE_ENV === 'production' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')),
    node_env: process.env.NODE_ENV
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

const mockStore = {
    bookings: [], // Start with empty bookings array - no sample data
    bookingCars: [], // Track car assignments for bookings
    cars: [
        { id: 1, car_number: 0, name: 'Event Car 0', registration: 'MH 02 FG 0232', current_region: 'West', status: 'Available' },
        { id: 2, car_number: 1, name: 'Event Car 1', registration: 'MH 04 LE 5911', current_region: 'North', status: 'Available' },
        { id: 3, car_number: 2, name: 'Event Car 2', registration: 'MH 04 LE 5912', current_region: 'East', status: 'Available' }
    ],
    notifications: []
};

// Helper function to execute queries
const query = async (text, params) => {
    if (mockMode) {
        console.log('🧪 MOCK QUERY:', text.substring(0, 100), params ? `Params: ${JSON.stringify(params).substring(0, 50)}` : '');

        // Handle SELECT COUNT queries
        if (text.includes('SELECT COUNT(*)')) {
            if (text.includes('FROM bookings')) {
                // Count bookings with date overlap
                if (params && params.length >= 4) {
                    const carId = params[0];
                    const startDate = params[2];
                    const endDate = params[3];
                    const count = mockStore.bookings.filter(b =>
                        b.status === 'Confirmed' &&
                        ((b.start_date <= endDate && b.end_date >= startDate))
                    ).length;
                    return { rows: [{ count }], rowCount: 1 };
                }
            }
            return { rows: [{ count: 0 }], rowCount: 1 };
        }

        // Handle car queries
        if (text.includes('SELECT * FROM event_cars')) {
            return { rows: mockStore.cars, rowCount: mockStore.cars.length };
        }

        // Handle json_build_object queries (single car join)
        // UPDATED: Now joins directly with event_cars using car_id
        // MOVED UP to take priority over generic booking queries
        if (text.includes('json_build_object') && text.includes('FROM bookings')) {
            if (text.includes('WHERE b.booking_reference = $1')) {
                const ref = params[0];
                const booking = mockStore.bookings.find(b => b.booking_reference === ref);
                if (booking) {
                    console.log('🔍 Found booking:', booking.booking_reference, 'CarID:', booking.car_id, 'Type:', typeof booking.car_id);
                    const car = mockStore.cars.find(c => c.id === booking.car_id);
                    console.log('🚗 Found car:', car ? car.name : 'NULL');

                    const bookingWithCar = {
                        ...booking,
                        car: car ? {
                            carId: car.id,
                            carNumber: car.car_number,
                            carName: car.name,
                            registration: car.registration,
                            currentRegion: car.current_region
                        } : null
                    };
                    return { rows: [bookingWithCar], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }
            // All bookings with car  join
            const bookingsWithCar = mockStore.bookings.map(b => {
                const car = mockStore.cars.find(c => c.id === b.car_id);
                return {
                    ...b,
                    car: car ? {
                        carId: car.id,
                        carNumber: car.car_number,
                        carName: car.name,
                        registration: car.registration
                    } : null
                };
            });
            return { rows: bookingsWithCar, rowCount: bookingsWithCar.length };
        }

        // Handle generic booking queries
        if (text.includes('SELECT * FROM bookings') || text.includes('SELECT b.*') || text.includes('FROM bookings b')) {
            // Specific booking by reference
            if (text.includes('booking_reference = $1')) {
                const ref = params[0];
                const booking = mockStore.bookings.find(b => b.booking_reference === ref);
                return { rows: booking ? [booking] : [], rowCount: booking ? 1 : 0 };
            }

            // Availability check (date overlap)
            if (text.includes('b.start_date <= $2') && text.includes('b.end_date >= $2')) {
                const carId = params[0];
                const date = params[1];
                const activeBookings = mockStore.bookings.filter(b =>
                    b.status === 'Confirmed' &&
                    b.car_id === carId && // Check car_id
                    b.start_date <= date &&
                    b.end_date >= date
                );
                return { rows: activeBookings.slice(0, 1), rowCount: activeBookings.length > 0 ? 1 : 0 };
            }

            // Conflict check
            if (text.includes('b.start_date <= $4') && text.includes('b.end_date >= $3')) {
                const carId = params[0];
                const excludeId = params[1];
                const startDate = params[2];
                const endDate = params[3];

                const conflicts = mockStore.bookings.filter(b =>
                    b.status === 'Confirmed' &&
                    b.car_id === carId && // Check car_id
                    (excludeId === null || b.id !== excludeId) &&
                    ((b.start_date <= endDate && b.end_date >= startDate) ||
                        (b.start_date <= startDate && b.end_date >= startDate) ||
                        (b.start_date >= startDate && b.end_date <= endDate))
                );
                return { rows: conflicts, rowCount: conflicts.length };
            }

            return { rows: mockStore.bookings, rowCount: mockStore.bookings.length };
        }

        // Handle INSERT INTO bookings
        // UPDATED: Now includes car_id parameter
        if (text.includes('INSERT INTO bookings')) {
            const newBooking = {
                id: mockStore.bookings.length + 1,
                booking_reference: params[0],
                event_name: params[1],
                event_type: params[2],
                client_name: params[3],
                client_email: params[4],
                car_id: params[5],
                start_date: params[6],
                end_date: params[7],
                notes: params[8],
                status: 'Confirmed',
                created_at: new Date(),
                updated_at: new Date()
            };
            mockStore.bookings.push(newBooking);
            console.log('✅ Mock booking created:', newBooking.booking_reference);
            return { rows: [newBooking], rowCount: 1 };
        }

        // Handle DELETE queries
        if (text.includes('DELETE FROM bookings')) {
            if (text.includes('booking_reference = $1')) {
                const ref = params[0];
                const index = mockStore.bookings.findIndex(b => b.booking_reference === ref);
                if (index !== -1) {
                    const deleted = mockStore.bookings.splice(index, 1);
                    console.log('✅ Mock booking deleted:', ref);
                    return { rows: [], rowCount: 1 };
                }
            }
            return { rows: [], rowCount: 0 };
        }

        // Handle INSERT INTO notifications
        if (text.includes('INSERT INTO notifications')) {
            console.log('✅ Mock notification logged');
            return { rows: [], rowCount: 1 };
        }

        // Handle UPDATE queries
        if (text.includes('UPDATE bookings')) {
            if (text.includes('status = $1') && text.includes('booking_reference = $2')) {
                const newStatus = params[0];
                const ref = params[1];
                const booking = mockStore.bookings.find(b => b.booking_reference === ref);
                if (booking) {
                    booking.status = newStatus;
                    booking.updated_at = new Date();
                    console.log('✅ Mock booking updated:', ref, 'Status:', newStatus);
                    return { rows: [booking], rowCount: 1 };
                }
            }
            return { rows: [], rowCount: 0 };
        }

        // Handle UPDATE event_cars (car status updates)
        if (text.includes('UPDATE event_cars')) {
            // In mock mode, just acknowledge the update
            return { rows: [], rowCount: 1 };
        }

        // Handle transaction commands
        if (text.includes('BEGIN') || text.includes('COMMIT') || text.includes('ROLLBACK')) {
            console.log('🧪 Mock transaction:', text.trim());
            return { rows: [], rowCount: 0 };
        }

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
const getMockStore = () => mockStore;

// Helper function to get a client for transactions
const getClient = async () => {
    if (mockMode) {
        console.log('🧪 MOCK CLIENT (Transaction simulation)');
        return {
            query: async (text, params) => {
                // Reuse the same query handler for transactions
                return query(text, params);
            },
            release: () => console.log('🧪 MOCK CLIENT RELEASE')
        };
    }
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
