-- V2 Migration: Backward Compatible Schema Updates
-- This migration is designed to be SAFE and REVERSIBLE
-- All new columns are NULLABLE to preserve existing data

-- ============================================
-- STEP 1: Add new columns (nullable for backward compatibility)
-- ============================================

-- Add image_url to event_cars (nullable - old cars won't have images initially)
ALTER TABLE event_cars 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add is_static flag to event_cars (nullable - old cars are not static)
ALTER TABLE event_cars 
ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;

-- Add city to bookings (nullable - old bookings don't have city)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add region to bookings if it doesn't exist (nullable - old bookings might not have region)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- ============================================
-- STEP 2: Update constraints to support new regions
-- ============================================

-- Drop old region constraint on event_cars
ALTER TABLE event_cars 
DROP CONSTRAINT IF EXISTS event_cars_current_region_check;

-- Add new region constraint with expanded options
ALTER TABLE event_cars 
ADD CONSTRAINT event_cars_current_region_check 
CHECK (current_region IN ('North', 'West', 'South West', 'South East', 'East', 'South'));

-- ============================================
-- STEP 3: Update car_number constraint to allow Event Car 4
-- ============================================

-- Drop old car_number constraint
ALTER TABLE event_cars 
DROP CONSTRAINT IF EXISTS event_cars_car_number_check;

-- Add new constraint allowing 0-10 (flexible for future expansion)
ALTER TABLE event_cars 
ADD CONSTRAINT event_cars_car_number_check 
CHECK (car_number >= 0 AND car_number <= 10);

-- ============================================
-- STEP 4: Add Event Car 4 (Static) if it doesn't exist
-- ============================================

-- Insert Event Car 4 only if it doesn't already exist
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

-- ============================================
-- STEP 5: Add indexes for performance
-- ============================================

-- Add index on city for faster filtering
CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city);

-- Add index on region for faster filtering
CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- All changes are backward compatible:
-- - Existing bookings without city/region will have NULL values
-- - Existing cars without image_url will have NULL values
-- - Car numbers remain unchanged (0, 1, 2) to preserve existing bookings
-- - Event Car 4 is added as car_number 3
