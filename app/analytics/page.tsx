"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Table,
  Tag,
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
  const [dataLoaded, setDataLoaded] = useState(false);

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
      loadAnalyticsData();
      setDataLoaded(true);
    }

    return () => {
      isSubscribed = false;
    };
  }, [user, isAdmin, dataLoaded]);

  const loadAnalyticsData = async () => {
    try {
      setLoadingData(true);
      const [tripResult, routeResult, historyResult] = await Promise.all([
        getTripAnalytics(30),
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
    } catch (error: any) {
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        return;
      }
      console.error("Error loading analytics data:", error);
      message.error("Failed to load analytics data");
    } finally {
      setLoadingData(false);
    }
  };

  const calculateMetrics = () => {
    if (!analyticsData) return null;

    const trips = analyticsData.tripAnalytics;
    const completedTrips = trips.filter((trip: any) => trip.status === "completed");
    const cancelledTrips = trips.filter((trip: any) => trip.status === "cancelled");
    const ongoingTrips = trips.filter((trip: any) => trip.status === "ongoing");
    const totalTrips = trips.length;

    const completionRate = totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0;
    const cancellationRate = totalTrips > 0 ? (cancelledTrips.length / totalTrips) * 100 : 0;

    const uniqueDays = new Set(
      trips.map((trip: any) => {
        const date = trip.started_at || trip.updated_at;
        return date ? new Date(date).toDateString() : null;
      }).filter(Boolean)
    ).size;
    const avgTripsPerDay = uniqueDays > 0 ? totalTrips / uniqueDays : 0;

    const activeRoutes = analyticsData.routeUtilization.filter(
      (route: any) => route.buses && route.buses.length > 0
    ).length;
    const totalRoutes = analyticsData.routeUtilization.length;
    const routeUtilizationRate = totalRoutes > 0 ? (activeRoutes / totalRoutes) * 100 : 0;

    return {
      totalTrips,
      completedTrips: completedTrips.length,
      cancelledTrips: cancelledTrips.length,
      ongoingTrips: ongoingTrips.length,
      completionRate: Math.round(completionRate),
      cancellationRate: Math.round(cancellationRate),
      avgTripsPerDay: Math.round(avgTripsPerDay * 10) / 10,
      activeRoutes,
      totalRoutes,
      routeUtilizationRate: Math.round(routeUtilizationRate),
    };
  };

  const metrics = calculateMetrics();

  if ((loading && !user) || (loadingData && !dataLoaded)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          gap: "16px",
        }}
      >
        <Spin size="large" />
        <Text style={{ color: "white", fontSize: "16px" }}>Loading analytics...</Text>
      </div>
    );
  }

  // Metric Card Component
  const MetricCard = ({
    icon,
    value,
    label,
    color,
    gradient,
    trend,
    trendValue,
  }: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color: string;
    gradient: string;
    trend?: "up" | "down";
    trendValue?: string;
  }) => (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
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
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: gradient,
          opacity: 0.1,
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            color: "white",
            boxShadow: `0 8px 16px ${color}40`,
          }}
        >
          {icon}
        </div>
        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "8px",
              background: trend === "up" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: trend === "up" ? "#10b981" : "#ef4444",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {trend === "up" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {trendValue}
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <div
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#1e293b",
            lineHeight: 1,
            marginBottom: "8px",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );

  // Route columns for table
  const routeColumns = [
    {
      title: "Route Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Text strong style={{ color: "#1e293b" }}>{name}</Text>
      ),
    },
    {
      title: "From",
      dataIndex: "start_address",
      key: "start_address",
      render: (addr: string) => (
        <Text style={{ color: "#64748b" }}>{addr?.substring(0, 30)}...</Text>
      ),
    },
    {
      title: "To",
      dataIndex: "end_address",
      key: "end_address",
      render: (addr: string) => (
        <Text style={{ color: "#64748b" }}>{addr?.substring(0, 30)}...</Text>
      ),
    },
    {
      title: "Active Buses",
      dataIndex: "buses",
      key: "buses",
      render: (buses: any[]) => (
        <Tag color={buses?.length > 0 ? "green" : "default"}>
          {buses?.length || 0} bus{buses?.length !== 1 ? "es" : ""}
        </Tag>
      ),
    },
  ];

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
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
              }}
            >
              <BarChartOutlined style={{ fontSize: "22px", color: "white" }} />
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
                Analytics
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
                Reports & Insights
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Button
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
          </Button>
          <Button
            onClick={loadAnalyticsData}
            icon={<ReloadOutlined spin={loadingData} />}
            type="primary"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              height: "40px",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
            }}
          >
            Refresh Data
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
                padding: "40px",
                borderRadius: "24px",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background decorations */}
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
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  right: "-30px",
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
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
                📊 Analytics Dashboard
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: 500,
                  position: "relative",
                }}
              >
                Comprehensive insights from the last 30 days of operations
              </Text>
            </div>
          </Col>
        </Row>

        {/* Key Metrics Grid */}
        <Row gutter={[20, 20]} style={{ marginBottom: "32px" }}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              icon={<BarChartOutlined />}
              value={metrics?.totalTrips || 0}
              label="Total Trips"
              color="#6366f1"
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              trend="up"
              trendValue="12%"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              icon={<CheckCircleOutlined />}
              value={`${metrics?.completionRate || 0}%`}
              label="Completion Rate"
              color="#10b981"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              trend="up"
              trendValue="5%"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              icon={<LineChartOutlined />}
              value={metrics?.avgTripsPerDay || 0}
              label="Avg Trips/Day"
              color="#8b5cf6"
              gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              icon={<PieChartOutlined />}
              value={`${metrics?.routeUtilizationRate || 0}%`}
              label="Route Utilization"
              color="#06b6d4"
              gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
            />
          </Col>
        </Row>

        {/* Trip Status Cards */}
        <Row gutter={[20, 20]} style={{ marginBottom: "32px" }}>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <CheckCircleOutlined style={{ fontSize: "28px", color: "white" }} />
                </div>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#10b981" }}>
                  {metrics?.completedTrips || 0}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                  Completed Trips
                </div>
                <Progress
                  percent={metrics?.completionRate || 0}
                  showInfo={false}
                  strokeColor={{ from: "#10b981", to: "#059669" }}
                  style={{ marginTop: "16px" }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 8px 16px rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <CloseCircleOutlined style={{ fontSize: "28px", color: "white" }} />
                </div>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#ef4444" }}>
                  {metrics?.cancelledTrips || 0}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                  Cancelled Trips
                </div>
                <Progress
                  percent={metrics?.cancellationRate || 0}
                  showInfo={false}
                  strokeColor={{ from: "#ef4444", to: "#dc2626" }}
                  style={{ marginTop: "16px" }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 8px 16px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <RiseOutlined style={{ fontSize: "28px", color: "white" }} />
                </div>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#f59e0b" }}>
                  {metrics?.cancellationRate || 0}%
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>
                  Cancellation Rate
                </div>
                <Progress
                  percent={100 - (metrics?.cancellationRate || 0)}
                  showInfo={false}
                  strokeColor={{ from: "#f59e0b", to: "#d97706" }}
                  style={{ marginTop: "16px" }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Route Performance Table */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CarOutlined style={{ color: "white", fontSize: "18px" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      Route Performance
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {metrics?.activeRoutes || 0} of {metrics?.totalRoutes || 0} routes active
                    </div>
                  </div>
                </div>
              }
              extra={
                <Tag color="cyan" style={{ fontWeight: 600 }}>
                  {metrics?.routeUtilizationRate || 0}% Utilization
                </Tag>
              }
              style={{
                borderRadius: "20px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
              }}
            >
              <Table
                dataSource={analyticsData?.routeUtilization || []}
                columns={routeColumns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
