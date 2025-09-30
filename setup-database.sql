-- Setup script for Miniway Admin Dashboard Database
-- Run this in your Supabase SQL Editor

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create buses table if it doesn't exist
CREATE TABLE IF NOT EXISTS buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  route_id UUID,
  driver_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  capacity INTEGER NOT NULL DEFAULT 20,
  passengers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_address TEXT NOT NULL,
  end_address TEXT NOT NULL,
  path GEOGRAPHY(LINESTRING),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table if it doesn't exist
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ongoing', 'completed', 'cancelled')),
  current_location GEOGRAPHY(POINT),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trip_passengers table if it doesn't exist
CREATE TABLE IF NOT EXISTS trip_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  commuter_id UUID NOT NULL,
  bus_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'boarded' CHECK (status IN ('boarded', 'completed', 'cancelled')),
  boarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commuter_id UUID NOT NULL,
  bus_id UUID,
  pickup_location GEOGRAPHY(POINT) NOT NULL,
  destination_location GEOGRAPHY(POINT) NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  special_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create travel_history_commuter table if it doesn't exist
CREATE TABLE IF NOT EXISTS travel_history_commuter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  start_location_name TEXT NOT NULL,
  end_location_name TEXT NOT NULL,
  travel_date DATE NOT NULL,
  route_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE buses ADD CONSTRAINT fk_buses_route FOREIGN KEY (route_id) REFERENCES routes(id);
ALTER TABLE buses ADD CONSTRAINT fk_buses_driver FOREIGN KEY (driver_id) REFERENCES users(id);
ALTER TABLE trips ADD CONSTRAINT fk_trips_bus FOREIGN KEY (bus_id) REFERENCES buses(id);
ALTER TABLE trips ADD CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES users(id);
ALTER TABLE trip_passengers ADD CONSTRAINT fk_trip_passengers_trip FOREIGN KEY (trip_id) REFERENCES trips(id);
ALTER TABLE trip_passengers ADD CONSTRAINT fk_trip_passengers_commuter FOREIGN KEY (commuter_id) REFERENCES users(id);
ALTER TABLE trip_passengers ADD CONSTRAINT fk_trip_passengers_bus FOREIGN KEY (bus_id) REFERENCES buses(id);
ALTER TABLE pickup_requests ADD CONSTRAINT fk_pickup_requests_commuter FOREIGN KEY (commuter_id) REFERENCES users(id);
ALTER TABLE pickup_requests ADD CONSTRAINT fk_pickup_requests_bus FOREIGN KEY (bus_id) REFERENCES buses(id);
ALTER TABLE travel_history_commuter ADD CONSTRAINT fk_travel_history_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_bus ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip ON trip_passengers(trip_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_commuter ON pickup_requests(commuter_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_history_commuter ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
-- Admin users can read all data
CREATE POLICY "Admin can read all users" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all buses" ON buses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all routes" ON routes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all trips" ON trips FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all trip_passengers" ON trip_passengers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all pickup_requests" ON pickup_requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can read all travel_history" ON travel_history_commuter FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Insert a sample admin user (replace with your actual admin credentials)
-- You'll need to create this user through Supabase Auth first, then update the users table
-- INSERT INTO users (id, fullName, email, role) VALUES 
-- ('your-admin-user-id-here', 'Admin User', 'admin@miniway.com', 'admin');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pickup_requests_updated_at BEFORE UPDATE ON pickup_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
