// API Configuration - v2.0 (Production Ready)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000');

// Debug log
console.log('[API Config] Environment:', import.meta.env.MODE);
console.log('[API Config] PROD flag:', import.meta.env.PROD);
console.log('[API Config] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('[API Config] Final API_BASE_URL:', API_BASE_URL);

export const API_ENDPOINTS = {
    calendar: `${API_BASE_URL}/api/calendar`,
    bookings: `${API_BASE_URL}/api/bookings`,
    cars: `${API_BASE_URL}/api/cars`,
    admin: {
        login: `${API_BASE_URL}/api/admin/login`,
        bookings: `${API_BASE_URL}/api/admin/bookings`,
        stats: `${API_BASE_URL}/api/admin/stats`,
    }
};

export default API_BASE_URL;
