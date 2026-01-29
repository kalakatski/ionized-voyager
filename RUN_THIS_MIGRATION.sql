-- V2 COMPLETE MIGRATION SCRIPT
-- Copy this ENTIRE script and run it in Neon SQL Editor
-- Safe to run multiple times

-- Step 1: Add image_url column
ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Step 2: Add is_static column
ALTER TABLE event_cars ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;

-- Step 3: Add city column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Step 4: Add region column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- Step 5: Update region constraints
ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_current_region_check;
ALTER TABLE event_cars ADD CONSTRAINT event_cars_current_region_check 
CHECK (current_region IN ('North', 'West', 'South West', 'South East', 'East', 'South'));

-- Step 6: Update car_number constraint
ALTER TABLE event_cars DROP CONSTRAINT IF EXISTS event_cars_car_number_check;
ALTER TABLE event_cars ADD CONSTRAINT event_cars_car_number_check 
CHECK (car_number >= 0 AND car_number <= 10);

-- Step 7: Add Event Car 4 (Static) if it doesn't exist
INSERT INTO event_cars (
  car_number, 
  name, 
  registration, 
  current_region, 
  status, 
  image_url, 
  is_static, 
  preferred_regions
)
SELECT 
  3,
  'Event Car 4 (Static)',
  '',
  'West',
  'Available',
  '/cars/car4.png',
  TRUE,
  ARRAY['North', 'West', 'South', 'East']
WHERE NOT EXISTS (
  SELECT 1 FROM event_cars WHERE car_number = 3
);

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city);
CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region);

-- Verify migration
SELECT 'Migration completed!' as status;
SELECT car_number, name, registration, image_url, is_static FROM event_cars ORDER BY car_number;
