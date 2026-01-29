-- Seed Data for Event Cars
-- Insert the three fixed Red Bull Juggernaut event cars

INSERT INTO event_cars (car_number, name, registration, current_region, current_location, status, preferred_regions) VALUES
(0, 'Event Car 1', 'RED BULL JUGGERNAUT – MH 02 FG 0232', 'West', 'Mumbai', 'Available', ARRAY['West', 'South']),
(1, 'Event Car 2', 'RED BULL JUGGERNAUT – MH 04 LE 5911', 'North', 'Delhi', 'Available', ARRAY['East', 'North']),
(2, 'Event Car 3', 'RED BULL JUGGERNAUT – MH 04 LE 5912', 'East', 'Kolkata', 'Available', ARRAY['East', 'North']),
(3, 'Event Car 4', 'RED BULL JUGGERNAUT – STATIC', 'West', 'Mumbai', 'Available', ARRAY['West', 'North', 'East', 'South']);

-- Optional: Insert sample bookings for testing
-- Uncomment the lines below if you want some sample data

-- INSERT INTO bookings (booking_reference, event_name, event_type, client_name, client_email, start_date, end_date, status) VALUES
-- ('JUG-20260120-A1B2', 'College Fest 2026', 'Campus Event', 'Rajesh Kumar', 'rajesh@college.edu', '2026-01-25', '2026-01-27', 'Confirmed'),
-- ('JUG-20260121-C3D4', 'Music Festival', 'Concert', 'Priya Sharma', 'priya@events.com', '2026-02-10', '2026-02-12', 'Confirmed');

-- INSERT INTO booking_cars (booking_id, car_id) VALUES
-- (1, 1),
-- (2, 2);
