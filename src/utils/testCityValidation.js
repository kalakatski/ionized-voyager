/**
 * Test script for city-region validation
 * Run with: node src/utils/testCityValidation.js
 */

const {
    validateBookingRegionCity,
    getCitiesForRegion,
    getValidRegions,
    isValidCityForRegion
} = require('./cityValidation');

console.log('🧪 Testing City-Region Validation\n');

// Test 1: Valid combinations
console.log('✅ Test 1: Valid Combinations');
const validTests = [
    { region: 'North', city: 'Delhi' },
    { region: 'South', city: 'Bangalore' },
    { region: 'East', city: 'Kolkata' },
    { region: 'West', city: 'Mumbai' }
];

validTests.forEach(test => {
    const result = validateBookingRegionCity(test);
    console.log(`  ${test.region} - ${test.city}: ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
});

// Test 2: Invalid combinations
console.log('\n❌ Test 2: Invalid Combinations');
const invalidTests = [
    { region: 'North', city: 'Mumbai', expected: 'City does not belong to region' },
    { region: 'South', city: 'Delhi', expected: 'City does not belong to region' },
    { region: 'East', city: 'Bangalore', expected: 'City does not belong to region' },
    { region: 'West', city: 'Kolkata', expected: 'City does not belong to region' }
];

invalidTests.forEach(test => {
    const result = validateBookingRegionCity(test);
    console.log(`  ${test.region} - ${test.city}: ${!result.valid ? '✓ PASS' : '✗ FAIL'}`);
    if (!result.valid) {
        console.log(`    Error: ${result.error}`);
    }
});

// Test 3: Missing fields
console.log('\n⚠️  Test 3: Missing Fields');
const missingTests = [
    { city: 'Mumbai', expected: 'Region is required' },
    { region: 'West', expected: 'City is required' },
    { expected: 'Region is required' }
];

missingTests.forEach((test, index) => {
    const result = validateBookingRegionCity(test);
    console.log(`  Test ${index + 1}: ${!result.valid ? '✓ PASS' : '✗ FAIL'}`);
    if (!result.valid) {
        console.log(`    Error: ${result.error}`);
    }
});

// Test 4: Case insensitivity
console.log('\n🔤 Test 4: Case Insensitivity');
const caseTests = [
    { region: 'North', city: 'delhi' },
    { region: 'South', city: 'BANGALORE' },
    { region: 'East', city: 'KoLkAtA' }
];

caseTests.forEach(test => {
    const result = validateBookingRegionCity(test);
    console.log(`  ${test.region} - ${test.city}: ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
});

// Test 5: Get cities for region
console.log('\n📋 Test 5: Get Cities for Region');
getValidRegions().forEach(region => {
    const cities = getCitiesForRegion(region);
    console.log(`  ${region}: ${cities.length} cities`);
    console.log(`    ${cities.slice(0, 3).join(', ')}...`);
});

// Test 6: Individual city check
console.log('\n🔍 Test 6: Individual City Check');
console.log(`  Mumbai in West: ${isValidCityForRegion('West', 'Mumbai') ? '✓' : '✗'}`);
console.log(`  Delhi in North: ${isValidCityForRegion('North', 'Delhi') ? '✓' : '✗'}`);
console.log(`  Mumbai in North: ${isValidCityForRegion('North', 'Mumbai') ? '✗ (correct)' : '✓'}`);

console.log('\n✅ All tests completed!\n');
