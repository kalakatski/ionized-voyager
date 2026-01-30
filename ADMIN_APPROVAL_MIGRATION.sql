-- =====================================================
-- ADMIN APPROVAL SYSTEM - DATABASE MIGRATION
-- =====================================================
-- This migration adds approval workflow to the bookings table
-- Run this in your database console (Neon, psql, etc.)

-- Step 1: Add new columns to bookings table
ALTER TABLE bookings 
  ADD COLUMN status VARCHAR(20) DEFAULT 'approved',
  ADD COLUMN approved_by VARCHAR(100),
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN rejection_reason TEXT;

-- Step 2: Migrate existing bookings to 'approved' status
-- This ensures backward compatibility - all existing bookings remain visible
UPDATE bookings 
SET status = 'approved', 
    approved_by = 'system', 
    approved_at = created_at
WHERE status = 'approved' OR status IS NULL;

-- Step 3: Add index for efficient filtering by status
CREATE INDEX idx_bookings_status ON bookings(status);

-- Step 4: Verify the migration
SELECT 
    status,
    COUNT(*) as count
FROM bookings
GROUP BY status;

-- Expected output: All existing bookings should have status = 'approved'

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP INDEX idx_bookings_status;
-- ALTER TABLE bookings 
--   DROP COLUMN status,
--   DROP COLUMN approved_by,
--   DROP COLUMN approved_at,
--   DROP COLUMN rejection_reason;
