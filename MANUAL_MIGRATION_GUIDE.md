# 🔧 MANUAL DATABASE MIGRATION GUIDE

## Issue
The automated migration endpoint is failing due to backend deployment issues on Vercel. You'll need to run the migration manually through your database provider's console.

## ✅ SOLUTION: Run Migration SQL Directly

### Step 1: Access Your Database Console

Depending on your database provider:

**Supabase**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

**Neon**:
1. Go to https://console.neon.tech/
2. Select your project
3. Click "SQL Editor"

**Vercel Postgres**:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Storage" → "Postgres" → "Query"

**Other PostgreSQL**:
- Use pgAdmin, DBeaver, or psql command line

---

### Step 2: Copy and Run This SQL

Copy the **entire SQL script below** and paste it into your database console, then execute it:

```sql
-- V2 Migration: Backward Compatible Schema Updates
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ============================================
-- STEP 1: Add new columns
-- ============================================

-- Add image_url to event_cars
ALTER TABLE event_cars 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add is_static flag to event_cars
ALTER TABLE event_cars 
ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;

-- Add city to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add region to bookings (if not exists)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- ============================================
-- STEP 2: Update constraints
-- ============================================

-- Drop old region constraint
ALTER TABLE event_cars 
DROP CONSTRAINT IF EXISTS event_cars_current_region_check;

-- Add new region constraint with expanded options
ALTER TABLE event_cars 
ADD CONSTRAINT event_cars_current_region_check 
CHECK (current_region IN ('North', 'West', 'South West', 'South East', 'East', 'South'));

-- ============================================
-- STEP 3: Update car_number constraint
-- ============================================

-- Drop old car_number constraint
ALTER TABLE event_cars 
DROP CONSTRAINT IF EXISTS event_cars_car_number_check;

-- Add new constraint allowing 0-10
ALTER TABLE event_cars 
ADD CONSTRAINT event_cars_car_number_check 
CHECK (car_number >= 0 AND car_number <= 10);

-- ============================================
-- STEP 4: Add Event Car 4 (Static)
-- ============================================

-- Insert Event Car 4 only if it doesn't exist
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
-- STEP 5: Add indexes
-- ============================================

-- Add index on city
CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city);

-- Add index on region
CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_cars FROM event_cars;
SELECT car_number, name, registration, image_url, is_static FROM event_cars ORDER BY car_number;
```

---

### Step 3: Verify Migration Success

After running the SQL, you should see:
- ✅ "Migration completed successfully!" message
- ✅ 4 cars total (Event Car 0, 1, 2, and 4)
- ✅ Event Car 4 (Static) with is_static = true

---

### Step 4: Test the Application

1. **Refresh the calendar**: https://red-bull-juggernaut-calendar.vercel.app/
2. **Check for Event Car 4**: Should appear in the sidebar
3. **Create a test booking**: City dropdown should work
4. **Verify city display**: New bookings should show city in calendar blocks

---

## 🔍 Troubleshooting

### If you get "column already exists" errors:
✅ **This is OK!** The migration uses `IF NOT EXISTS`, so it's safe to run multiple times.

### If Event Car 4 doesn't appear:
Check if it was inserted:
```sql
SELECT * FROM event_cars WHERE car_number = 3;
```

### If constraints fail:
You might have existing data that violates the new constraints. Check:
```sql
-- Check for invalid regions
SELECT DISTINCT current_region FROM event_cars;

-- Check for invalid car numbers
SELECT car_number FROM event_cars WHERE car_number < 0 OR car_number > 10;
```

---

## ✅ Expected Result

After successful migration:

| car_number | name | registration | image_url | is_static |
|------------|------|--------------|-----------|-----------|
| 0 | Event Car 0 | MH 02 FG 0232 | NULL | false |
| 1 | Event Car 1 | MH 04 LE 5911 | NULL | false |
| 2 | Event Car 2 | MH 04 LE 5912 | NULL | false |
| 3 | Event Car 4 (Static) | (empty) | /cars/car4.png | true |

**Note**: Existing cars (0, 1, 2) will have NULL image_url until you update them separately.

---

## 📝 Next Steps After Migration

1. **Update car images** (optional):
   ```sql
   UPDATE event_cars SET image_url = 'YOUR_IMAGE_URL_HERE' WHERE car_number = 0;
   UPDATE event_cars SET image_url = 'YOUR_IMAGE_URL_HERE' WHERE car_number = 1;
   UPDATE event_cars SET image_url = 'YOUR_IMAGE_URL_HERE' WHERE car_number = 2;
   ```

2. **Test creating a booking with city selection**

3. **Verify emails include city information**

---

## 🆘 Need Help?

If you encounter any issues:
1. Take a screenshot of the error
2. Share the error message
3. I can help troubleshoot specific issues

The migration is designed to be **safe and reversible** - all new columns are nullable and won't break existing functionality.
