"use client";

import {
  CarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  assignDriverToBus,
  getAllBuses,
  getDrivers,
  updateBusStatus,
} from "../../lib/queries";
import { realtimeManager } from "../../lib/realtime";
import { useAuth } from "../providers/AuthProvider";

const { Title, Text } = Typography;
const { Option } = Select;

interface Bus {
  id: string;
  plate_number: string;
  capacity: number;
  passengers: number;
  status: "active" | "inactive";
  route_id: string;
  driver_id?: string;
  conductor_id?: string;
  routes?: {
    id: string;
    name: string;
    start_address: string;
    end_address: string;
  };
  driver?: {
    id: string;
    fullName: string;
    contact_number?: string;
    license_number?: string;
    license_expiry?: string;
  };
  conductor?: {
    id: string;
    fullName: string;
    contact_number?: string;
  };
}

interface Driver {
  id: string;
  fullName: string;
  contact_number?: string;
  license_number?: string;
  license_expiry?: string;
}

export default function FleetPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [form] = Form.useForm();

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
      realtimeManager.unsubscribe("buses");
    };
  }, [user, isAdmin]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [busesResult, driversResult] = await Promise.all([
        getAllBuses(),
        getDrivers(),
      ]);

      if (busesResult.error) throw busesResult.error;
      if (driversResult.error) throw driversResult.error;

      // Transform the data to match the expected interface
      const transformedBuses = (busesResult.data || []).map((bus: any) => ({
        ...bus,
        routes: Array.isArray(bus.routes) ? bus.routes[0] : bus.routes,
        driver: Array.isArray(bus.driver) ? bus.driver[0] : bus.driver,
        conductor: Array.isArray(bus.conductor)
          ? bus.conductor[0]
          : bus.conductor,
      }));

      setBuses(transformedBuses);
      setDrivers(driversResult.data || []);
    } catch (error) {
      console.error("Error loading fleet data:", error);
      message.error("Failed to load fleet data");
    } finally {
      setLoadingData(false);
    }
  };

  const setupRealtime = () => {
    realtimeManager.subscribeToBuses({
      onBusUpdate: (payload) => {
        loadData(); // Refresh data when buses change
      },
    });
  };

  const handleStatusChange = async (
    busId: string,
    newStatus: "active" | "inactive"
  ) => {
    try {
      const { error } = await updateBusStatus(busId, newStatus);
      if (error) throw error;

      message.success(`Bus status updated to ${newStatus}`);
      loadData();
    } catch (error) {
      console.error("Error updating bus status:", error);
      message.error("Failed to update bus status");
    }
  };

  const handleAssignDriver = async (values: { driverId: string }) => {
    if (!selectedBus) return;

    try {
      const { error } = await assignDriverToBus(
        selectedBus.id,
        values.driverId
      );
      if (error) throw error;

      message.success("Driver assigned successfully");
      setAssignModalVisible(false);
      setSelectedBus(null);
      form.resetFields();
      loadData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      message.error("Failed to assign driver");
    }
  };

  const openAssignModal = (bus: Bus) => {
    setSelectedBus(bus);
    form.setFieldsValue({ driverId: bus.driver_id });
    setAssignModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: "green", text: "Active" },
      inactive: { color: "red", text: "Inactive" },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      render: (text: string) => (
        <Text strong style={{ color: "#1890ff" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Route",
      key: "route",
      render: (record: Bus) => (
        <div>
          <Text strong>{record.routes?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.routes?.start_address} → {record.routes?.end_address}
          </Text>
        </div>
      ),
    },
    {
      title: "Driver",
      key: "driver",
      render: (record: Bus) =>
        record.driver ? (
          <div>
            <Text>{record.driver.fullName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.driver.contact_number}
            </Text>
          </div>
        ) : (
          <Text type="secondary">No driver assigned</Text>
        ),
    },
    {
      title: "Capacity",
      key: "capacity",
      render: (record: Bus) => (
        <div>
          <Text>
            {record.passengers}/{record.capacity}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {Math.round((record.passengers / record.capacity) * 100)}% full
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Bus) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openAssignModal(record)}
          >
            Assign Driver
          </Button>
          <Button
            type="link"
            danger={record.status === "active"}
            onClick={() =>
              handleStatusChange(
                record.id,
                record.status === "active" ? "inactive" : "active"
              )
            }
          >
            {record.status === "active" ? "Deactivate" : "Activate"}
          </Button>
        </Space>
      ),
    },
  ];

  const activeBuses = buses.filter((bus) => bus.status === "active").length;
  const totalCapacity = buses.reduce((sum, bus) => sum + bus.capacity, 0);
  const totalPassengers = buses.reduce((sum, bus) => sum + bus.passengers, 0);
  const busesWithDrivers = buses.filter((bus) => bus.driver_id).length;

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
            <Title level={2}>Fleet Management</Title>
            <Text type="secondary">
              Manage your bus fleet, assign drivers, and monitor capacity
            </Text>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Buses"
                value={activeBuses}
                prefix={<CarOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Capacity"
                value={totalCapacity}
                prefix={<UserOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Current Passengers"
                value={totalPassengers}
                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Buses with Drivers"
                value={busesWithDrivers}
                prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ color: "#13c2c2" }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Bus Fleet"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadData}>
                Refresh
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={buses}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} buses`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        <Modal
          title="Assign Driver"
          open={assignModalVisible}
          onCancel={() => {
            setAssignModalVisible(false);
            setSelectedBus(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleAssignDriver}>
            <Form.Item
              label="Bus"
              name="bus"
              initialValue={selectedBus?.plate_number}
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              label="Driver"
              name="driverId"
              rules={[{ required: true, message: "Please select a driver!" }]}
            >
              <Select placeholder="Select a driver">
                {drivers.map((driver) => (
                  <Option key={driver.id} value={driver.id}>
                    <div>
                      <Text strong>{driver.fullName}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {driver.contact_number} • License:{" "}
                        {driver.license_number}
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Assign Driver
                </Button>
                <Button
                  onClick={() => {
                    setAssignModalVisible(false);
                    setSelectedBus(null);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
