# Deployment Guide - Juggernaut Event Car Booking System

## Pre-Deployment Checklist

### ✅ Code Changes Complete
- [x] Frontend uses environment variables for API URL
- [x] Backend exports Express app for Vercel serverless
- [x] Email system has proper error handling (non-blocking)
- [x] Booking logic isolates by car_id
- [x] All secrets moved to environment variables

### ✅ Configuration Files
- [x] `vercel.json` - Serverless routing configuration
- [x] `api/index.js` - Vercel function entry point
- [x] `.env.example` - Template for required environment variables
- [x] `.gitignore` - Protects secrets from being committed

---

## Deployment Steps

### 1️⃣ **Deploy Backend to Vercel**

```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project (if already created)
# - Choose project name
# - NO to modifying settings (we have vercel.json)
```

**Set Environment Variables in Vercel Dashboard:**

Go to: Project → Settings → Environment Variables

Add the following:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `DB_HOST` | Your PostgreSQL host | Production |
| `DB_PORT` | `5432` | Production |
| `DB_NAME` | `juggernaut_booking` | Production |
| `DB_USER` | Your DB username | Production |
| `DB_PASSWORD` | Your DB password | Production |
| `SMTP_HOST` | `smtp.gmail.com` | Production |
| `SMTP_PORT` | `587` | Production |
| `SMTP_USER` | Your email | Production |
| `SMTP_PASSWORD` | Your app password | Production |
| `EMAIL_FROM` | `noreply@redbulljuggernaut.com` | Production |
| `BASE_URL` | Your Vercel backend URL | Production |

**Redeploy after adding environment variables:**

```bash
vercel --prod
```

**Your backend URL:** `https://your-project.vercel.app`

---

### 2️⃣ **Deploy Frontend to Vercel**

```bash
cd frontend/calendar-ui

# Update .env.production with your backend URL
echo "VITE_API_BASE_URL=https://your-project.vercel.app" > .env.production

# Deploy
vercel

# Production deployment
vercel --prod
```

---

### 3️⃣ **Database Setup**

**If using hosted PostgreSQL (recommended: Neon, Supabase, or Railway):**

1. Create database instance
2. Run schema migration:

```bash
# Connect to your hosted DB
psql postgresql://username:password@host:5432/database_name < src/database/schema.sql
```

3. Seed initial data:

```bash
node src/database/seed.js
```

---

### 4️⃣ **Verify Deployment**

**Backend Health Check:**
```bash
curl https://your-backend.vercel.app/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2026-01-22T..."}
```

**Test Calendar API:**
```bash
curl "https://your-backend.vercel.app/api/calendar?startDate=2026-01-01&endDate=2026-01-31"
```

**Frontend Access:**
Open `https://your-frontend.vercel.app` in browser

---

## Email Verification

**Test Booking Creation:**

1. Create a booking via UI
2. Check console logs in Vercel dashboard:
   - `✓ Notifications sent for booking_created: REF-XXX to client@email.com, joshua.cherian@redbull.com, Karan.Kalyaniwalla@redbull.com`

**Email Recipients (Automatic):**
- ✅ Client email (TO)
- ✅ `joshua.cherian@redbull.com` (CC)
- ✅ `Karan.Kalyaniwalla@redbull.com` (CC)

**Non-blocking Behavior:**
- If email fails, booking still succeeds
- Error logged but not thrown

---

## Production Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
PORT=3000
BASE_URL=https://your-backend.vercel.app

# Database (Production)
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_NAME=juggernaut_booking
DB_USER=your_user
DB_PASSWORD=your_password

# Email (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@redbulljuggernaut.com

# Notification Recipients
ADMIN_EMAILS=joshua.cherian@redbull.com,Karan.Kalyaniwalla@redbull.com
OPERATIONS_EMAILS=operations@redbull.com
REMINDER_DAYS=3
```

**Frontend (.env.production):**
```bash
VITE_API_BASE_URL=https://your-backend.vercel.app
```

---

## Troubleshooting

### Issue: "Failed to load calendar"
- **Check:** Backend health endpoint
- **Check:** CORS is enabled (already configured in `server.js`)
- **Check:** Frontend `.env.production` has correct backend URL

### Issue: "Email not sending"
- **Check:** Vercel logs for email errors
- **Check:** SMTP credentials are correct
- **Check:** Gmail "App Passwords" if using Gmail

### Issue: "Database connection failed"
- **Check:** Database credentials in Vercel environment variables
- **Check:** Database allows connections from Vercel IPs (usually 0.0.0.0/0 for serverless)
- **Check:** SSL mode if required by your DB provider

---

## Final Checklist

### Before Going Live:
- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and loads calendar
- [ ] Database connected and seeded
- [ ] Email system tested (create a booking)
- [ ] All 3 cars visible on calendar
- [ ] Booking creation works
- [ ] Booking cancellation works
- [ ] Conflict detection works
- [ ] Emails sent to all recipients (client + joshua + karan)
- [ ] No secrets in git history (`git log -- .env`)

---

## Support

For deployment issues:
- Vercel Docs: https://vercel.com/docs
- Check Vercel Function logs: Dashboard → Deployments → Functions
- Backend logs: Vercel Dashboard → Your Project → Logs

**System Ready for Production ✅**
