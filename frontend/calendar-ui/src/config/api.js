// API Configuration - Updated for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

export const API_ENDPOINTS = {
    calendar: `${API_BASE_URL}/api/calendar`,
    bookings: `${API_BASE_URL}/api/bookings`,
    cars: `${API_BASE_URL}/api/cars`,
};

export default API_BASE_URL;
