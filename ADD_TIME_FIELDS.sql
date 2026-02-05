-- Add time fields to bookings table
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '18:00:00';

-- Update existing bookings with default times
UPDATE bookings 
SET start_time = '09:00:00', 
    end_time = '18:00:00' 
WHERE start_time IS NULL OR end_time IS NULL;

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(start_date, start_time);
