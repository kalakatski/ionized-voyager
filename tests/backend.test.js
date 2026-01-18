const { pool } = require('../src/config/database');
const bookingService = require('../src/services/bookingService');
const availabilityService = require('../src/services/availabilityService');

// Mock helpers
const mockBooking = {
    eventName: 'Test Event',
    eventType: 'Test Type',
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    carIds: [0], // Using car ID 0 from seeds
    notes: 'Test notes'
};

const cleanup = async () => {
    await pool.query('DELETE FROM bookings WHERE client_email = $1', ['test@example.com']);
    await pool.query('DELETE FROM date_blocks WHERE block_reason = $1', ['Test Block']);
};

describe('Juggernaut Backend Tests', () => {
    beforeAll(async () => {
        // Ensure clean state
        await cleanup();
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe('Booking Conflict Detection', () => {
        let createdBooking;

        test('should successfully create a valid booking', async () => {
            createdBooking = await bookingService.createBooking(mockBooking);
            expect(createdBooking).toBeDefined();
            expect(createdBooking.status).toBe('Confirmed');
            expect(createdBooking.booking_reference).toBeDefined();
        });

        test('should detect exact overlap conflict', async () => {
            try {
                await bookingService.createBooking({
                    ...mockBooking,
                    eventName: 'Conflict Event'
                });
                fail('Should have thrown conflict error');
            } catch (error) {
                expect(error.code).toBe('BOOKING_CONFLICT');
                expect(error.conflicts).toBeDefined();
                expect(error.conflicts.length).toBeGreaterThan(0);
            }
        });

        test('should detect partial overlap conflict', async () => {
            try {
                await bookingService.createBooking({
                    ...mockBooking,
                    eventName: 'Partial Conflict',
                    startDate: '2026-05-04',
                    endDate: '2026-05-08'
                });
                fail('Should have thrown conflict error');
            } catch (error) {
                expect(error.code).toBe('BOOKING_CONFLICT');
            }
        });

        test('should allow non-overlapping booking', async () => {
            const result = await bookingService.createBooking({
                ...mockBooking,
                eventName: 'Next Week Event',
                startDate: '2026-05-10',
                endDate: '2026-05-15'
            });
            expect(result).toBeDefined();
        });
    });

    describe('Availability Logic', () => {
        test('should correctly report car availability', async () => {
            // Check dates we just booked (May 1-5)
            const result1 = await availabilityService.checkCarAvailability(0, '2026-05-02', '2026-05-03');
            expect(result1.isAvailable).toBe(false);

            // Check free dates
            const result2 = await availabilityService.checkCarAvailability(0, '2026-06-01', '2026-06-05');
            expect(result2.isAvailable).toBe(true);
        });

        test('should respect manual blocks', async () => {
            // Create a block naturally via SQL or service if we had one exposed for tests
            // For now, let's use direct query to simulate what the controller would do
            await pool.query(
                `INSERT INTO date_blocks (car_id, start_date, end_date, block_reason, block_details)
                 VALUES ($1, $2, $3, $4, $5)`,
                [0, '2026-07-01', '2026-07-05', 'Manual', 'Test Block']
            );

            const result = await availabilityService.checkCarAvailability(0, '2026-07-02', '2026-07-03');
            expect(result.isAvailable).toBe(false);
            expect(result.conflicts[0].block_reason).toBe('Manual');
        });
    });

    describe('Multi-Car Bookings', () => {
        test('should handle multi-car bookings atomically', async () => {
            // Try to book Car 0 (blocked/booked) and Car 1 (free)
            // Should fail for BOTH if one is unavailable
            try {
                await bookingService.createBooking({
                    ...mockBooking,
                    eventName: 'Multi Car Fail',
                    startDate: '2026-05-01',
                    endDate: '2026-05-05',
                    carIds: [0, 1]
                });
                fail('Should have failed due to Car 0 unavailability');
            } catch (error) {
                expect(error.code).toBe('BOOKING_CONFLICT');
            }

            // Verify Car 1 is still free (transaction rolled back)
            const checkCar1 = await availabilityService.checkCarAvailability(1, '2026-05-01', '2026-05-05');
            expect(checkCar1.isAvailable).toBe(true);
        });
    });
});
