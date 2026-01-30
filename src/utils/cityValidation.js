/**
 * City-Region Validation Utility
 * Defines valid cities for each region and provides validation functions
 */

const REGION_CITY_MAP = {
    'North': [
        'Delhi',
        'Noida',
        'Gurgaon',
        'Chandigarh',
        'Jaipur',
        'Lucknow',
        'Agra',
        'Amritsar',
        'Dehradun'
    ],
    'South': [
        'Bangalore',
        'Chennai',
        'Hyderabad',
        'Kochi',
        'Coimbatore',
        'Mysore',
        'Trivandrum',
        'Visakhapatnam',
        'Mangalore'
    ],
    'East': [
        'Kolkata',
        'Bhubaneswar',
        'Guwahati',
        'Patna',
        'Ranchi',
        'Siliguri',
        'Imphal',
        'Shillong'
    ],
    'West': [
        'Mumbai',
        'Pune',
        'Ahmedabad',
        'Goa',
        'Navi Mumbai'
    ]
};

/**
 * Validate if a city belongs to a given region
 * @param {string} region - The region (North, South, East, West)
 * @param {string} city - The city name
 * @returns {boolean} - True if city belongs to region
 */
function isValidCityForRegion(region, city) {
    if (!region || !city) {
        return false;
    }

    const validCities = REGION_CITY_MAP[region];
    if (!validCities) {
        return false;
    }

    // Case-insensitive comparison
    return validCities.some(validCity =>
        validCity.toLowerCase() === city.toLowerCase()
    );
}

/**
 * Get all valid cities for a region
 * @param {string} region - The region
 * @returns {string[]} - Array of valid cities
 */
function getCitiesForRegion(region) {
    return REGION_CITY_MAP[region] || [];
}

/**
 * Get all valid regions
 * @returns {string[]} - Array of valid regions
 */
function getValidRegions() {
    return Object.keys(REGION_CITY_MAP);
}

/**
 * Validate booking data for region and city
 * @param {object} bookingData - Booking data with region and city
 * @returns {object} - { valid: boolean, error: string }
 */
function validateBookingRegionCity(bookingData) {
    const { region, city } = bookingData;

    // Region is required
    if (!region) {
        return {
            valid: false,
            error: 'Region is required'
        };
    }

    // Check if region is valid
    if (!REGION_CITY_MAP[region]) {
        return {
            valid: false,
            error: `Invalid region. Valid regions are: ${getValidRegions().join(', ')}`
        };
    }

    // City is required
    if (!city) {
        return {
            valid: false,
            error: 'City is required'
        };
    }

    // Check if city belongs to region
    if (!isValidCityForRegion(region, city)) {
        return {
            valid: false,
            error: `City "${city}" does not belong to region "${region}". Valid cities for ${region}: ${getCitiesForRegion(region).join(', ')}`
        };
    }

    return {
        valid: true,
        error: null
    };
}

module.exports = {
    REGION_CITY_MAP,
    isValidCityForRegion,
    getCitiesForRegion,
    getValidRegions,
    validateBookingRegionCity
};
