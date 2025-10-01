import { DashboardMetrics, supabase } from "./supabase";

// Dashboard Metrics Queries
export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const [
    { count: activeBuses },
    { count: ongoingTrips },
    { count: totalRoutes },
    { count: totalUsers },
    { count: todayTrips },
    { count: completedTrips },
    { count: cancelledTrips },
  ] = await Promise.all([
    supabase
      .from("buses")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("status", "ongoing"),
    supabase.from("routes").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .gte("started_at", new Date().toISOString().split("T")[0]),
    supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled"),
  ]);

  // Get total passengers from trip_passengers
  const { data: passengersData } = await supabase
    .from("trip_passengers")
    .select("*", { count: "exact", head: true })
    .eq("status", "boarded");

  return {
    activeBuses: activeBuses || 0,
    ongoingTrips: ongoingTrips || 0,
    totalRoutes: totalRoutes || 0,
    totalPassengers: passengersData?.length || 0,
    todayTrips: todayTrips || 0,
    totalUsers: totalUsers || 0,
    completedTrips: completedTrips || 0,
    cancelledTrips: cancelledTrips || 0,
  };
};

// Fleet Management Queries
export const getFleetStatus = async () => {
  const { data, error } = await supabase
    .from("buses")
    .select(
      `
      id,
      plate_number,
      capacity,
      passengers,
      status,
      route_id,
      driver_id,
      routes (
        id,
        name,
        start_address,
        end_address
      ),
      driver:users!fk_driver (
        id,
        fullName,
        contact_number
      ),
      trips!inner (
        id,
        status,
        current_location
      )
    `
    )
    .eq("trips.status", "ongoing")
    .order("plate_number");

  return { data, error };
};

export const getAllBuses = async () => {
  const { data, error } = await supabase
    .from("buses")
    .select(
      `
      id,
      plate_number,
      capacity,
      passengers,
      status,
      route_id,
      driver_id,
      conductor_id,
      routes (
        id,
        name,
        start_address,
        end_address
      ),
      driver:users!fk_driver (
        id,
        fullName,
        contact_number,
        license_number,
        license_expiry
      ),
      conductor:users!buses_conductor_id_fkey (
        id,
        fullName,
        contact_number
      )
    `
    )
    .order("plate_number");

  return { data, error };
};

export const getDrivers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "driver")
    .order("fullName");

  return { data, error };
};

// Trip Management Queries
export const getActiveTrips = async () => {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id,
      status,
      current_location,
      started_at,
      buses (
        id,
        plate_number,
        capacity,
        routes (
          id,
          name,
          start_address,
          end_address
        )
      ),
      driver:users!trips_driver_id_fkey (
        id,
        fullName,
        contact_number
      ),
      trip_passengers (
        id,
        status,
        boarded_at,
        commuter:users (
          id,
          fullName
        )
      )
    `
    )
    .in("status", ["waiting", "ongoing"])
    .order("started_at", { ascending: false });

  return { data, error };
};

export const getTripHistory = async (limit = 50) => {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      cancelled_at,
      cancellation_reason,
      buses (
        id,
        plate_number,
        routes (
          id,
          name
        )
      ),
      driver:users!trips_driver_id_fkey (
        id,
        fullName
      ),
      trip_passengers (
        id,
        status
      )
    `
    )
    .in("status", ["completed", "cancelled"])
    .order("started_at", { ascending: false })
    .limit(limit);

  return { data, error };
};

// User Management
export const getAllUsers = async () => {
  try {
    // Try to get from users table
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.log("Users table query failed:", error.message);
      // Return empty array instead of error to prevent UI crashes
      return { data: [], error: null };
    }

    return { data, error };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return { data: [], error: null };
  }
};

export const getUsersByRole = async (role: string) => {
  try {
    // Try to get from users table
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", role)
      .order("fullName");

    if (error) {
      console.log("Users table query failed for role:", role, error.message);
      // Return empty array instead of error to prevent UI crashes
      return { data: [], error: null };
    }

    return { data, error };
  } catch (error) {
    console.error("Error in getUsersByRole:", error);
    return { data: [], error: null };
  }
};

