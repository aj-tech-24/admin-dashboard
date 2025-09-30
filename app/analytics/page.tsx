"use client";

import {
  BarChartOutlined,
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
          <Button onClick={() => router.push("/")}>Dashboard</Button>
          <Button onClick={loadAnalyticsData} icon={<ReloadOutlined />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="admin-content">
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Title level={2}>Analytics & Reports</Title>
            <Text type="secondary">
              Comprehensive insights into your transportation network
              performance
            </Text>
          </Col>
        </Row>

        {/* Key Metrics */}
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Trips (30 days)"
                value={metrics?.totalTrips || 0}
                prefix={<BarChartOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Completion Rate"
                value={metrics?.completionRate || 0}
                suffix="%"
                prefix={<RiseOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Trips/Day"
                value={metrics?.avgTripsPerDay || 0}
                prefix={<LineChartOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Route Utilization"
                value={metrics?.routeUtilizationRate || 0}
                suffix="%"
                prefix={<PieChartOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ color: "#13c2c2" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Trip Status Breakdown */}
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Completed Trips"
                value={metrics?.completedTrips || 0}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Cancelled Trips"
                value={metrics?.cancelledTrips || 0}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Cancellation Rate"
                value={metrics?.cancellationRate || 0}
                suffix="%"
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Route Performance */}
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Card title="Route Performance" extra={<PieChartOutlined />}>
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text type="secondary">
                  Route performance charts and detailed analytics coming soon.
                  <br />
                  This will include trip volume, completion rates, and passenger
                  satisfaction metrics per route.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Recent Travel History */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Recent Travel History" extra={<BarChartOutlined />}>
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text type="secondary">
                  Recent travel history and passenger journey analytics coming
                  soon.
                  <br />
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
