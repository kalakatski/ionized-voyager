# Frontend Integration Guide - V2 API Changes

## 🚀 Quick Start

The backend now requires **region** and **city** for all new bookings.

---

## 📋 Required Changes to Booking Form

### 1. Add City Dropdown

**Before V2:**
```javascript
{
  eventName: "...",
  eventType: "...",
  clientName: "...",
  clientEmail: "...",
  carId: 1,
  startDate: "2026-02-01",
  endDate: "2026-02-03",
  region: "West"  // Already exists
}
```

**After V2 (Required):**
```javascript
{
  eventName: "...",
  eventType: "...",
  clientName: "...",
  clientEmail: "...",
  carId: 1,
  startDate: "2026-02-01",
  endDate: "2026-02-03",
  region: "West",     // Required
  city: "Mumbai"      // NEW - Required
}
```

---

## 🌐 New API Endpoints

### Get All Regions
```javascript
GET /api/regions

Response:
{
  "regions": ["North", "South", "East", "West"],
  "count": 4
}
```

### Get Cities for Region
```javascript
GET /api/regions/West/cities

Response:
{
  "region": "West",
  "cities": [
    "Mumbai",
    "Pune",
    "Ahmedabad",
    "Surat",
    "Nagpur",
    "Indore",
    "Bhopal",
    "Goa",
    "Nashik",
    "Aurangabad"
  ],
  "count": 10
}
```

### Get Complete Mapping
```javascript
GET /api/city-region-map

Response:
{
  "mapping": {
    "North": ["Delhi", "Noida", "Gurgaon", ...],
    "South": ["Bangalore", "Chennai", "Hyderabad", ...],
    "East": ["Kolkata", "Bhubaneswar", "Guwahati", ...],
    "West": ["Mumbai", "Pune", "Ahmedabad", ...]
  },
  "regions": ["North", "South", "East", "West"],
  "totalCities": 36
}
```

---

## 💻 Example React Implementation

### Fetch Cities When Region Changes

```javascript
import { useState, useEffect } from 'react';

function BookingForm() {
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);

  // Fetch cities when region changes
  useEffect(() => {
    if (region) {
      fetch(`${API_BASE_URL}/api/regions/${region}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data.cities);
          setCity(''); // Reset city when region changes
        });
    }
  }, [region]);

  return (
    <form>
      {/* Region Dropdown */}
      <select 
        value={region} 
        onChange={(e) => setRegion(e.target.value)}
        required
      >
        <option value="">Select Region</option>
        <option value="North">North</option>
        <option value="South">South</option>
        <option value="East">East</option>
        <option value="West">West</option>
      </select>

      {/* City Dropdown (populated based on region) */}
      <select 
        value={city} 
        onChange={(e) => setCity(e.target.value)}
        disabled={!region}
        required
      >
        <option value="">Select City</option>
        {cities.map(cityName => (
          <option key={cityName} value={cityName}>
            {cityName}
          </option>
        ))}
      </select>

      {/* Rest of form... */}
    </form>
  );
}
```

---

## ⚠️ Error Handling

### Validation Errors (400)

```javascript
// If user selects invalid city-region combination
POST /api/bookings
{
  "region": "North",
  "city": "Mumbai"  // Invalid: Mumbai is in West
}

Response (400):
{
  "error": "Validation failed",
  "message": "City \"Mumbai\" does not belong to region \"North\". Valid cities for North: Delhi, Noida, Gurgaon, Chandigarh, Jaipur, Lucknow, Agra, Amritsar, Dehradun"
}
```

### Handle in Frontend

```javascript
try {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 400) {
      // Validation error
      alert(error.message);
    } else if (response.status === 409) {
      // Booking conflict
      alert('Car not available for selected dates');
    }
    return;
  }

  const booking = await response.json();
  // Success!
} catch (error) {
  console.error('Booking failed:', error);
}
```

---

## 🚗 Event Car Changes

### Before V2
- Event Car 0
- Event Car 1
- Event Car 2

### After V2
- Event Car 1
- Event Car 2
- Event Car 3
- Event Car 4 (Static Car)

**Note:** Car IDs remain the same (1, 2, 3, 4), only names changed.

---

## 📅 Calendar API Changes

### Enhanced Response

```javascript
GET /api/calendar?startDate=2026-02-01&endDate=2026-02-28

// Each booking now includes city and region
{
  "carId": 1,
  "carName": "Event Car 1",
  "availability": [
    {
      "date": "2026-02-01",
      "isAvailable": false,
      "booking": {
        "booking_reference": "JUG-20260122-ABCD",
        "event_name": "College Fest",
        "event_type": "REDBULL_EVENT",
        "client_name": "John Doe",
        "region": "West",      // NEW
        "city": "Mumbai"       // NEW
      }
    }
  ]
}
```

---

## 🎨 UI Recommendations

### 1. Region Dropdown
- Required field
- 4 options: North, South, East, West
- Should be selected before city

### 2. City Dropdown
- Required field
- Disabled until region is selected
- Dynamically populated based on region
- 8-10 cities per region

### 3. Validation
- Show error if city doesn't match region
- Clear city when region changes
- Disable submit until both are selected

### 4. Display in Calendar
- Show city in booking tooltip
- Format: "Event Name - City, Region"
- Example: "College Fest - Mumbai, West"

---

## 🧪 Testing Checklist

- [ ] Region dropdown works
- [ ] City dropdown populates when region selected
- [ ] City dropdown clears when region changes
- [ ] Cannot submit without region
- [ ] Cannot submit without city
- [ ] Invalid city-region shows error
- [ ] Valid booking succeeds
- [ ] Calendar displays city
- [ ] All 4 cars visible
- [ ] Event Car 4 can be booked

---

## 📞 API Base URLs

**Production:** `https://ionized-voyager-seven.vercel.app/api`  
**Frontend:** `https://red-bull-juggernaut-calendar.vercel.app/`

---

## 🔗 Quick Links

- Full Implementation: `V2_IMPLEMENTATION.md`
- Deployment Guide: `V2_DEPLOYMENT_GUIDE.md`
- Complete Summary: `V2_COMPLETE_SUMMARY.md`

---

## 💡 Example: Complete Booking Flow

```javascript
// 1. User selects region
setRegion('West');

// 2. Fetch cities for West
const citiesResponse = await fetch('/api/regions/West/cities');
const { cities } = await citiesResponse.json();
// cities = ["Mumbai", "Pune", "Ahmedabad", ...]

// 3. User selects city
setCity('Mumbai');

// 4. Submit booking
const bookingData = {
  eventName: "College Fest 2026",
  eventType: "REDBULL_EVENT",
  clientName: "John Doe",
  clientEmail: "john@example.com",
  carId: 1,
  startDate: "2026-02-01",
  endDate: "2026-02-03",
  region: "West",
  city: "Mumbai",
  notes: "Optional notes"
};

const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bookingData)
});

if (response.ok) {
  const booking = await response.json();
  console.log('Booking created:', booking.booking_reference);
}
```

---

**Last Updated:** January 22, 2026  
**Version:** V2  
**Status:** Ready for Integration
