# Admin Approval System - Complete Guide

## ✅ What's Working

### 1. **Main Calendar** 
- URL: `https://ionized-voyager-seven.vercel.app/`
- Displays all **approved** bookings only
- Users can submit new booking requests
- Regular users see "Pending approval" message after booking

### 2. **Admin Dashboard**
- URL: `https://ionized-voyager-seven.vercel.app/admin`
- Login password: `RedBull2026!`
- Shows all bookings organized by status:
  - **Pending** (0) - New requests waiting for approval
  - **Approved** (4) - Confirmed bookings visible on calendar
  - **Rejected** (7) - Denied requests
  - **All Bookings** (11) - Total count

### 3. **Admin Features**
✅ View all bookings with full details
✅ Approve pending bookings → appear on calendar
✅ Reject bookings with optional reason
✅ Auto-approve when admin makes bookings (while logged in)
✅ Dashboard statistics

## 🔐 How to Use

### For Regular Users:
1. Go to the calendar
2. Click a date and select a car
3. Fill in booking details
4. Submit request
5. **Wait for admin approval** (you'll receive confirmation email)

### For Admin:
1. Go to `/admin` and login with password
2. View pending requests
3. Click **Approve** (green) or **Reject** (red)
4. Approved bookings immediately appear on the calendar
5. Users receive email notifications

### Admin Auto-Approval:
- When logged in as admin, your own bookings skip the approval queue
- They're instantly approved and appear on the calendar

## 📊 Database Changes

The following columns were added to the `bookings` table:
- `status` VARCHAR(20) DEFAULT 'approved'
- `approved_by` VARCHAR(100)
- `approved_at` TIMESTAMP
- `rejection_reason` TEXT

**Migration completed:** All old bookings converted from `Confirmed` → `approved` status.

## 🔧 Technical Details

### Backend Endpoints:
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/bookings?status=<pending|approved|rejected>` - List bookings
- `POST /api/admin/bookings/:id/approve` - Approve booking
- `POST /api/admin/bookings/:id/reject` - Reject booking
- `GET /api/admin/stats` - Dashboard statistics

### Environment Variables Required:
- `ADMIN_PASSWORD` - Admin login password
- `JWT_SECRET` - Token signing key
- `DB_*` - Database credentials
- `SMTP_*` - Email service credentials

### Frontend Routes:
- `/` - Main calendar (public)
- `/admin` - Admin login page
- `/admin/dashboard` - Admin control panel

## 📧 Email Notifications

- **To Admin**: Alert when new booking request submitted
- **To User**: Confirmation when booking approved
- **To User**: Notice when booking rejected (with reason)

## 🚀 Deployment

The system is deployed on Vercel:
- Frontend build: `frontend/calendar-ui/`
- Backend API: `api/index.js`
- Auto-deploys on push to `main` branch

## 🎯 Key Fixes Applied

1. ✅ Fixed API base URL configuration (removed hardcoded placeholder)
2. ✅ Fixed production environment detection (`MODE === 'production'`)
3. ✅ Removed database constraint blocking status updates
4. ✅ Migrated old `Confirmed`/`Cancelled` statuses to `approved`/`rejected`
5. ✅ Fixed SQL query column names to match actual schema
6. ✅ Used `SELECT *` to avoid column name mismatches

## 📝 Notes

- The calendar only shows **approved** bookings to prevent confusion
- Pending bookings are invisible to public until approved
- Rejected bookings never appear on the calendar
- Admin session persists with JWT token in localStorage
- Calendar queries filter by `status = 'approved'`

---

**System Status:** ✅ Fully Operational  
**Last Updated:** 2026-01-30  
**Deployed To:** https://ionized-voyager-seven.vercel.app
