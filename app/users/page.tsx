"use client";

import {
  CarOutlined,
  DashboardOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllUsers, getUsersByRole } from "../../lib/queries";
import { realtimeManager } from "../../lib/realtime";
import { useAuth } from "../providers/AuthProvider";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface User {
  id: string;
  fullName: string; // This will map to "fullName" in the database
  avatar_url?: string;
  role: "driver" | "conductor" | "commuter" | "admin";
  contact_number?: string;
  emergency_contact?: string;
  home_location?: string;
  work_location?: string;
  push_token?: string;
  license_number?: string;
  license_expiry?: string;
  updated_at: string;
}

export default function UsersPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [conductors, setConductors] = useState<User[]>([]);
  const [commuters, setCommuters] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data already loaded
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

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
      console.log("Loading users data for the first time");
      loadData();
      setupRealtime();
      setDataLoaded(true);
    }

    return () => {
      isSubscribed = false;
      realtimeManager.unsubscribe("users");
    };
  }, [user, isAdmin, dataLoaded]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load users with individual error handling
      const allResult = await getAllUsers();
      setAllUsers(allResult.data || []);

      const driversResult = await getUsersByRole("driver");
      setDrivers(driversResult.data || []);

      const conductorsResult = await getUsersByRole("conductor");
      setConductors(conductorsResult.data || []);

      const commutersResult = await getUsersByRole("commuter");
      setCommuters(commutersResult.data || []);

      // Show info message if no users found
      const totalUsers = (allResult.data || []).length;
      if (totalUsers === 0) {
        message.info(
          "No users found in the database. Users will appear here once they register through the mobile app."
        );
      }
    } catch (error) {
      console.error("Error loading users data:", error);
      message.error("Failed to load users data");
    } finally {
      setLoadingData(false);
    }
  };

  const setupRealtime = () => {
    realtimeManager.subscribeToUsers({
      onUserUpdate: (payload) => {
        // Silently refresh data in background (no loading screen)
        loadData();
      },
    });
  };

  const getRoleTag = (role: string) => {
    const roleConfig = {
      admin: { color: "red", text: "Admin" },
      driver: { color: "blue", text: "Driver" },
      conductor: { color: "green", text: "Conductor" },
      commuter: { color: "default", text: "Commuter" },
    };
    const config = roleConfig[role as keyof typeof roleConfig];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  const isLicenseExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getFilteredUsers = (users: User[]) => {
    let filtered = users;

    if (searchText) {
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.contact_number?.includes(searchText) ||
          user.license_number?.includes(searchText)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    return filtered;
  };

  const columns = [
    {
      title: "Name",
      key: "name",
      render: (record: User) => (
        <div>
          <Text strong>{record.fullName || "N/A"}</Text>
          {record.contact_number && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.contact_number}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => getRoleTag(role),
    },
    {
      title: "Contact",
      key: "contact",
      render: (record: User) => (
        <div>
          <Text>{record.contact_number || "N/A"}</Text>
          {record.emergency_contact && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Emergency: {record.emergency_contact}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: "License Info",
      key: "license",
      render: (record: User) =>
        record.role === "driver" ? (
          <div>
            <Text style={{ fontSize: "12px" }}>
              {record.license_number || "N/A"}
            </Text>
            {record.license_expiry && (
              <>
                <br />
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    color: isLicenseExpired(record.license_expiry)
                      ? "#ff4d4f"
                      : undefined,
                  }}
                >
                  Expires:{" "}
                  {new Date(record.license_expiry).toLocaleDateString()}
                  {isLicenseExpired(record.license_expiry) && " (Expired)"}
                </Text>
              </>
            )}
          </div>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: "Push Token",
      dataIndex: "push_token",
      key: "push_token",
      render: (token: string) =>
        token ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Last Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (text: string) => formatTime(text),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              // TODO: Implement user details modal
              message.info("User details feature coming soon");
            }}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  const driverCount = drivers.length;
  const conductorCount = conductors.length;
  const commuterCount = commuters.length;
  const adminCount = allUsers.filter((user) => user.role === "admin").length;
  const expiredLicenses = drivers.filter((driver) =>
    isLicenseExpired(driver.license_expiry)
  ).length;

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
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
              }}
            >
              <TeamOutlined style={{ fontSize: "22px", color: "white" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Users
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
                User Management
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
            onClick={loadData}
            icon={<ReloadOutlined spin={loadingData} />}
            type="primary"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              height: "40px",
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
            }}
          >
            Refresh
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
                👥 User Management
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: 500,
                  position: "relative",
                }}
              >
                Manage drivers, conductors, commuters, and administrators
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
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <CarOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {driverCount}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Drivers
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
                  <SafetyCertificateOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {conductorCount}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Conductors
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
                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(139, 92, 246, 0.3)",
                  }}
                >
                  <UserOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {commuterCount}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Commuters
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
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <TeamOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {adminCount}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Admins
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Expired Licenses Alert */}
        {expiredLicenses > 0 && (
          <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
            <Col span={24}>
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.1) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "16px",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                </div>
                <Text style={{ color: "#dc2626", fontWeight: 600, fontSize: "15px" }}>
                  {expiredLicenses} driver license(s) have expired and need attention
                </Text>
              </div>
            </Col>
          </Row>
        )}

        {/* Users Table Card */}
        <Card
          style={{
            borderRadius: "20px",
            border: "none",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Search
              placeholder="Search by name, phone, or license..."
              style={{ width: 320, borderRadius: "12px" }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              size="large"
            />
            <Select
              placeholder="Filter by role"
              style={{ width: 160 }}
              value={roleFilter}
              onChange={setRoleFilter}
              size="large"
            >
              <Option value="all">All Roles</Option>
              <Option value="admin">Admin</Option>
              <Option value="driver">Driver</Option>
              <Option value="conductor">Conductor</Option>
              <Option value="commuter">Commuter</Option>
            </Select>
          </div>

          <Tabs
            defaultActiveKey="all"
            items={[
              {
                key: "all",
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TeamOutlined />
                    All Users ({allUsers.length})
                  </span>
                ),
                children: (
                  <Table
                    columns={columns}
                    dataSource={getFilteredUsers(allUsers)}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} users`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                ),
              },
              {
                key: "drivers",
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CarOutlined />
                    Drivers ({driverCount})
                  </span>
                ),
                children: (
                  <Table
                    columns={columns}
                    dataSource={getFilteredUsers(drivers)}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} drivers`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                ),
              },
              {
                key: "conductors",
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <SafetyCertificateOutlined />
                    Conductors ({conductorCount})
                  </span>
                ),
                children: (
                  <Table
                    columns={columns}
                    dataSource={getFilteredUsers(conductors)}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} conductors`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                ),
              },
              {
                key: "commuters",
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserOutlined />
                    Commuters ({commuterCount})
                  </span>
                ),
                children: (
                  <Table
                    columns={columns}
                    dataSource={getFilteredUsers(commuters)}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} commuters`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
