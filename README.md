# Juggernaut Event Car Booking System - Backend

Internal booking and visibility system for Red Bull Juggernaut event cars.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Configuration**
   - Create a PostgreSQL database named `juggernaut_booking`
   - Copy `.env.example` to `.env` and update credentials:
   ```bash
   cp .env.example .env
   ```

3. **Run Migrations**
   Initialize the database schema and seed data:
   ```bash
   npm run migrate
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Testing

Run the automated test suite to verify conflict detection and availability logic:
```bash
npm test
```

## API Documentation

### Bookings

- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - List all bookings
- `GET /api/bookings/:reference` - Get booking details
- `PUT /api/bookings/:reference` - Update booking
- `DELETE /api/bookings/:reference` - Cancel booking

### Event Cars

- `GET /api/cars` - List all cars
- `PUT /api/cars/:id/location` - Update car location
- `PUT /api/cars/:id/status` - Update car status manually

### Calendar

- `GET /api/calendar` - Get unified multi-car calendar view
- `POST /api/availability/check` - Check availability for specific dates
- `POST /api/blocks` - Create manual date block
- `GET /api/blocks` - List date blocks

## Features

- **Auto-Confirmation**: Bookings are confirmed immediately if no conflicts exist.
- **Conflict Detection**: Prevents double-booking of cars for overlapping dates.
- **Unified Calendar**: Visualizes availability across all three event cars.
- **Notifications**: Email alerts for bookings, edits, cancellations, and conflict attempts.
