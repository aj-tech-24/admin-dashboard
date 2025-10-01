"use client";

import {
  BarChartOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ReloadOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getRouteUtilization,
  getTravelHistory,
  getTripAnalytics,
} from "../../lib/queries";
import { useAuth } from "../providers/AuthProvider";

const { Title, Text } = Typography;

interface AnalyticsData {
  tripAnalytics: any[];
  routeUtilization: any[];
  travelHistory: any[];
}

export default function AnalyticsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !isAdmin) {
      message.error("Access denied. Admin privileges required.");
      router.push("/");
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      loadAnalyticsData();
    }
  }, [user, isAdmin]);

  const loadAnalyticsData = async () => {
    try {
      setLoadingData(true);
      const [tripResult, routeResult, historyResult] = await Promise.all([
        getTripAnalytics(30), // Last 30 days
        getRouteUtilization(),
        getTravelHistory(100),
      ]);

      if (tripResult.error) throw tripResult.error;
      if (routeResult.error) throw routeResult.error;
      if (historyResult.error) throw historyResult.error;

      setAnalyticsData({
        tripAnalytics: tripResult.data || [],
        routeUtilization: routeResult.data || [],
        travelHistory: historyResult.data || [],
      });
    } catch (error) {
      console.error("Error loading analytics data:", error);
      message.error("Failed to load analytics data");
    } finally {
      setLoadingData(false);
    }
  };

  // Calculate analytics metrics
  const calculateMetrics = () => {
    if (!analyticsData) return null;

    const trips = analyticsData.tripAnalytics;
    const completedTrips = trips.filter((trip) => trip.status === "completed");
    const cancelledTrips = trips.filter((trip) => trip.status === "cancelled");
    const totalTrips = trips.length;

    // Calculate completion rate
    const completionRate =
      totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0;

    // Calculate cancellation rate
    const cancellationRate =
      totalTrips > 0 ? (cancelledTrips.length / totalTrips) * 100 : 0;

    // Calculate average trips per day (last 30 days)
    const uniqueDays = new Set(
      trips.map((trip) => new Date(trip.started_at).toDateString())
    ).size;
    const avgTripsPerDay = uniqueDays > 0 ? totalTrips / uniqueDays : 0;

    // Calculate route utilization
    const activeRoutes = analyticsData.routeUtilization.filter(
      (route) => route.buses && route.buses.length > 0
    ).length;
    const totalRoutes = analyticsData.routeUtilization.length;
    const routeUtilizationRate =
      totalRoutes > 0 ? (activeRoutes / totalRoutes) * 100 : 0;

    return {
      totalTrips,
      completedTrips: completedTrips.length,
      cancelledTrips: cancelledTrips.length,
      completionRate: Math.round(completionRate),
      cancellationRate: Math.round(cancellationRate),
      avgTripsPerDay: Math.round(avgTripsPerDay * 10) / 10,
      activeRoutes,
      totalRoutes,
      routeUtilizationRate: Math.round(routeUtilizationRate),
    };
  };

  const metrics = calculateMetrics();

  if (loading || loadingData) {
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

  return (
    <div className="admin-layout">
      <div className="admin-header">
        <div className="admin-logo">Miniway Admin Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Button
            onClick={() => router.push("/")}
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#6366f1",
            }}
          >
            Dashboard
          </Button>
          <Button
            onClick={loadAnalyticsData}
            icon={<ReloadOutlined />}
            type="primary"
          >
            Refresh
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
                Analytics & Reports
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: "500",
                }}
              >
                Comprehensive insights into your transportation network
                performance
              </Text>
            </div>
          </Col>
        </Row>

        {/* Key Metrics */}
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col xs={24} sm={12} md={6}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <BarChartOutlined
                    style={{ fontSize: "32px", color: "#6366f1" }}
                  />
                </div>
                <div className="metrics-value" style={{ color: "#6366f1" }}>
                  {metrics?.totalTrips || 0}
                </div>
                <div className="metrics-label">Total Trips (30 days)</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <RiseOutlined
                    style={{ fontSize: "32px", color: "#10b981" }}
                  />
                </div>
                <div className="metrics-value" style={{ color: "#10b981" }}>
                  {metrics?.completionRate || 0}%
                </div>
                <div className="metrics-label">Completion Rate</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <LineChartOutlined
                    style={{ fontSize: "32px", color: "#8b5cf6" }}
                  />
                </div>
                <div className="metrics-value" style={{ color: "#8b5cf6" }}>
                  {metrics?.avgTripsPerDay || 0}
                </div>
                <div className="metrics-label">Avg Trips/Day</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <PieChartOutlined
                    style={{ fontSize: "32px", color: "#06b6d4" }}
                  />
                </div>
                <div className="metrics-value" style={{ color: "#06b6d4" }}>
                  {metrics?.routeUtilizationRate || 0}%
                </div>
                <div className="metrics-label">Route Utilization</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Trip Status Breakdown */}
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col xs={24} sm={12} md={8}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <CheckCircleOutlined
                    style={{ fontSize: "32px", color: "#10b981" }}
                  />
                </div>
                <div className="metrics-value" style={{ color: "#10b981" }}>
                  {metrics?.completedTrips || 0}
                </div>
                <div className="metrics-label">Completed Trips</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "bold",
                      margin: "0 auto",
                    }}
                  >
                    ✕
                  </div>
                </div>
                <div className="metrics-value" style={{ color: "#ef4444" }}>
                  {metrics?.cancelledTrips || 0}
                </div>
                <div className="metrics-label">Cancelled Trips</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="metrics-card">
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "bold",
                      margin: "0 auto",
                    }}
                  >
                    %
                  </div>
                </div>
                <div className="metrics-value" style={{ color: "#f59e0b" }}>
                  {metrics?.cancellationRate || 0}%
                </div>
                <div className="metrics-label">Cancellation Rate</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Route Performance */}
        <Row gutter={[24, 24]} style={{ marginBottom: "32px" }}>
          <Col span={24}>
            <Card
              title={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <PieChartOutlined
                    style={{ color: "#06b6d4", fontSize: "20px" }}
                  />
                  <span>Route Performance</span>
                </div>
              }
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  background:
                    "linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)",
                  borderRadius: "12px",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                }}
              >
                <PieChartOutlined
                  style={{
                    fontSize: "48px",
                    color: "#06b6d4",
                    marginBottom: "16px",
                  }}
                />
                <Text
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  Route performance charts and detailed analytics coming soon.
                </Text>
                <br />
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  This will include trip volume, completion rates, and passenger
                  satisfaction metrics per route.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Recent Travel History */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <BarChartOutlined
                    style={{ color: "#6366f1", fontSize: "20px" }}
                  />
                  <span>Recent Travel History</span>
                </div>
              }
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  background:
                    "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                  borderRadius: "12px",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                <BarChartOutlined
                  style={{
                    fontSize: "48px",
                    color: "#6366f1",
                    marginBottom: "16px",
                  }}
                />
                <Text
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  Recent travel history and passenger journey analytics coming
                  soon.
                </Text>
                <br />
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  This will show detailed passenger travel patterns and popular
                  routes.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
