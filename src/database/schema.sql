-- Juggernaut Event Car Booking System Database Schema
-- PostgreSQL 12+
-- UPDATED: Single car per booking, strict event types, enhanced email logging

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS date_blocks CASCADE;
DROP TABLE IF EXISTS booking_cars CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS event_cars CASCADE;

-- Event Cars Table
-- Stores the three fixed event cars with their metadata
CREATE TABLE event_cars (
    id SERIAL PRIMARY KEY,
    car_number INTEGER UNIQUE NOT NULL CHECK (car_number IN (0, 1, 2)),
    name VARCHAR(50) NOT NULL,
    registration VARCHAR(100) NOT NULL,
    current_region VARCHAR(20) NOT NULL CHECK (current_region IN ('West', 'North', 'East', 'South')),
    current_location VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Booked', 'In Service', 'Breakdown')),
    preferred_regions TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
-- UPDATED: Each booking now references exactly ONE car_id
-- UPDATED: event_type now has strict enum constraint
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('REDBULL_EVENT', 'THIRD_PARTY_EVENT', 'COLLEGE_FEST')),
    client_name VARCHAR(200) NOT NULL,
    client_email VARCHAR(200) NOT NULL,
    car_id INTEGER NOT NULL REFERENCES event_cars(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index for performance on date range queries
CREATE INDEX idx_bookings_dates_status ON bookings(start_date, end_date, status);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_car_id ON bookings(car_id);

-- Date Blocks Table
-- Manual date blocks for cars (service, breakdown, or manual holds)
CREATE TABLE date_blocks (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES event_cars(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    block_reason VARCHAR(50) NOT NULL CHECK (block_reason IN ('Service', 'Breakdown', 'Manual')),
    block_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_block_range CHECK (end_date >= start_date)
);

-- Index for date range queries
CREATE INDEX idx_date_blocks_car_dates ON date_blocks(car_id, start_date, end_date);

-- Notifications Table
-- UPDATED: Enhanced email delivery logging with error tracking
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(200) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('client', 'admin', 'operations')),
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    booking_reference VARCHAR(20),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    all_recipients TEXT
);

-- Index for notification queries
CREATE INDEX idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX idx_notifications_booking_ref ON notifications(booking_reference);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply auto-update triggers
CREATE TRIGGER update_event_cars_updated_at BEFORE UPDATE ON event_cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
