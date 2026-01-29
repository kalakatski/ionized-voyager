---
description: V2 Backend Implementation Plan
---

# Juggernaut Event Car Booking System - V2 Implementation

## Overview
Upgrade the backend to V2 with enhanced features while maintaining backward compatibility.

## Implementation Steps

### 1. Database Migration (Non-Breaking)
- Add `image_url` column to `event_cars` table
- Add `city` column to `bookings` table
- Update car names: Event Car 0→1, 1→2, 2→3
- Add Event Car 4 (Static Car)
- **Status:** ✅ Ready to implement

### 2. City Validation Logic
- Create city-region mapping
- Add validation middleware
- Enforce region-city validation in booking creation
- **Status:** ✅ Ready to implement

### 3. Booking Logic Verification
- Review current single-car booking implementation
- Ensure only selected car is booked (already implemented)
- Add additional safeguards if needed
- **Status:** ⚠️ Needs verification

### 4. Calendar API Enhancement
- Add city field to calendar response
- Maintain existing response structure
- **Status:** ✅ Ready to implement

### 5. Email Enhancement
- Update email templates to include:
  - Event name ✅ (already included)
  - Car name ✅ (already included)
  - Region ✅ (already included)
  - City (new)
  - Date range ✅ (already included)
- Verify recipients:
  - Client email ✅
  - karan.kalyaniwalla@redbull.com ✅
  - joshua.cherian@redbull.com ✅
- **Status:** ✅ Mostly complete, needs city addition

### 6. Static Car Implementation
- Add Event Car 4 with special flag
- Ensure it behaves like normal booking
- No auto-movement logic needed
- **Status:** ✅ Ready to implement

## Non-Negotiables Checklist
- ✅ No breaking migrations (additive only)
- ✅ No API removals (all existing endpoints preserved)
- ✅ Backward compatible (existing bookings work)
- ✅ Static Car = normal booking behavior

## Files to Modify
1. `/src/database/schema.sql` - Add migration SQL
2. `/src/database/migrate.js` - Run migrations
3. `/src/database/seed.sql` - Update car names and add Car 4
4. `/src/controllers/bookingController.js` - Add city validation
5. `/src/services/bookingService.js` - Add city handling
6. `/src/services/notificationService.js` - Add city to emails
7. `/src/services/availabilityService.js` - Include city in calendar
8. `/src/utils/cityValidation.js` - New file for city-region mapping

## Testing Checklist
- [ ] Existing bookings still work
- [ ] New bookings with city work
- [ ] City validation rejects invalid combinations
- [ ] Calendar API includes city
- [ ] Emails include all required fields
- [ ] Event Car 4 can be booked
- [ ] Only selected car is booked (not multiple)
