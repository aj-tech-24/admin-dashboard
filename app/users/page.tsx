"use client";

import {
  CarOutlined,
  EyeOutlined,
  ReloadOutlined,
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
    if (user && isAdmin) {
      loadData();
      setupRealtime();
    }

    return () => {
      realtimeManager.unsubscribe("users");
    };
  }, [user, isAdmin]);

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
        loadData(); // Refresh data when users change
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
          <Button onClick={loadData} icon={<ReloadOutlined />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="admin-content">
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Title level={2}>User Management</Title>
            <Text type="secondary">
              Manage drivers, conductors, commuters, and system administrators
            </Text>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Drivers"
                value={driverCount}
                prefix={<CarOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Conductors"
                value={conductorCount}
                prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Commuters"
                value={commuterCount}
                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Admins"
                value={adminCount}
                prefix={<UserOutlined style={{ color: "#fa8c16" }} />}
                valueStyle={{ color: "#fa8c16" }}
              />
            </Card>
          </Col>
        </Row>

        {expiredLicenses > 0 && (
          <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
            <Col span={24}>
              <Card style={{ border: "1px solid #ff4d4f" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Text style={{ color: "#ff4d4f", fontWeight: "bold" }}>
                    ⚠️ {expiredLicenses} driver license(s) have expired
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        <Card>
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <Search
              placeholder="Search by name, phone, or license..."
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Filter by role"
              style={{ width: 150 }}
              value={roleFilter}
              onChange={setRoleFilter}
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
                label: `All Users (${allUsers.length})`,
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
                label: `Drivers (${driverCount})`,
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
                label: `Conductors (${conductorCount})`,
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
                label: `Commuters (${commuterCount})`,
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
