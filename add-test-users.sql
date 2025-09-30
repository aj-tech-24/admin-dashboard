-- Add some test users to the users table
-- Run this in your Supabase SQL editor to populate the users table with test data

-- First, let's add some test users (you'll need to create these users in Supabase Auth first)
-- Replace these UUIDs with actual user IDs from your auth.users table

-- Example test users (replace with real UUIDs from auth.users)
INSERT INTO public.users (
  id,
  "fullName",
  role,
  contact_number,
  emergency_contact,
  license_number,
  license_expiry,
  push_token,
  updated_at
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001', -- Replace with real UUID
    'John Driver',
    'driver',
    '+1234567890',
    '+1234567891',
    'DL123456789',
    '2025-12-31',
    'test_push_token_1',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002', -- Replace with real UUID
    'Jane Conductor',
    'conductor',
    '+1234567892',
    '+1234567893',
    NULL,
    NULL,
    'test_push_token_2',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003', -- Replace with real UUID
    'Bob Commuter',
    'commuter',
    '+1234567894',
    '+1234567895',
    NULL,
    NULL,
    'test_push_token_3',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000004', -- Replace with real UUID
    'Alice Admin',
    'admin',
    '+1234567896',
    '+1234567897',
    NULL,
    NULL,
    'test_push_token_4',
    NOW()
  );

-- To get the actual user IDs from your auth.users table, run this query first:
-- SELECT id, email FROM auth.users;

-- Then replace the UUIDs above with the actual IDs from your auth.users table
