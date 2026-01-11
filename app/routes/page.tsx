"use client";

import {
  CompassOutlined,
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Button as AntButton,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
  Polyline,
} from "@react-google-maps/api";
import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "../../lib/queries";
import { useAuth } from "../providers/AuthProvider";
import { Toaster } from "react-hot-toast";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Route {
  id: string;
  name: string;
  start_address: string | null;
  end_address: string | null;
  path?: any; // geography/GeoJSON
  created_at: string;
}

// Types for geocoding and directions
interface GeocodedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

interface RouteInfo {
  path: google.maps.LatLngLiteral[];
  summary: string;
  distance: string;
  duration: string;
}

export default function RoutesPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data already loaded
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Map state
  const [mapMode, setMapMode] = useState<"start" | "end">("start");
  const [startPosition, setStartPosition] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [endPosition, setEndPosition] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({
    lat: 6.7496,
    lng: 125.3582,
  }); // Digos City, Davao del Sur coordinates as default
  const [showStartInfo, setShowStartInfo] = useState(false);
  const [showEndInfo, setShowEndInfo] = useState(false);

  // Keep track of map instance
  const mapRef = useRef<google.maps.Map | null>(null);

  // Route preview state
  const [routePolylines, setRoutePolylines] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  // Log the Google Maps API key for debugging
  console.log(
    "Google Maps API Key:",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  // Enhanced debugging logs for Google Maps loading
  useEffect(() => {
    if (loadError) {
      console.error("Google Maps loading error:", loadError);
      message.error("Failed to load Google Maps. Please check your API key.");
    } else if (!isLoaded) {
      console.log("Google Maps is still loading...");
    } else {
      console.log("Google Maps loaded successfully.");
    }
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !isAdmin) {
      message.error("Access denied. Admin privileges required.");
      router.push("/");
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    let isSubscribed = true;

    if (user && isAdmin && !dataLoaded && isSubscribed) {
      console.log("Loading routes data for the first time");
      loadRoutes();
      setDataLoaded(true);
    }

    return () => {
      isSubscribed = false;
    };
  }, [user, isAdmin, dataLoaded]);

  const loadRoutes = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await getAllRoutes();

      if (error) {
        console.error("Error loading routes:", error);
        message.error("Failed to load routes");
        setRoutes([]);
      } else {
        setRoutes(data || []);
      }
    } catch (error) {
      console.error("Error loading routes:", error);
      message.error("Failed to load routes");
      setRoutes([]);
    } finally {
      setLoadingData(false);
    }
  };
  const handleSubmit = async (values: any) => {
    // Validate that a route has been previewed and selected
    if (selectedRouteIndex === null || !routePolylines[selectedRouteIndex]) {
      message.error(
        "Please preview the route and select a path before saving."
      );
      return;
    }
    setSubmitting(true);
    try {
      // Create GeoJSON LineString from selected route
      const coordinates = routePolylines[selectedRouteIndex].path.map(
        (coord) => [coord.lng, coord.lat]
      );

      // Convert to GeoJSON string format for PostGIS
      const pathGeoJSON = JSON.stringify({
        type: "LineString",
        coordinates: coordinates,
      });

      const routeData = {
        name: values.name,
        start_address: values.start_address,
        end_address: values.end_address,
        path: pathGeoJSON, // Send as JSON string
      };

      let result: any;
      if (editingRoute) {
        // Update existing route
        result = await updateRoute(editingRoute.id, routeData);
      } else {
        // Create new route
        result = await createRoute(routeData);
      }

      if (result?.error) {
        console.error("Route save error:", result.error);
        message.error(result.error.message || "Failed to save route");
        return;
      }

      message.success(
        editingRoute
          ? "Route updated successfully"
          : "Route created successfully"
      );
      setModalVisible(false);
      setEditingRoute(null);
      form.resetFields();
      setStartPosition(null);
      setEndPosition(null);
      setRoutePolylines([]);
      setSelectedRouteIndex(null);
      await loadRoutes();
    } catch (err) {
      console.error("Exception saving route:", err);
      message.error("Failed to save route (see console)");
    } finally {
      setSubmitting(false);
    }
  };
  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setRoutePolylines([]);
    setSelectedRouteIndex(null);
    setStartPosition(null);
    setEndPosition(null);

    form.setFieldsValue({
      name: route.name,
      start_address: route.start_address || "",
      end_address: route.end_address || "",
    });

    setModalVisible(true);
  };
  const handleDelete = async (routeId: string) => {
    try {
      console.log("Attempting to delete route with ID:", routeId);

      const result: any = await deleteRoute(routeId);
      console.log("Delete result:", result);

      if (result?.error) {
        console.error("Route delete error:", result.error);
        message.error(`Failed to delete route: ${result.error.message || "Unknown error"}`);
        return;
      }

      console.log("Route deleted successfully");
      message.success("Route deleted successfully");
      await loadRoutes();
    } catch (err) {
      console.error("Exception deleting route:", err);
      message.error(`Failed to delete route: ${String(err)}`);
    }
  };
  const openCreateModal = () => {
    setEditingRoute(null);
    form.resetFields();
    setStartPosition(null);
    setEndPosition(null);
    setRoutePolylines([]);
    setSelectedRouteIndex(null);
    setMapMode("start");
    setModalVisible(true);
  };

  // Unified cleanup function for modal close
  const handleModalClose = () => {
    setModalVisible(false);
    setEditingRoute(null);
    form.resetFields();
    setStartPosition(null);
    setEndPosition(null);
    setRoutePolylines([]);
    setSelectedRouteIndex(null);
  };
  // --- Reverse Geocoding: Convert Coordinates to Address ---
  const reverseGeocode = async (
    lat: number,
    lng: number
  ): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.error(
          "Reverse geocoding error:",
          data.status,
          data.error_message
        );
        return null;
      }
    } catch (error) {
      console.error("Reverse geocoding API call failed:", error);
      return null;
    }
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const position = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    // Get address from coordinates
    const address = await reverseGeocode(position.lat, position.lng);

    if (mapMode === "start") {
      setStartPosition(position);
      setShowStartInfo(true);
      setShowEndInfo(false);

      // Update the form field with the geocoded address
      if (address) {
        form.setFieldValue("start_address", address);
        message.success(`Start point set: ${address}`);
      }
    } else {
      setEndPosition(position);
      setShowEndInfo(true);
      setShowStartInfo(false);

      // Update the form field with the geocoded address
      if (address) {
        form.setFieldValue("end_address", address);
        message.success(`End point set: ${address}`);
      }
    }
  };
  const centerMyLocation = () => {
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds timeout
        maximumAge: 0, // Don't use cached location, get fresh location
      };

      message.loading("Getting your location...", 0);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newCenter = { lat: latitude, lng: longitude };
          setMapCenter(newCenter);
          message.destroy(); // Clear loading message
          message.success(
            `Centered on your location (${latitude.toFixed(
              4
            )}, ${longitude.toFixed(4)}) - Accuracy: ${Math.round(accuracy)}m`
          );
        },
        (error) => {
          message.destroy(); // Clear loading message
          console.error("Error getting location:", error);
          let errorMessage = "";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please enable location permissions in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Location information unavailable. Your device GPS might be disabled.";
              break;
            case error.TIMEOUT:
              errorMessage =
                "Location request timed out. Please check your GPS/internet connection.";
              break;
            default:
              errorMessage =
                "An unknown error occurred while retrieving location.";
              break;
          }

          message.error(errorMessage);

          // Fallback to Digos City coordinates
          message.info("Using default location: Digos City, Davao del Sur");
          setMapCenter({ lat: 6.7496, lng: 125.3582 });
        },
        options
      );
    } else {
      message.error("Geolocation is not supported by this browser.");
      // Fallback to Digos City coordinates
      message.info("Using default location: Digos City, Davao del Sur");
      setMapCenter({ lat: 6.7496, lng: 125.3582 });
    }
  };

  // Function to manually center on Digos City
  const centerOnDigosCity = () => {
    setMapCenter({ lat: 6.7496, lng: 125.3582 });
    message.success("Centered on Digos City, Davao del Sur");
  };

  // --- Geocoding Addresses to Coordinates ---
  const geocodeAddress = async (
    address: string
  ): Promise<GeocodedLocation | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return {
          latitude: lat,
          longitude: lng,
          name: data.results[0].formatted_address,
        };
      } else {
        console.error("Geocoding error:", data.status, data.error_message);
        message.error(
          `Could not find coordinates for: ${address}. Please be more specific.`
        );
        return null;
      }
    } catch (error) {
      console.error("Geocoding API call failed:", error);
      message.error("Failed to connect to geocoding service.");
      return null;
    }
  };
  // --- Fetching Directions between Coordinates ---
  const fetchDirections = async (
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral
  ): Promise<RouteInfo[] | null> => {
    try {
      // Use Google Maps JavaScript API DirectionsService (works in browser)
      const directionsService = new google.maps.DirectionsService();

      const request: google.maps.DirectionsRequest = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      };

      return new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const allRoutes: RouteInfo[] = result.routes.map((route) => {
              // Extract path from the route
              const path: google.maps.LatLngLiteral[] = [];
              route.legs.forEach((leg) => {
                leg.steps.forEach((step) => {
                  step.path.forEach((point) => {
                    path.push({ lat: point.lat(), lng: point.lng() });
                  });
                });
              });

              return {
                path: path,
                summary: route.summary || "No summary available",
                distance: route.legs[0]?.distance?.text || "N/A",
                duration: route.legs[0]?.duration?.text || "N/A",
              };
            });
            resolve(allRoutes);
          } else {
            console.error("Directions API error:", status);
            message.error(
              "Could not find a route between the specified locations."
            );
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error("Directions API call failed:", error);
      message.error("Failed to connect to directions service.");
      return null;
    }
  };

  // --- Preview Route ---
  const previewRoute = async () => {
    const values = form.getFieldsValue();
    if (!values.name?.trim()) {
      message.error("Please enter a route name.");
      return;
    }
    if (!values.start_address?.trim() || !values.end_address?.trim()) {
      message.error("Please enter both origin and destination addresses.");
      return;
    }

    setPreviewLoading(true);
    setRoutePolylines([]);
    setSelectedRouteIndex(null);
    setStartPosition(null);
    setEndPosition(null);

    try {
      // Geocode Origin
      const originLoc = await geocodeAddress(values.start_address);
      if (!originLoc) return;
      setStartPosition({ lat: originLoc.latitude, lng: originLoc.longitude });

      // Geocode Destination
      const destLoc = await geocodeAddress(values.end_address);
      if (!destLoc) return;
      setEndPosition({ lat: destLoc.latitude, lng: destLoc.longitude });

      // Fetch Directions
      const routes = await fetchDirections(
        { lat: originLoc.latitude, lng: originLoc.longitude },
        { lat: destLoc.latitude, lng: destLoc.longitude }
      );
      if (!routes || routes.length === 0) return;
      setRoutePolylines(routes);
      setSelectedRouteIndex(0); // Select the first route by default

      // Fit map to show the entire route
      if (mapRef.current && routes[0].path.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        routes[0].path.forEach((p) => bounds.extend(p));
        bounds.extend({ lat: originLoc.latitude, lng: originLoc.longitude });
        bounds.extend({ lat: destLoc.latitude, lng: destLoc.longitude });
        mapRef.current.fitBounds(bounds);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  const columns = [
    {
      title: "Route Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CompassOutlined style={{ color: "white", fontSize: "16px" }} />
          </div>
          <Text strong style={{ color: "#1e293b", fontSize: "14px" }}>
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: "Start Address",
      dataIndex: "start_address",
      key: "start_address",
      render: (text: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.2)",
            }}
          />
          <Text style={{ color: "#64748b", fontSize: "13px" }}>
            {text ? (text.length > 40 ? text.substring(0, 40) + "..." : text) : "N/A"}
          </Text>
        </div>
      ),
    },
    {
      title: "End Address",
      dataIndex: "end_address",
      key: "end_address",
      render: (text: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.2)",
            }}
          />
          <Text style={{ color: "#64748b", fontSize: "13px" }}>
            {text ? (text.length > 40 ? text.substring(0, 40) + "..." : text) : "N/A"}
          </Text>
        </div>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (text: string) => (
        <Text style={{ color: "#94a3b8", fontSize: "12px" }}>
          {formatTime(text)}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Route) => (
        <Space size="small">
          <AntButton
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{
              color: "#6366f1",
              borderRadius: "8px",
            }}
          >
            Edit
          </AntButton>
          <AntButton
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: "Delete Route",
                content: `Are you sure you want to delete the route "${record.name}"?`,
                okText: "Delete",
                okButtonProps: { danger: true },
                onOk: () => handleDelete(record.id),
              });
            }}
            style={{ borderRadius: "8px" }}
          >
            Delete
          </AntButton>
        </Space>
      ),
    },
  ];

  // Only show loading screen during initial authentication or first data load
  if ((loading && !user) || (loadingData && !dataLoaded)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Fix implicit 'any' type for event parameters
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end",
    coord: "lat" | "lng"
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      if (type === "start") {
        setStartPosition((prev) => ({
          lat: coord === "lat" ? value : prev?.lat || 0,
          lng: coord === "lng" ? value : prev?.lng || 0,
        }));
      } else {
        setEndPosition((prev) => ({
          lat: coord === "lat" ? value : prev?.lat || 0,
          lng: coord === "lng" ? value : prev?.lng || 0,
        }));
      }
    }
  };

  return (
    <div className="admin-layout">
      {/* Enhanced Header */}
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
            onClick={() => router.push("/")}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(240, 147, 251, 0.4)",
              }}
            >
              <CompassOutlined style={{ fontSize: "22px", color: "white" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Routes
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Route Management
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AntButton
            onClick={() => router.push("/")}
            icon={<DashboardOutlined />}
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#6366f1",
              borderRadius: "12px",
              fontWeight: 600,
              height: "40px",
            }}
          >
            Dashboard
          </AntButton>
          <AntButton
            onClick={loadRoutes}
            icon={<ReloadOutlined spin={loadingData} />}
            type="primary"
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              height: "40px",
              boxShadow: "0 4px 12px rgba(240, 147, 251, 0.4)",
            }}
          >
            Refresh
          </AntButton>
        </div>
      </div>

      <div className="admin-content">
        {/* Hero Section */}
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col span={24}>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)",
                padding: "40px",
                borderRadius: "24px",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  left: "-50px",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                }}
              />
              <Title
                level={1}
                style={{
                  color: "white",
                  marginBottom: "12px",
                  fontSize: "42px",
                  fontWeight: 800,
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  position: "relative",
                }}
              >
                🗺️ Route Management
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: 500,
                  position: "relative",
                }}
              >
                Create and manage transportation routes with interactive maps
              </Text>
            </div>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[20, 20]} style={{ marginBottom: "32px" }}>
          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(102, 126, 234, 0.3)",
                  }}
                >
                  <CompassOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {routes.length}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Total Routes
                </div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <EnvironmentOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {routes.length}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Active Routes
                </div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(240, 147, 251, 0.3)",
                  }}
                >
                  <EnvironmentOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {routes.filter(r => r.path).length}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Routes with Paths
                </div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onClick={openCreateModal}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(6, 182, 212, 0.3)",
                  }}
                >
                  <PlusOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#06b6d4", lineHeight: 1 }}>
                  Add New
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Create Route
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Routes Table Card */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CompassOutlined style={{ color: "white", fontSize: "18px" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                  Transportation Routes
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {routes.length} routes configured
                </div>
              </div>
            </div>
          }
          extra={
            <AntButton
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                border: "none",
                borderRadius: "10px",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(240, 147, 251, 0.3)",
              }}
            >
              Add Route
            </AntButton>
          }
          style={{
            borderRadius: "20px",
            border: "none",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Table
            columns={columns}
            dataSource={routes}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} routes`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>{" "}
        <Modal
          title={editingRoute ? "Edit Route" : "Add New Route"}
          open={modalVisible}
          onCancel={handleModalClose}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Route Name"
              name="name"
              rules={[{ required: true, message: "Please enter route name!" }]}
            >
              <Input placeholder="e.g., Downtown to Airport" />
            </Form.Item>
            <Form.Item
              label="Start Address"
              name="start_address"
              rules={[
                { required: true, message: "Please enter start address!" },
              ]}
            >
              <TextArea
                rows={2}
                placeholder="e.g., 123 Main Street, Downtown"
              />
            </Form.Item>
            <Form.Item
              label="End Address"
              name="end_address"
              rules={[{ required: true, message: "Please enter end address!" }]}
            >
              <TextArea
                rows={2}
                placeholder="e.g., International Airport Terminal 1"
              />
            </Form.Item>{" "}
            <Form.Item>
              <AntButton
                type="default"
                onClick={previewRoute}
                loading={previewLoading}
                disabled={
                  !form.getFieldValue("start_address") ||
                  !form.getFieldValue("end_address")
                }
                style={{
                  background:
                    selectedRouteIndex !== null ? "#52c41a" : undefined,
                  borderColor:
                    selectedRouteIndex !== null ? "#52c41a" : undefined,
                  color: selectedRouteIndex !== null ? "white" : undefined,
                }}
              >
                {selectedRouteIndex !== null
                  ? "✓ Route Selected"
                  : "Preview Route"}
              </AntButton>
              {selectedRouteIndex === null && (
                <Text type="secondary" style={{ marginLeft: "12px" }}>
                  (Required before saving)
                </Text>
              )}
            </Form.Item>
            {routePolylines.length > 0 && (
              <Form.Item label="Select a Route">
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {routePolylines.map((route, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "12px",
                        border: `2px solid ${selectedRouteIndex === index ? "#007AFF" : "#ddd"
                          }`,
                        borderRadius: "8px",
                        marginBottom: "8px",
                        backgroundColor:
                          selectedRouteIndex === index ? "#e6f2ff" : "#fff",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedRouteIndex(index)}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        Via {route.summary}
                      </div>
                      <div style={{ color: "#666" }}>
                        {route.duration} ({route.distance})
                      </div>
                    </div>
                  ))}
                </div>
              </Form.Item>
            )}{" "}
            <Form.Item label="Set Route Locations on Map">
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <Space wrap>
                    <AntButton
                      type={mapMode === "start" ? "primary" : "default"}
                      onClick={() => setMapMode("start")}
                      icon={
                        <EnvironmentOutlined style={{ color: "#52c41a" }} />
                      }
                      disabled={!!loadError}
                    >
                      Set Start Point
                    </AntButton>
                    <AntButton
                      type={mapMode === "end" ? "primary" : "default"}
                      onClick={() => setMapMode("end")}
                      icon={
                        <EnvironmentOutlined style={{ color: "#ff4d4f" }} />
                      }
                      disabled={!!loadError}
                    >
                      Set End Point
                    </AntButton>
                    <AntButton
                      onClick={() => {
                        setStartPosition(null);
                        setEndPosition(null);
                      }}
                    >
                      Clear Points
                    </AntButton>
                  </Space>
                  <Space wrap>
                    <AntButton
                      onClick={centerMyLocation}
                      icon={<EnvironmentOutlined />}
                      disabled={!!loadError}
                    >
                      My Location
                    </AntButton>
                    <AntButton
                      onClick={centerOnDigosCity}
                      icon={<CompassOutlined />}
                      disabled={!!loadError}
                    >
                      Digos City
                    </AntButton>
                  </Space>
                </div>
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: "8px" }}
                >
                  {loadError
                    ? "Google Maps failed to load. Use manual coordinate entry below."
                    : mapMode === "start"
                      ? "Click on the map to set the starting location"
                      : "Click on the map to set the ending location"}{" "}
                </Text>
              </div>

              <div
                style={{
                  height: "400px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                }}
              >
                {loadError ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    <EnvironmentOutlined
                      style={{
                        fontSize: "48px",
                        color: "#ff4d4f",
                        marginBottom: "16px",
                      }}
                    />
                    <Text strong style={{ marginBottom: "8px" }}>
                      Google Maps Failed to Load
                    </Text>
                    <Text type="secondary" style={{ marginBottom: "16px" }}>
                      Please check your Google Maps API key configuration.
                    </Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      You can still create routes by entering coordinates
                      manually below.
                    </Text>
                    <div style={{ marginTop: "16px", color: "#faad14" }}>
                      <Text strong>Note:</Text> Some browser extensions, such as
                      ad blockers, may block Google Maps from loading. Please
                      disable such extensions and try again.
                    </div>
                  </div>
                ) : !isLoaded ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Spin size="large" />
                  </div>
                ) : (
                  <GoogleMap
                    zoom={14}
                    center={mapCenter}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    onClick={handleMapClick}
                    onLoad={(map) => {
                      mapRef.current = map;
                    }}
                  >
                    {startPosition && (
                      <>
                        <Marker
                          position={startPosition}
                          icon={{
                            url: "/start-marker.png",
                            scaledSize: new google.maps.Size(32, 32),
                          }}
                          onClick={() => setShowStartInfo(true)}
                        />
                        {showStartInfo && (
                          <InfoWindow
                            position={startPosition}
                            onCloseClick={() => setShowStartInfo(false)}
                          >
                            <div>
                              <h3 className="font-semibold">Start Point</h3>
                              <p>Lat: {startPosition.lat.toFixed(6)}</p>
                              <p>Lng: {startPosition.lng.toFixed(6)}</p>
                            </div>
                          </InfoWindow>
                        )}
                      </>
                    )}

                    {endPosition && (
                      <>
                        <Marker
                          position={endPosition}
                          icon={{
                            url: "/end-marker.png",
                            scaledSize: new google.maps.Size(32, 32),
                          }}
                          onClick={() => setShowEndInfo(true)}
                        />
                        {showEndInfo && (
                          <InfoWindow
                            position={endPosition}
                            onCloseClick={() => setShowEndInfo(false)}
                          >
                            <div>
                              <h3 className="font-semibold">End Point</h3>
                              <p>Lat: {endPosition.lat.toFixed(6)}</p>
                              <p>Lng: {endPosition.lng.toFixed(6)}</p>
                            </div>
                          </InfoWindow>
                        )}
                      </>
                    )}
                    {routePolylines.map((route, index) => (
                      <Polyline
                        key={index}
                        path={route.path}
                        options={{
                          strokeColor:
                            selectedRouteIndex === index
                              ? "#007AFF"
                              : "#aab5c2",
                          strokeWeight: selectedRouteIndex === index ? 6 : 4,
                        }}
                      />
                    ))}
                  </GoogleMap>
                )}
              </div>

              {(startPosition || endPosition) && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: "6px",
                  }}
                >
                  <Text strong>Selected Locations:</Text>
                  <div style={{ marginTop: "8px" }}>
                    {startPosition && (
                      <div style={{ color: "#52c41a", marginBottom: "4px" }}>
                        🟢 Start: {startPosition.lat.toFixed(6)},{" "}
                        {startPosition.lng.toFixed(6)}
                      </div>
                    )}
                    {endPosition && (
                      <div style={{ color: "#ff4d4f" }}>
                        🔴 End: {endPosition.lat.toFixed(6)},{" "}
                        {endPosition.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loadError && (
                <div style={{ marginTop: "16px" }}>
                  <Text
                    strong
                    style={{ marginBottom: "8px", display: "block" }}
                  >
                    Manual Coordinate Entry
                  </Text>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Start Latitude">
                        <Input
                          placeholder="e.g., 14.599512"
                          value={startPosition?.lat || ""}
                          onChange={(e) => handleInputChange(e, "start", "lat")}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Start Longitude">
                        <Input
                          placeholder="e.g., 120.984222"
                          value={startPosition?.lng || ""}
                          onChange={(e) => handleInputChange(e, "start", "lng")}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="End Latitude">
                        <Input
                          placeholder="e.g., 14.508647"
                          value={endPosition?.lat || ""}
                          onChange={(e) => handleInputChange(e, "end", "lat")}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="End Longitude">
                        <Input
                          placeholder="e.g., 121.019581"
                          value={endPosition?.lng || ""}
                          onChange={(e) => handleInputChange(e, "end", "lng")}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              )}
            </Form.Item>{" "}
            <Form.Item>
              <Space>
                <AntButton
                  type="primary"
                  htmlType="submit"
                  disabled={submitting || selectedRouteIndex === null}
                  title={
                    selectedRouteIndex === null
                      ? "Please preview and select a route first"
                      : ""
                  }
                >
                  {editingRoute ? "Update Route" : "Create Route"}
                </AntButton>{" "}
                <AntButton onClick={handleModalClose}>Cancel</AntButton>
              </Space>
            </Form.Item>
            {selectedRouteIndex === null && (
              <Text
                type="warning"
                style={{ display: "block", marginTop: "8px" }}
              >
                ⚠️ Please click "Preview Route" and select a path before saving.
              </Text>
            )}
          </Form>
        </Modal>
      </div>
      <Toaster />
    </div>
  );
}
