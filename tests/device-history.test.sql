-- Test script to verify device history tracking works correctly
-- Run this in your Supabase SQL editor to test

-- First, let's check if the trigger and function exist
SELECT 
    p.proname AS function_name,
    t.tgname AS trigger_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'devices'::regclass;

-- Insert a test device
INSERT INTO devices (id, user_id, dsn, product_name, connection_status)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1), -- Use an existing user ID
    'TEST-DSN-001',
    'Test Grill',
    'Online'
) RETURNING id;

-- Store the device ID for testing (replace with actual ID from above)
-- Example: SET LOCAL test.device_id = 'your-device-id-here';

-- Update the device to trigger history
UPDATE devices 
SET 
    connection_status = 'Offline',
    temp_grill = 225.5,
    cook_mode = 'smoke'
WHERE dsn = 'TEST-DSN-001';

-- Check if history was recorded
SELECT 
    dh.id,
    dh.operation,
    dh.recorded_at,
    dh.changes
FROM device_history dh
JOIN devices d ON dh.device_id = d.id
WHERE d.dsn = 'TEST-DSN-001'
ORDER BY dh.recorded_at DESC;

-- Cleanup (optional)
-- DELETE FROM devices WHERE dsn = 'TEST-DSN-001';