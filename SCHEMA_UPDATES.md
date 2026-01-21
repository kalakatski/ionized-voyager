# Juggernaut Booking System - Schema & Logic Updates

## Summary
This document outlines the changes made to implement three critical tasks:
1. **Single Car Per Booking** - Changed from many-to-many to one-to-one relationship
2. **Enhanced Email Logging** - Added comprehensive email delivery tracking
3. **Strict Event Type Validation** - Enforced enum constraint on event types

---

## TASK 1: Single Car Per Booking

### Schema Changes (`src/database/schema.sql`)
**Before:**
- `bookings` table had NO car_id column
- `booking_cars` junction table managed many-to-many relationship
- One booking could have multiple cars

**After:**
- `bookings` table now has `car_id INTEGER NOT NULL REFERENCES event_cars(id)`
- Removed `booking_cars` junction table entirely
- Each booking references exactly ONE car

### API Changes (`src/routes/api.js`)
**Before:**
```javascript
body('carIds').isArray({ min: 1 }).withMessage('At least one car must be selected')
```

**After:**
```javascript
body('carId').isInt({ min: 1 }).withMessage('A valid car ID must be selected')
```

### Booking Service Changes (`src/services/bookingService.js`)

#### `createBooking()`
- **Parameter changed**: `carIds` array → `carId` single integer
- **Logic simplified**: No loop, single availability check
- **SQL updated**: Includes `car_id` in INSERT statement

#### `getBookingByReference()`
- **Query changed**: Direct JOIN on `b.car_id = ec.id`
- **Return changed**: `cars` array → `car` single object using `json_build_object()`

#### `getAllBookings()`
- **Query changed**: No more `booking_cars` join
- **WHERE clause**: `bc.car_id = $X` → `b.car_id = $X`
- **Return changed**: Each booking has single `car` object

#### `updateBooking()`
- **Parameter changed**: `carIds` → `carId`
- **Logic**: Updates `car_id` column directly
- **Car status updates**: Handles both old and new car if changed

#### `cancelBooking()`
- **Logic simplified**: Updates status of single `booking.car_id`
- **Safety check**: Handles null car_id gracefully

### Availability Service
- All availability checks now properly scoped to single `carId`
- No changes needed - already worked with single car per query

---

## TASK 2: Enhanced Email Logging

### Schema Changes (`src/database/schema.sql`)
**New columns in `notifications` table:**
- `booking_id INTEGER` - FK to bookings(id) for referential integrity
- `error_message TEXT` - Stores email send failures
- `all_recipients TEXT` - Comma-separated list of TO + CC recipients
- `status` - Already existed, now properly used ('sent' | 'failed')

### Notification Service Changes (`src/services/notificationService.js`)

#### `sendEmail()`
- **Before**: Threw error on failure
- **After**: Returns `{ success, messageId, error }` object
- **Impact**: Email failure doesn't break booking creation

#### `logNotification()`
**New signature:**
```javascript
logNotification(type, recipientEmail, recipientType, 
                bookingId, bookingReference, subject, body, 
                status, errorMessage, allRecipients)
```

**Enhancements:**
- Logs `booking_id` FK for database integrity
- Logs `all_recipients` for audit trail
- Logs `error_message` when email fails
- Logs `status` ('sent' or 'failed')

#### `sendBookingNotification()`
- **Captures email result**: Checks `emailResult.success`
- **Logs status**: Passes 'sent' or 'failed' to logger
- **Logs error**: Passes error message on failure
- **All recipients**: Builds comma-separated string of TO + CC
- **Non-blocking**: Email failure logged but doesn't throw error

### Email Recipients
**Confirmed:**
- **TO**: Client email from booking
- **CC**: `joshua.cherian@redbull.com`, `Karan.Kalyaniwalla@redbull.com`

---

## TASK 3: Strict Event Type Validation

### Schema Changes (`src/database/schema.sql`)
**Before:**
```sql
event_type VARCHAR(100) NOT NULL
```

