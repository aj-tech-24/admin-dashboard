"use client";

import {
  BarChartOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Spin, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardMetrics, getDashboardMetrics } from "../lib/queries";
import { realtimeManager } from "../lib/realtime";
import { useAuth } from "./providers/AuthProvider";

const { Title, Text } = Typography;

export default function HomePage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    console.log("Auth state:", { loading, user: !!user, isAdmin });

    if (!loading && !user) {
      console.log("No user found, redirecting to login");
      router.push("/login");
    } else if (!loading && user && !isAdmin) {
      console.log("User found but not admin, signing out");
      message.error("Access denied. Admin privileges required.");
      signOut();
    }
  }, [user, loading, isAdmin, router, signOut]);

  useEffect(() => {
    if (user && isAdmin) {
      loadMetrics();
      setupRealtime();
    }

    return () => {
      realtimeManager.unsubscribeAll();
    };
  }, [user, isAdmin]);

  // Handle tab focus to prevent unnecessary reloading
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        isAdmin &&
        !metricsLoading
      ) {
        // Tab is visible and user is authenticated, no need to reload metrics
        return;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, isAdmin, metricsLoading]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || metricsLoading) {
        console.log("Loading timeout reached");
        setLoadingTimeout(true);
        // Force stop loading after timeout
        setMetricsLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading, metricsLoading]);

  const loadMetrics = async () => {
    try {
      console.log("Loading dashboard metrics...");
      setMetricsLoading(true);
      const data = await getDashboardMetrics();
      console.log("Metrics loaded:", data);
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
      message.error("Failed to load dashboard metrics");
      // Set default metrics to prevent infinite loading
      setMetrics({
        activeBuses: 0,
        ongoingTrips: 0,
        totalRoutes: 0,
        totalPassengers: 0,
        todayTrips: 0,
        totalUsers: 0,
        completedTrips: 0,
        cancelledTrips: 0,
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  const setupRealtime = () => {
    realtimeManager.subscribeToAll({
      onTripUpdate: () => {
        loadMetrics(); // Refresh metrics when trips change
      },
      onBusUpdate: () => {
        loadMetrics(); // Refresh metrics when buses change
      },
    });
    setRealtimeConnected(true);
  };

  if (loading || metricsLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <Spin size="large" />
        <div style={{ textAlign: "center" }}>
          <div>Loading dashboard...</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {loading && "Authenticating..."}
            {!loading && metricsLoading && "Loading metrics..."}
          </div>
          {loadingTimeout && (
            <div
              style={{ fontSize: "12px", color: "#ff4d4f", marginTop: "8px" }}
            >
              Loading is taking longer than expected. Check console for errors.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const metricCards = [
    {
      title: "Active Buses",
      value: metrics?.activeBuses || 0,
      icon: <CarOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
      color: "#1890ff",
    },
    {
      title: "Ongoing Trips",
      value: metrics?.ongoingTrips || 0,
      icon: (
        <ClockCircleOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
      ),
      color: "#52c41a",
    },
    {
      title: "Total Routes",
      value: metrics?.totalRoutes || 0,
      icon: <CompassOutlined style={{ fontSize: "24px", color: "#fa8c16" }} />,
      color: "#fa8c16",
    },
    {
      title: "Total Passengers",
      value: metrics?.totalPassengers || 0,
      icon: <TeamOutlined style={{ fontSize: "24px", color: "#722ed1" }} />,
      color: "#722ed1",
    },
    {
      title: "Today's Trips",
      value: metrics?.todayTrips || 0,
      icon: (
        <CheckCircleOutlined style={{ fontSize: "24px", color: "#13c2c2" }} />
      ),
      color: "#13c2c2",
    },
    {
      title: "Total Users",
      value: metrics?.totalUsers || 0,
      icon: <UserOutlined style={{ fontSize: "24px", color: "#eb2f96" }} />,
      color: "#eb2f96",
    },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-header">
        <div className="admin-logo">Miniway Admin Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {realtimeConnected && (
            <div className="realtime-indicator">
              <div className="realtime-dot"></div>
              Live
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 16px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <Text style={{ color: "#374151", fontWeight: "500" }}>
              {user?.email}
            </Text>
          </div>
          <Button
            onClick={signOut}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#dc2626",
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="admin-content">
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col span={24}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "32px",
                borderRadius: "16px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center",
              }}
            >
              <Title
                level={1}
                style={{
                  color: "white",
                  marginBottom: "12px",
                  fontSize: "48px",
                  fontWeight: "800",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                Dashboard Overview
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: "500",
                }}
              >
                Real-time monitoring of your Miniway transportation network
              </Text>
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          {metricCards.map((card, index) => (
            <Col xs={24} sm={12} md={8} lg={4} key={index}>
              <Card hoverable>
                <div className="metrics-card">
                  <div style={{ marginBottom: "16px" }}>{card.icon}</div>
                  <div className="metrics-value" style={{ color: card.color }}>
                    {card.value}
                  </div>
                  <div className="metrics-label">{card.title}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <BarChartOutlined
                    style={{ color: "#6366f1", fontSize: "20px" }}
                  />
                  <span>Quick Actions</span>
                </div>
              }
              hoverable
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                <Button
                  type="primary"
                  size="large"
                  onClick={() => router.push("/fleet")}
                  style={{
                    height: "60px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <CarOutlined style={{ fontSize: "24px" }} />
                  <span>Manage Fleet</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => router.push("/trips")}
                  style={{
                    height: "60px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <ClockCircleOutlined style={{ fontSize: "24px" }} />
                  <span>Monitor Trips</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => router.push("/routes")}
                  style={{
                    height: "60px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <CompassOutlined style={{ fontSize: "24px" }} />
                  <span>Route Management</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => router.push("/users")}
                  style={{
                    height: "60px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <TeamOutlined style={{ fontSize: "24px" }} />
                  <span>User Management</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => router.push("/analytics")}
                  style={{
                    height: "60px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <BarChartOutlined style={{ fontSize: "24px" }} />
                  <span>Analytics & Reports</span>
                </Button>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <CheckCircleOutlined
                    style={{ color: "#10b981", fontSize: "20px" }}
                  />
                  <span>System Status</span>
                </div>
              }
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(16, 185, 129, 0.1)",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#10b981",
                      }}
                    ></div>
                    <Text style={{ fontWeight: "600" }}>
                      Database Connection
                    </Text>
                  </div>
                  <Text style={{ color: "#10b981", fontWeight: "600" }}>
                    Connected
                  </Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: realtimeConnected
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                    borderRadius: "12px",
                    border: realtimeConnected
                      ? "1px solid rgba(16, 185, 129, 0.2)"
                      : "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: realtimeConnected ? "#10b981" : "#ef4444",
                      }}
                    ></div>
                    <Text style={{ fontWeight: "600" }}>Real-time Updates</Text>
                  </div>
                  <Text
                    style={{
                      color: realtimeConnected ? "#10b981" : "#ef4444",
                      fontWeight: "600",
                    }}
                  >
                    {realtimeConnected ? "Active" : "Inactive"}
                  </Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(59, 130, 246, 0.1)",
                    borderRadius: "12px",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <CheckCircleOutlined
                      style={{ color: "#3b82f6", fontSize: "16px" }}
                    />
                    <Text style={{ fontWeight: "600" }}>
                      Completed Trips (Today)
                    </Text>
                  </div>
                  <Text
                    style={{
                      color: "#3b82f6",
                      fontWeight: "700",
                      fontSize: "18px",
                    }}
                  >
                    {metrics?.completedTrips || 0}
                  </Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: "12px",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </div>
                    <Text style={{ fontWeight: "600" }}>
                      Cancelled Trips (Today)
                    </Text>
                  </div>
                  <Text
                    style={{
                      color: "#ef4444",
                      fontWeight: "700",
                      fontSize: "18px",
                    }}
                  >
                    {metrics?.cancelledTrips || 0}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
