"use client";

import {
  BarChartOutlined,
  BellOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  LogoutOutlined,
  SettingOutlined,
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

  // Load metrics when component mounts and user is authenticated
  useEffect(() => {
    let isSubscribed = true;

    if (user && isAdmin && isSubscribed) {
      console.log("Dashboard mounted - loading metrics");
      loadMetrics();
      setupRealtime();
    }

    return () => {
      isSubscribed = false;
      realtimeManager.unsubscribeAll();
    };
  }, [user, isAdmin]); // Reload when user or admin status changes

  // Reduce timeout and improve error handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || metricsLoading) {
        console.warn("Loading timeout reached - check your connection");
        setLoadingTimeout(true);
        // Don't force stop loading, just show warning
      }
    }, 10000); // Increased to 10 seconds for better UX

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
        // Silently refresh metrics in background (don't show loading)
        loadMetrics();
      },
      onBusUpdate: () => {
        // Silently refresh metrics in background (don't show loading)
        loadMetrics();
      },
    });
    setRealtimeConnected(true);
  };

  // Only show loading screen during initial authentication or first metrics load
  if ((loading && !user) || (metricsLoading && !metrics)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "24px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        }}
      >
        <div
          style={{
            padding: "32px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            textAlign: "center",
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>
              Loading Dashboard...
            </div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>
              {loading && "Authenticating..."}
              {!loading && metricsLoading && "Loading metrics..."}
            </div>
            {loadingTimeout && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#dc2626",
                  marginTop: "12px",
                  padding: "8px 16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "8px",
                }}
              >
                Loading is taking longer than expected
              </div>
            )}
          </div>
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
      icon: <CarOutlined />,
      color: "#3b82f6",
      gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    },
    {
      title: "Ongoing Trips",
      value: metrics?.ongoingTrips || 0,
      icon: <ClockCircleOutlined />,
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      title: "Total Routes",
      value: metrics?.totalRoutes || 0,
      icon: <CompassOutlined />,
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
    {
      title: "Total Passengers",
      value: metrics?.totalPassengers || 0,
      icon: <TeamOutlined />,
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    },
    {
      title: "Today's Trips",
      value: metrics?.todayTrips || 0,
      icon: <CheckCircleOutlined />,
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    },
    {
      title: "Total Users",
      value: metrics?.totalUsers || 0,
      icon: <UserOutlined />,
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-header">
        {/* Logo Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
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
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
              }}
            >
              <CarOutlined style={{ fontSize: "22px", color: "white" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Miniway
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
                Admin Dashboard
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "4px",
              background: "rgba(0, 0, 0, 0.03)",
              borderRadius: "12px",
            }}
          >

          </div>
        </div>

        {/* Right Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Live Indicator */}
          {realtimeConnected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "24px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#059669",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#10b981",
                  borderRadius: "50%",
                  animation: "pulse 2s infinite",
                  boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)",
                }}
              />
              Live
            </div>
          )}

          {/* Notification Bell */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
            }}
          >
            <BellOutlined style={{ fontSize: "18px", color: "#64748b" }} />
            {/* Notification Badge */}
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                background: "#ef4444",
                borderRadius: "50%",
                border: "2px solid white",
              }}
            />
          </div>

          {/* Settings */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => router.push("/analytics")}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
            }}
          >
            <BarChartOutlined style={{ fontSize: "18px", color: "#64748b" }} />
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "32px",
              background: "rgba(0, 0, 0, 0.08)",
            }}
          />

          {/* User Profile Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "6px 12px 6px 6px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
              borderRadius: "16px",
              border: "1px solid rgba(99, 102, 241, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "15px",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
              }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ maxWidth: "140px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1e293b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email?.split("@")[0]}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#10b981",
                    borderRadius: "50%",
                  }}
                />
                Administrator
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <Button
            onClick={signOut}
            icon={<LogoutOutlined />}
            style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.1) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#dc2626",
              borderRadius: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "40px",
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="admin-content">
        {/* Hero Section */}
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col span={24}>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)",
                padding: "48px 32px",
                borderRadius: "24px",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative elements */}
              <div
                style={{
                  position: "absolute",
                  top: "-60px",
                  left: "-60px",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-40px",
                  right: "-40px",
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                }}
              />
              <Title
                level={1}
                style={{
                  color: "white",
                  marginBottom: "16px",
                  fontSize: "48px",
                  fontWeight: 800,
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  position: "relative",
                }}
              >
                🎛️ Dashboard Overview
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: 500,
                  position: "relative",
                }}
              >
                Real-time monitoring of your Miniway transportation network
              </Text>
            </div>
          </Col>
        </Row>

        {/* Metric Cards */}
        <Row gutter={[20, 20]} style={{ marginBottom: "32px" }}>
          {metricCards.map((card, index) => (
            <Col xs={24} sm={12} md={8} lg={4} key={index}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "20px",
                  padding: "24px",
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.08)";
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    background: card.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    color: "white",
                    boxShadow: `0 8px 16px ${card.color}40`,
                    marginBottom: "16px",
                  }}
                >
                  {card.icon}
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "#1e293b",
                    lineHeight: 1,
                    marginBottom: "6px",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  {card.title}
                </div>
              </div>
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
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BarChartOutlined style={{ color: "white", fontSize: "18px" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      Quick Actions
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Navigate to key areas
                    </div>
                  </div>
                </div>
              }
              style={{
                height: "100%",
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "16px",
                }}
              >
                {[
                  {
                    icon: <CarOutlined />,
                    label: "Manage Fleet",
                    path: "/fleet",
                    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    description: "Buses & Drivers",
                  },
                  {
                    icon: <ClockCircleOutlined />,
                    label: "Monitor Trips",
                    path: "/trips",
                    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                    description: "Live Tracking",
                  },
                  {
                    icon: <CompassOutlined />,
                    label: "Routes",
                    path: "/routes",
                    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    description: "Route Planning",
                  },
                  {
                    icon: <TeamOutlined />,
                    label: "Users",
                    path: "/users",
                    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    description: "User Management",
                  },
                  {
                    icon: <BarChartOutlined />,
                    label: "Analytics",
                    path: "/analytics",
                    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    description: "Reports & Insights",
                  },
                ].map((action, index) => (
                  <div
                    key={index}
                    onClick={() => router.push(action.path)}
                    style={{
                      padding: "20px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.05)";
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: action.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        color: "white",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      }}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#1e293b",
                          marginBottom: "4px",
                        }}
                      >
                        {action.label}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        {action.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircleOutlined style={{ color: "white", fontSize: "18px" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      System Status
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Connection health
                    </div>
                  </div>
                </div>
              }
              style={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
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