**After:**
```sql
event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('REDBULL_EVENT', 'THIRD_PARTY_EVENT', 'COLLEGE_FEST'))
```

### API Validation (`src/routes/api.js`)
**Added to booking creation:**
```javascript
body('eventType')
    .notEmpty().withMessage('Event type is required')
    .isIn(['REDBULL_EVENT', 'THIRD_PARTY_EVENT', 'COLLEGE_FEST'])
    .withMessage('Event type must be one of: REDBULL_EVENT, THIRD_PARTY_EVENT, COLLEGE_FEST')
```

**Result:**
- Any other event_type value returns **400 Bad Request**
- Error message specifies allowed values
- Database constraint provides second layer of validation

---

## Mock Database Updates (`src/config/database.js`)

### Booking Creation
**Updated mock INSERT:**
```javascript
car_id: params[5],       // NEW: Now stored in booking
start_date: params[6],   // Moved from params[5]
end_date: params[7],     // Moved from params[6]
notes: params[8]         // Moved from params[7]
```

### Query Handling
**Removed:**
- `INSERT INTO booking_cars` handler
- `json_agg` array aggregation logic
- `INNER JOIN booking_cars` handler

**Added:**
- `json_build_object` handler for single car join
- Direct car lookup using `booking.car_id`

---

## Breaking Changes & Migration Notes

### Frontend Changes Required
**API Request Format:**
```javascript
// OLD
{
  carIds: [1, 2]  // Array of car IDs
}

// NEW
{
  carId: 1  // Single car ID
}
```

### Database Migration
If migrating existing data:
1. **Data Loss Warning**: Each booking will be assigned to only ONE car
2. **Migration Strategy**: 
   - Option A: Duplicate bookings for each car (creates multiple booking references)
   - Option B: Assign to first car only (simplest, data loss)
3. **Schema update**: Run new `schema.sql` (drops tables, recreates)

### API Response Format
```javascript
// OLD
{
  booking_reference: "JUG-xxx",
  cars: [{ carId: 1, carName: "Car 0" }, ...]  // Array
}

// NEW
{
  booking_reference: "JUG-xxx",
  car: { carId: 1, carName: "Car 0" }  // Single object
}
```

---

## Testing Checklist

### Booking Creation
- [x] Accepts single `carId` integer
- [x] Rejects arrays in `carId` field
- [x] Stores `car_id` in bookings table
- [x] Checks availability for single car only
- [x] Updates only selected car's status

### Event Type Validation
- [ ] Accepts 'REDBULL_EVENT'
- [ ] Accepts 'THIRD_PARTY_EVENT'
- [ ] Accepts 'COLLEGE_FEST'
- [ ] Rejects 'OTHER' with 400 error
- [ ] Rejects empty event_type

### Email Logging
- [ ] Email success logs 'sent' status
- [ ] Email failure logs 'failed' status
- [ ] Error message captured on failure
- [ ] `all_recipients` includes TO + CC
- [ ] `booking_id` FK set correctly
- [ ] Booking creation succeeds even if email fails

---

## Files Modified

1. `src/database/schema.sql` - Schema redesign
2. `src/services/bookingService.js` - Core booking logic
3. `src/services/notificationService.js` - Email handling and logging
4. `src/routes/api.js` - API validation
5. `src/config/database.js` - Mock mode updates

---

## Production Deployment Notes

1. **Database Migration**: Run schema.sql (WARNING: destructive)
2. **Frontend Deployment**: MUST deploy frontend changes simultaneously
3. **Email Testing**: Verify SMTP credentials work for joshua & Karan emails
4. **Environment Variables**: Ensure `SMTP_*` vars are set
5. **Monitoring**: Watch `notifications` table for `status='failed'` entries

---

## Rollback Plan

If rollback needed:
1. Restore old `schema.sql` (with booking_cars table)
2. Restore old `bookingService.js`
3. Restore old API validation (carIds array)
4. Redeploy frontend with carIds format

---

**Implementation Date**: 2026-01-22  
**Developer**: Juggernaut System Update  
**Status**: ✅ Completed
