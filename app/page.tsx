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

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || metricsLoading) {
        console.log("Loading timeout reached");
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {realtimeConnected && (
            <div className="realtime-indicator">
              <div className="realtime-dot"></div>
              Live
            </div>
          )}
          <Text>Welcome, {user?.email}</Text>
          <Button onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <div className="admin-content">
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Title level={2}>Dashboard Overview</Title>
            <Text type="secondary">
              Real-time monitoring of your Miniway transportation network
            </Text>
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

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Quick Actions" extra={<BarChartOutlined />} hoverable>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <Button
                  type="primary"
                  size="large"
                  onClick={() => router.push("/fleet")}
                >
                  Manage Fleet
                </Button>
                <Button size="large" onClick={() => router.push("/trips")}>
                  Monitor Trips
                </Button>
                <Button size="large" onClick={() => router.push("/routes")}>
                  Route Management
                </Button>
                <Button size="large" onClick={() => router.push("/users")}>
                  User Management
                </Button>
                <Button size="large" onClick={() => router.push("/analytics")}>
                  Analytics & Reports
                </Button>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="System Status"
              extra={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text>Database Connection</Text>
                  <Text style={{ color: "#52c41a" }}>Connected</Text>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text>Real-time Updates</Text>
                  <Text
                    style={{ color: realtimeConnected ? "#52c41a" : "#ff4d4f" }}
                  >
                    {realtimeConnected ? "Active" : "Inactive"}
                  </Text>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text>Completed Trips (Today)</Text>
                  <Text style={{ color: "#1890ff" }}>
                    {metrics?.completedTrips || 0}
                  </Text>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text>Cancelled Trips (Today)</Text>
                  <Text style={{ color: "#ff4d4f" }}>
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
