const express = require('express');
const router = express.Router();
const { REGION_CITY_MAP, getValidRegions, getCitiesForRegion } = require('../utils/cityValidation');

/**
 * GET /api/regions
 * Get all valid regions
 */
router.get('/regions', (req, res) => {
    try {
        const regions = getValidRegions();
        res.json({
            regions,
            count: regions.length
        });
    } catch (error) {
        console.error('Error getting regions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/regions/:region/cities
 * Get all cities for a specific region
 */
router.get('/regions/:region/cities', (req, res) => {
    try {
        const { region } = req.params;
        const cities = getCitiesForRegion(region);

        if (cities.length === 0) {
            return res.status(404).json({
                error: 'Region not found',
                validRegions: getValidRegions()
            });
        }

        res.json({
            region,
            cities,
            count: cities.length
        });
    } catch (error) {
        console.error('Error getting cities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/city-region-map
 * Get complete city-region mapping
 */
router.get('/city-region-map', (req, res) => {
    try {
        res.json({
            mapping: REGION_CITY_MAP,
            regions: getValidRegions(),
            totalCities: Object.values(REGION_CITY_MAP).flat().length
        });
    } catch (error) {
        console.error('Error getting city-region map:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
