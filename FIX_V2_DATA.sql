-- FIX DATA SCRIPT
-- Run this in your Neon SQL Editor to fix names and images

-- 1. Update Car Names (0,1,2 -> 1,2,3) and set Images
UPDATE event_cars 
SET name = 'Event Car 1', image_url = '/cars/car1.png' 
WHERE car_number = 0;

UPDATE event_cars 
SET name = 'Event Car 2', image_url = '/cars/car2.png' 
WHERE car_number = 1;

UPDATE event_cars 
SET name = 'Event Car 3', image_url = '/cars/car3.png' 
WHERE car_number = 2;

-- 2. Ensure Static Car (Car 4) is correct
UPDATE event_cars 
SET name = 'Event Car 4 (Static)', image_url = '/cars/car4.png' 
WHERE car_number = 3;

-- Verify the final data
SELECT car_number, name, image_url, is_static FROM event_cars ORDER BY car_number;
