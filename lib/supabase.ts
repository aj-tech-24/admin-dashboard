import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nbbtnqdvizaxajvaijbv.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYnRucWR2aXpheGFqdmFpamJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.YourActualAnonKeyHere";

// Create a custom storage adapter for web
const createWebStorage = () => {
  return {
    getItem: (key: string) => {
      if (typeof window !== "undefined") {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    setItem: (key: string, value: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem: (key: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createWebStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Database Types
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "driver" | "conductor" | "commuter" | "admin";
  contact_number?: string;
  emergency_contact?: string;
  license_number?: string;
  license_expiry?: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Bus {
  id: string;
  plate_number: string;
  route_id: string;
  driver_id?: string;
  status: "active" | "inactive";
  capacity: number;
  passengers: number;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  name: string;
  start_address: string;
  end_address: string;
  path: any; // PostGIS geography data
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  bus_id: string;
  driver_id: string;
  status: "waiting" | "ongoing" | "completed" | "cancelled";
  current_location?: any; // PostGIS point data
  started_at?: string;
  ended_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TripPassenger {
  id: string;
  trip_id: string;
  commuter_id: string;
  status: "boarded" | "completed" | "cancelled";
  boarded_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface TravelHistory {
  id: string;
  user_id: string;
  start_location_name: string;
  end_location_name: string;
  travel_date: string;
  route_name: string;
  status: "completed" | "cancelled";
  created_at: string;
}

export interface DashboardMetrics {
  activeBuses: number;
  ongoingTrips: number;
  totalRoutes: number;
  totalPassengers: number;
  todayTrips: number;
  totalUsers: number;
  completedTrips: number;
  cancelledTrips: number;
}