// Route Management Queries
export const getAllRoutes = async () => {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
};

export const createRoute = async (routeData: {
  name: string;
  start_address: string;
  end_address: string;
}) => {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      ...routeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select();

  return { data, error };
};

export const updateRoute = async (
  routeId: string,
  routeData: {
    name: string;
    start_address: string;
    end_address: string;
  }
) => {
  const { data, error } = await supabase
    .from("routes")
    .update({
      ...routeData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", routeId)
    .select();

  return { data, error };
};

export const deleteRoute = async (routeId: string) => {
  const { data, error } = await supabase
    .from("routes")
    .delete()
    .eq("id", routeId);

  return { data, error };
};

// Analytics Queries
export const getTripAnalytics = async (days = 30) => {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      buses (
        routes (
          name
        )
      )
    `
    )
    .gte(
      "started_at",
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    )
    .order("started_at", { ascending: false });

  return { data, error };
};

export const getRouteUtilization = async () => {
  const { data, error } = await supabase.from("routes").select(`
      id,
      name,
      start_address,
      end_address,
      buses (
        id,
        plate_number,
        status,
        trips (
          id,
          status,
          started_at
        )
      )
    `);

  return { data, error };
};

export const getTravelHistory = async (limit = 100) => {
  // Try to get from travel_history_commuter table with proper join
  const { data: commuterData, error: commuterError } = await supabase
    .from("travel_history_commuter")
    .select(
      `
      id,
      start_location_name,
      end_location_name,
      travel_date,
      route_name,
      status,
      user:users (
        id,
        fullName
      )
    `
    )
    .order("travel_date", { ascending: false })
    .limit(limit);

  // If successful, return the data
  if (commuterData && !commuterError) {
    return { data: commuterData, error: null };
  }

  // If travel_history_commuter table doesn't exist, fall back to trips table
  if (commuterError && commuterError.code === "PGRST200") {
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select(
        `
        id,
        status,
        started_at,
        ended_at,
        buses (
          routes (
            name,
            start_address,
            end_address
          )
        ),
        driver:users!trips_driver_id_fkey (
          id,
          fullName
        )
      `
      )
      .in("status", ["completed", "cancelled"])
      .order("started_at", { ascending: false })
      .limit(limit);

    if (tripsError) {
      return { data: null, error: tripsError };
    }

    // Transform trips data to match expected format
    const transformedData =
      tripsData?.map((trip) => ({
        id: trip.id,
        start_location_name:
          (trip.buses as any)?.routes?.start_address || "Unknown",
        end_location_name:
          (trip.buses as any)?.routes?.end_address || "Unknown",
        travel_date:
          trip.started_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
        route_name: (trip.buses as any)?.routes?.name || "Unknown Route",
        status: trip.status,
        created_at: trip.started_at,
        user: trip.driver,
      })) || [];

    return { data: transformedData, error: null };
  }

  return { data: commuterData, error: commuterError };
};

// Update Operations
export const updateBusStatus = async (
  busId: string,
  status: "active" | "inactive"
) => {
  const { data, error } = await supabase
    .from("buses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", busId)
    .select();

  return { data, error };
};

export const assignDriverToBus = async (busId: string, driverId: string) => {
  const { data, error } = await supabase
    .from("buses")
    .update({ driver_id: driverId, updated_at: new Date().toISOString() })
    .eq("id", busId)
    .select();

  return { data, error };
};

export const updateTripStatus = async (
  tripId: string,
  status: string,
  currentLocation?: any
) => {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (currentLocation) {
    updateData.current_location = currentLocation;
  }

  if (status === "completed") {
    updateData.ended_at = new Date().toISOString();
  } else if (status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("trips")
    .update(updateData)
    .eq("id", tripId)
    .select();

  return { data, error };
};
