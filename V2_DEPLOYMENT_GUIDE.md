# V2 Deployment Guide

## 🚀 Quick Deployment Steps

### Prerequisites
- Access to Vercel dashboard
- Database connection configured
- Git repository connected to Vercel

### Step 1: Test Locally (Optional but Recommended)

```bash
# Test city validation
node src/utils/testCityValidation.js

# Expected output: All tests should PASS
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "V2: Add city support, Event Car 4, enhanced emails, and validation"
git push origin main
```

### Step 3: Run Database Migration

**Option A: Via Vercel CLI**
```bash
vercel env pull .env.local
npm run migrate:v2
```

**Option B: Via Direct Database Connection**
```bash
# Connect to your production database
psql $DATABASE_URL

# Run migration SQL manually
\i src/database/migrations/v2_migration.sql
```

**Option C: Via Vercel Function (Recommended)**
Create a temporary API endpoint to run migration:

1. Create `/api/migrate-v2.js`:
```javascript
const { runV2Migration } = require('../src/database/migrateV2');

module.exports = async (req, res) => {
    // Add authentication check here
    if (req.headers['x-migration-key'] !== process.env.MIGRATION_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        await runV2Migration();
        res.json({ success: true, message: 'V2 migration completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

2. Set `MIGRATION_KEY` in Vercel environment variables
3. Call: `curl -H "x-migration-key: YOUR_KEY" https://ionized-voyager-seven.vercel.app/api/migrate-v2`
4. Delete the endpoint after migration

### Step 4: Verify Deployment

1. **Check Cars:**
   - Visit: https://red-bull-juggernaut-calendar.vercel.app/
   - Verify 4 cars appear: Event Car 1, 2, 3, 4

2. **Test Booking:**
   - Click "+ New Booking"
   - Fill in all fields including Region and City
   - Submit and verify success

3. **Test Validation:**
   - Try booking with invalid city-region combination
   - Should receive 400 error with helpful message

4. **Check Email:**
   - Create a test booking
   - Verify email includes:
     - Event Name ✓
     - Car Name ✓
     - Region ✓
     - City ✓
     - Date Range ✓
   - Verify sent to all recipients

### Step 5: Monitor

```bash
# Watch logs for any errors
vercel logs --follow

# Check for validation errors
vercel logs | grep "VALIDATION_ERROR"
```

---

## 🔍 Verification Checklist

### Database
- [ ] `event_cars` table has `image_url` column
- [ ] `bookings` table has `city` column
- [ ] Event Car 1, 2, 3 exist with correct names
- [ ] Event Car 4 exists (STATIC)
- [ ] Indexes created on city and region

### API
- [ ] POST /api/bookings requires region and city
- [ ] Invalid city-region returns 400 error
- [ ] Valid booking succeeds
- [ ] GET /api/calendar includes city in response

### Frontend
- [ ] All 4 cars visible in calendar
- [ ] Booking form works with city field
- [ ] Error messages display for validation failures

### Emails
- [ ] Emails include region and city
- [ ] Sent to client + 2 internal recipients
- [ ] Old bookings (without city) show "Not specified"

---

## 🐛 Troubleshooting

### Migration Fails
**Error:** "column already exists"
- **Solution:** Migration is idempotent, safe to re-run

**Error:** "permission denied"
- **Solution:** Ensure database user has ALTER TABLE permissions

### Validation Not Working
**Error:** Bookings succeed without city
- **Solution:** Clear Vercel build cache and redeploy

### Cars Not Renamed
**Error:** Still showing "Event Car 0, 1, 2"
- **Solution:** Migration didn't run, check database directly

### Event Car 4 Missing
**Error:** Only 3 cars visible
- **Solution:** Check if car_number constraint was updated
- **Fix:** Run migration again or manually insert Event Car 4

---

## 📊 Database Verification Queries

```sql
-- Check car names
SELECT car_number, name, registration FROM event_cars ORDER BY car_number;

-- Expected output:
-- 0 | Event Car 1 | RED BULL JUGGERNAUT – MH 02 FG 0232
-- 1 | Event Car 2 | RED BULL JUGGERNAUT – MH 04 LE 5911
-- 2 | Event Car 3 | RED BULL JUGGERNAUT – MH 04 LE 5912
-- 3 | Event Car 4 | RED BULL JUGGERNAUT – STATIC

-- Check schema updates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_cars' AND column_name = 'image_url';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'city';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'bookings';
```

---

## 🔄 Rollback Plan (If Needed)

If V2 causes issues, you can rollback:

```sql
-- Remove Event Car 4
DELETE FROM event_cars WHERE car_number = 3;

-- Revert car names (optional, doesn't break anything)
UPDATE event_cars SET name = 'Event Car 0' WHERE car_number = 0;
UPDATE event_cars SET name = 'Event Car 1' WHERE car_number = 1;
UPDATE event_cars SET name = 'Event Car 2' WHERE car_number = 2;

-- Note: Don't drop city/image_url columns as they're nullable
-- Existing bookings without city will continue to work
```

Then redeploy previous version:
```bash
git revert HEAD
git push origin main
```

---

## 📞 Post-Deployment

### Update Frontend (if needed)
The frontend may need updates to:
1. Add city dropdown to booking form
2. Populate cities based on selected region
3. Display city in booking details

### Documentation
- [ ] Update API documentation with city field
- [ ] Update user guide with city selection
- [ ] Notify team of new validation requirements

### Monitoring
- Monitor error rates for validation failures
- Check email delivery success rate
- Verify all 4 cars are being booked

---

## ✅ Success Criteria

Deployment is successful when:
1. All 4 cars visible in calendar
2. New bookings require valid city-region
3. Emails include all required fields
4. No increase in error rates
5. Existing bookings still work

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Status:** _________________
