# Database Setup Guide

## Issue: "Could not load all users data"

This error occurs because the `users` table doesn't exist in your Supabase database yet. The admin dashboard expects a `users` table, but your React Native app is using Supabase Auth's built-in user management.

## Solution Options

### Option 1: Create the Users Table (Recommended)

1. **Open Supabase Dashboard**:

   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Setup Script**:

   - Copy and paste the contents of `setup-database.sql` into the SQL Editor
   - Click "Run" to execute the script

3. **Create an Admin User**:
   - First, create a user through Supabase Auth (Authentication > Users > Add User)
   - Note the user ID
   - Then insert the user into the users table:
   ```sql
   INSERT INTO users (id, fullName, email, role) VALUES
   ('your-admin-user-id-here', 'Admin User', 'admin@miniway.com', 'admin');
   ```

### Option 2: Use Auth Users Only (Alternative)

If you prefer to use only Supabase Auth users without a separate users table, you can modify the admin dashboard to work with auth users only. However, this requires more complex setup and may not provide all the features you need.

## What the Setup Script Creates

The `setup-database.sql` script creates:

- ✅ **users** table with all necessary fields
- ✅ **buses** table for fleet management
- ✅ **routes** table for transportation routes
- ✅ **trips** table for trip tracking
- ✅ **trip_passengers** table for passenger management
- ✅ **pickup_requests** table for on-demand pickups
- ✅ **travel_history_commuter** table for travel history

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  fullName TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'conductor', 'commuter')),
  contact_number TEXT,
  emergency_contact TEXT,
  license_number TEXT,
  license_expiry DATE,
  push_token TEXT,
  avatar_url TEXT,
  home_location TEXT,
  work_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

The setup script also configures Row Level Security policies that allow:

- Admin users to read all data
- Proper access control for different user roles

## After Setup

1. **Test the Admin Dashboard**:

   - Refresh your admin dashboard
   - The "Could not load all users data" error should be resolved
   - You should see your users in the User Management page

2. **Add More Users**:

   - Create users through your React Native app
   - Or add them directly through Supabase Auth and the users table

3. **Configure Permissions**:
   - Ensure your admin user has the correct role in the users table
   - Test that you can access all dashboard features

## Troubleshooting

### Still Getting Errors?

1. **Check Database Connection**:

   - Verify your Supabase URL and API key in `.env.local`
   - Test the connection in Supabase dashboard

2. **Check User Permissions**:

   - Ensure your user has admin role in the users table
   - Verify RLS policies are correctly set up

3. **Check Console Logs**:
   - Open browser developer tools
   - Look for specific error messages in the console

### Need Help?

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are correctly set

## Next Steps

Once the database is set up:

1. ✅ Users page will load without errors
2. ✅ You can manage drivers, conductors, and commuters
3. ✅ All other dashboard features will work properly
4. ✅ Real-time updates will function correctly
