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
  const [routeVersion, setRouteVersion] = useState(0); // Used to force Polyline re-render

  // Location picker modal state
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<"start" | "end">("start");
  const [tempPickerPosition, setTempPickerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const pickerMapRef = useRef<google.maps.Map | null>(null);

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

    // Check if we have pinned positions OR addresses
    const hasStartPin = startPosition !== null;
    const hasEndPin = endPosition !== null;
    const hasStartAddress = values.start_address?.trim();
    const hasEndAddress = values.end_address?.trim();

    if ((!hasStartPin && !hasStartAddress) || (!hasEndPin && !hasEndAddress)) {
      message.error("Please set both origin and destination (use 'Pick on Map' or enter addresses).");
      return;
    }

    setPreviewLoading(true);
    setRoutePolylines([]);
    setSelectedRouteIndex(null);
    setRouteVersion(v => v + 1); // Force Polyline re-mount

    try {
      let originCoords = startPosition;
      let destCoords = endPosition;

      // Only geocode if we don't have pinned coordinates
      if (!originCoords && hasStartAddress) {
        const originLoc = await geocodeAddress(values.start_address);
        if (!originLoc) return;
        originCoords = { lat: originLoc.latitude, lng: originLoc.longitude };
        setStartPosition(originCoords);
      }

      if (!destCoords && hasEndAddress) {
        const destLoc = await geocodeAddress(values.end_address);
        if (!destLoc) return;
        destCoords = { lat: destLoc.latitude, lng: destLoc.longitude };
        setEndPosition(destCoords);
      }

      if (!originCoords || !destCoords) {
        message.error("Could not determine route coordinates.");
        return;
      }

      // Fetch Directions using the coordinates (pinned or geocoded)
      const routes = await fetchDirections(originCoords, destCoords);
      if (!routes || routes.length === 0) return;
      setRoutePolylines(routes);
      setSelectedRouteIndex(0); // Select the first route by default

      // Fit map to show the entire route
      if (mapRef.current && routes[0].path.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        routes[0].path.forEach((p) => bounds.extend(p));
        bounds.extend(originCoords);
        bounds.extend(destCoords);
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
        </Card>
        <Modal
          open={modalVisible}
          onCancel={handleModalClose}
          footer={null}
          width={900}
          styles={{
            content: {
              padding: 0,
              borderRadius: "24px",
              overflow: "hidden",
            },
            body: {
              padding: 0,
            },
          }}
          closable={false}
        >
          {/* Premium Modal Header with Progress */}
          <div
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              padding: "24px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative elements */}
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.1)" }} />
            <div style={{ position: "absolute", bottom: "-30px", left: "30%", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.08)" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CompassOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>
                    {editingRoute ? "Edit Route" : "Create New Route"}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", marginTop: "2px" }}>
                    Quick 2-step process
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "rgba(255,255,255,0.2)", borderRadius: "20px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#f093fb" }}>1</div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "white" }}>Info</span>
                </div>
                <div style={{ width: "20px", height: "2px", background: "rgba(255,255,255,0.4)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: selectedRouteIndex !== null ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", borderRadius: "20px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: selectedRouteIndex !== null ? "white" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: selectedRouteIndex !== null ? "#10b981" : "white" }}>{selectedRouteIndex !== null ? "✓" : "2"}</div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "white" }}>Select</span>
                </div>
              </div>

              <AntButton
                type="text"
                onClick={handleModalClose}
                style={{
                  color: "white",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                ✕
              </AntButton>
            </div>
          </div>

          {/* Modal Body */}
          <div style={{ padding: "28px 32px", maxHeight: "70vh", overflowY: "auto" }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>

              {/* Step 1: Route Details */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(240, 147, 251, 0.08) 0%, rgba(245, 87, 108, 0.08) 100%)",
                  borderRadius: "16px",
                  padding: "24px",
                  marginBottom: "24px",
                  border: "1px solid rgba(240, 147, 251, 0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CompassOutlined style={{ fontSize: "14px", color: "white" }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>Route Information</div>
                </div>

                <Form.Item
                  name="name"
                  rules={[{ required: true, message: "Please enter route name!" }]}
                  style={{ marginBottom: "16px" }}
                >
                  <Input
                    placeholder="Enter route name (e.g., Downtown to Airport)"
                    prefix={<CompassOutlined style={{ color: "#f093fb" }} />}
                    style={{
                      height: "48px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      border: "2px solid #e2e8f0",
                    }}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.2)" }} />
                        <Text style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, textTransform: "uppercase" }}>Start Point</Text>
                      </div>
                      <div
                        onClick={() => { setLocationPickerType("start"); setTempPickerPosition(startPosition); setLocationPickerOpen(true); }}
                        style={{ padding: "4px 10px", borderRadius: "6px", background: "#dcfce7", color: "#16a34a", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        📍 Pick on Map
                      </div>
                    </div>
                    <Form.Item
                      name="start_address"
                      rules={[{ required: true, message: "Please enter start address!" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea
                        rows={2}
                        placeholder="Start address or click 'Pick on Map'..."
                        style={{
                          borderRadius: "12px",
                          border: "2px solid #e2e8f0",
                          resize: "none",
                        }}
                      />
                    </Form.Item>
                    {startPosition && (
                      <Text style={{ fontSize: "10px", color: "#10b981", marginTop: "4px", display: "block" }}>
                        📌 {startPosition.lat.toFixed(5)}, {startPosition.lng.toFixed(5)}
                      </Text>
                    )}
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.2)" }} />
                        <Text style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, textTransform: "uppercase" }}>End Point</Text>
                      </div>
                      <div
                        onClick={() => { setLocationPickerType("end"); setTempPickerPosition(endPosition); setLocationPickerOpen(true); }}
                        style={{ padding: "4px 10px", borderRadius: "6px", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        📍 Pick on Map
                      </div>
                    </div>
                    <Form.Item
                      name="end_address"
                      rules={[{ required: true, message: "Please enter end address!" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea
                        rows={2}
                        placeholder="End address or click 'Pick on Map'..."
                        style={{
                          borderRadius: "12px",
                          border: "2px solid #e2e8f0",
                          resize: "none",
                        }}
                      />
                    </Form.Item>
                    {endPosition && (
                      <Text style={{ fontSize: "10px", color: "#ef4444", marginTop: "4px", display: "block" }}>
                        📌 {endPosition.lat.toFixed(5)}, {endPosition.lng.toFixed(5)}
                      </Text>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Step 2: Map & Route Selection */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "20px",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                }}
              >
                {/* Section Header with Generate Button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <EnvironmentOutlined style={{ fontSize: "14px", color: "white" }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>Map & Route Selection</div>
                  </div>
                  <AntButton
                    onClick={previewRoute}
                    loading={previewLoading}
                    style={{
                      height: "40px",
                      borderRadius: "10px",
                      fontWeight: 600,
                      padding: "0 20px",
                      background: routePolylines.length > 0 ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      border: "none",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {routePolylines.length > 0 ? "🔄 Regenerate" : "🔍 Generate Routes"}
                  </AntButton>
                </div>


                {/* Map Container */}
                <div
                  style={{
                    height: "350px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                    border: "2px solid #e2e8f0",
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
                        padding: "32px",
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(248, 113, 113, 0.05) 100%)",
                      }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "20px",
                          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(248, 113, 113, 0.15) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <EnvironmentOutlined style={{ fontSize: "36px", color: "#ef4444" }} />
                      </div>
                      <Text strong style={{ fontSize: "16px", color: "#1e293b", marginBottom: "8px" }}>
                        Google Maps Failed to Load
                      </Text>
                      <Text style={{ color: "#64748b", marginBottom: "16px" }}>
                        Please check your Google Maps API key configuration.
                      </Text>
                      <div
                        style={{
                          padding: "12px 20px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        <Text style={{ fontSize: "12px", color: "#b45309" }}>
                          <strong>Tip:</strong> Ad blockers may block Google Maps. Try disabling them.
                        </Text>
                      </div>
                    </div>
                  ) : !isLoaded ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      }}
                    >
                      <Spin size="large" />
                      <Text style={{ color: "#64748b", marginTop: "16px" }}>Loading map...</Text>
                    </div>
                  ) : (
                    <GoogleMap
                      zoom={14}
                      center={mapCenter}
                      mapContainerStyle={{ width: "100%", height: "100%" }}
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
                              <div style={{ padding: "8px" }}>
                                <div style={{ fontWeight: 700, color: "#10b981", marginBottom: "8px" }}>🟢 Start Point</div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  <div>Lat: {startPosition.lat.toFixed(6)}</div>
                                  <div>Lng: {startPosition.lng.toFixed(6)}</div>
                                </div>
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
                              <div style={{ padding: "8px" }}>
                                <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: "8px" }}>🔴 End Point</div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  <div>Lat: {endPosition.lat.toFixed(6)}</div>
                                  <div>Lng: {endPosition.lng.toFixed(6)}</div>
                                </div>
                              </div>
                            </InfoWindow>
                          )}
                        </>
                      )}
                      {routePolylines.map((route, index) => (
                        <Polyline
                          key={`${routeVersion}-${index}`}
                          path={route.path}
                          options={{
                            strokeColor:
                              selectedRouteIndex === index
                                ? "#6366f1"
                                : "#94a3b8",
                            strokeWeight: selectedRouteIndex === index ? 6 : 3,
                            strokeOpacity: selectedRouteIndex === index ? 1 : 0.5,
                          }}
                        />
                      ))}
                    </GoogleMap>
                  )}
                </div>

                {/* Route Selection Cards - Horizontal Layout */}
                {routePolylines.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <Text style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                        Select a Route ({routePolylines.length} found)
                      </Text>
                      {selectedRouteIndex !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "#dcfce7", borderRadius: "12px" }}>
                          <span style={{ fontSize: "12px" }}>✓</span>
                          <Text style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Route {selectedRouteIndex + 1} Selected</Text>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
                      {routePolylines.map((route, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedRouteIndex(index)}
                          style={{
                            minWidth: "160px",
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: selectedRouteIndex === index ? "2px solid #6366f1" : "2px solid #e2e8f0",
                            background: selectedRouteIndex === index ? "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)" : "white",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: selectedRouteIndex === index ? "#6366f1" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: selectedRouteIndex === index ? "white" : "#64748b" }}>
                              {selectedRouteIndex === index ? "✓" : index + 1}
                            </div>
                            <Text style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Route {index + 1}</Text>
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Via {route.summary}
                          </div>
                          <div style={{ display: "flex", gap: "12px" }}>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#6366f1" }}>{route.duration}</div>
                              <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>Time</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#10b981" }}>{route.distance}</div>
                              <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>Dist</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {routePolylines.length === 0 && (
                  <div style={{ marginTop: "16px", padding: "16px", borderRadius: "10px", background: "#fef3c7", border: "1px solid #fcd34d", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>💡</span>
                    <div>
                      <Text style={{ fontSize: "12px", fontWeight: 600, color: "#b45309" }}>Enter addresses above and click "Generate Routes"</Text>
                    </div>
                  </div>
                )}

                {/* Manual Coordinate Entry - Compact */}
                {loadError && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca" }}>
                    <Text style={{ fontSize: "11px", color: "#dc2626", fontWeight: 500 }}>⚠️ Map unavailable - Enter coordinates manually in form fields above</Text>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  {selectedRouteIndex === null && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "18px" }}>⚠️</div>
                      <Text style={{ fontSize: "13px", color: "#b45309", fontWeight: 500 }}>
                        Please preview and select a route before saving
                      </Text>
                    </div>
                  )}
                  {selectedRouteIndex !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "18px" }}>✅</div>
                      <Text style={{ fontSize: "13px", color: "#059669", fontWeight: 500 }}>
                        Route selected and ready to save
                      </Text>
                    </div>
                  )}
                </div>
                <Space size="middle">
                  <AntButton
                    onClick={handleModalClose}
                    style={{
                      height: "44px",
                      borderRadius: "12px",
                      fontWeight: 600,
                      padding: "0 24px",
                      background: "white",
                      border: "2px solid #e2e8f0",
                      color: "#64748b",
                    }}
                  >
                    Cancel
                  </AntButton>
                  <AntButton
                    type="primary"
                    htmlType="submit"
                    disabled={submitting || selectedRouteIndex === null}
                    loading={submitting}
                    style={{
                      height: "48px",
                      borderRadius: "12px",
                      fontWeight: 700,
                      padding: "0 32px",
                      fontSize: "15px",
                      background: selectedRouteIndex !== null
                        ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                        : "#e2e8f0",
                      border: "none",
                      color: selectedRouteIndex !== null ? "white" : "#94a3b8",
                      boxShadow: selectedRouteIndex !== null
                        ? "0 8px 24px rgba(240, 147, 251, 0.4)"
                        : "none",
                    }}
                  >
                    {editingRoute ? "💾 Update Route" : "✨ Create Route"}
                  </AntButton>
                </Space>
              </div>
            </Form>
          </div>
        </Modal>

        {/* Location Picker Modal */}
        <Modal
          open={locationPickerOpen}
          onCancel={() => { setLocationPickerOpen(false); setTempPickerPosition(null); }}
          title={null}
          footer={null}
          width={600}
          styles={{
            content: { padding: 0, borderRadius: "16px", overflow: "hidden" },
            body: { padding: 0 },
          }}
          closable={false}
        >
          <div style={{ background: locationPickerType === "start" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <EnvironmentOutlined style={{ fontSize: "18px", color: "white" }} />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>
                  {locationPickerType === "start" ? "Set Start Point" : "Set End Point"}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>Click on the map to pin location</div>
              </div>
            </div>
            <AntButton type="text" onClick={() => { setLocationPickerOpen(false); setTempPickerPosition(null); }} style={{ color: "white", width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)" }}>✕</AntButton>
          </div>

          <div style={{ height: "350px", position: "relative" }}>
            {isLoaded && (
              <GoogleMap
                zoom={14}
                center={tempPickerPosition || mapCenter}
                mapContainerStyle={{ width: "100%", height: "100%" }}
                onClick={(e) => {
                  if (e.latLng) {
                    setTempPickerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                  }
                }}
                onLoad={(map) => { pickerMapRef.current = map; }}
              >
                {tempPickerPosition && (
                  <Marker
                    position={tempPickerPosition}
                    animation={google.maps.Animation.DROP}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: locationPickerType === "start" ? "#10b981" : "#ef4444",
                      fillOpacity: 1,
                      strokeColor: "white",
                      strokeWeight: 3,
                    }}
                  />
                )}
              </GoogleMap>
            )}
            {tempPickerPosition && (
              <div style={{ position: "absolute", bottom: "12px", left: "12px", padding: "8px 12px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: "12px" }}>
                📌 {tempPickerPosition.lat.toFixed(6)}, {tempPickerPosition.lng.toFixed(6)}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: "12px", color: "#64748b" }}>
              {tempPickerPosition ? "Location pinned! Click Confirm to save." : "Click anywhere on the map to pin a location."}
            </Text>
            <Space>
              <AntButton onClick={() => { setLocationPickerOpen(false); setTempPickerPosition(null); }} style={{ borderRadius: "8px" }}>Cancel</AntButton>
              <AntButton
                type="primary"
                disabled={!tempPickerPosition}
                onClick={async () => {
                  if (tempPickerPosition) {
                    // Save the position
                    if (locationPickerType === "start") {
                      setStartPosition(tempPickerPosition);
                    } else {
                      setEndPosition(tempPickerPosition);
                    }

                    // Reverse geocode to get address
                    try {
                      const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${tempPickerPosition.lat},${tempPickerPosition.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                      );
                      const data = await response.json();
                      if (data.results && data.results.length > 0) {
                        const address = data.results[0].formatted_address;
                        if (locationPickerType === "start") {
                          form.setFieldsValue({ start_address: address });
                        } else {
                          form.setFieldsValue({ end_address: address });
                        }
                      }
                    } catch (error) {
                      console.error("Reverse geocoding failed:", error);
                      // Fallback: use coordinates as address
                      const coordAddress = `${tempPickerPosition.lat.toFixed(6)}, ${tempPickerPosition.lng.toFixed(6)}`;
                      if (locationPickerType === "start") {
                        form.setFieldsValue({ start_address: coordAddress });
                      } else {
                        form.setFieldsValue({ end_address: coordAddress });
                      }
                    }

                    setLocationPickerOpen(false);
                    setTempPickerPosition(null);
                  }
                }}
                style={{
                  borderRadius: "8px",
                  background: tempPickerPosition
                    ? (locationPickerType === "start" ? "#10b981" : "#ef4444")
                    : "#e2e8f0",
                  border: "none",
                }}
              >
                ✓ Confirm Location
              </AntButton>
            </Space>
          </div>
        </Modal>
      </div>
      <Toaster />
    </div>
  );
}
