const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const apiRoutes = require('./routes/api');
const notificationService = require('./services/notificationService');

// Initialize App
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Scheduled Jobs
// Run reminder check every day at 10:00 AM
cron.schedule('0 10 * * *', () => {
    console.log('Running daily booking reminder job...');
    notificationService.sendUpcomingBookingReminders();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`
🚀 Juggernaut Booking System Backend
------------------------------------
Server is running on port ${PORT}
API endpoint: http://localhost:${PORT}/api
Health check: http://localhost:${PORT}/health
    `);
});
