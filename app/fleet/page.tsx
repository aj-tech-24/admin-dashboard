"use client";

import {
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  EditOutlined,
  ReloadOutlined,
  TeamOutlined,
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
import { useEffect, useState, useRef } from "react";
import {
  assignDriverToBus,
  getAllBuses,
  getDrivers,
  getConductors,
  updateBusStatus,
  updateBusAssignment,
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

interface Conductor {
  id: string;
  fullName: string;
  contact_number?: string;
}

export default function FleetPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data already loaded
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [form] = Form.useForm();

  // Ref to track if initialization has started to prevent double-execution in StrictMode
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !isAdmin) {
      message.error("Access denied. Admin privileges required.");
      router.push("/");
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (loading || !user || !isAdmin) return;

    // Initial data load - ensure it only runs once per mount
    if (!dataLoaded && !isInitializingRef.current) {
      isInitializingRef.current = true;
      loadData().then(() => {
        setDataLoaded(true);
      });
    }

    // Setup realtime subscription
    const handleBusUpdate = () => {
      loadData();
    };

    realtimeManager.subscribeToBuses({
      onBusUpdate: handleBusUpdate,
    });

    return () => {
      realtimeManager.unsubscribe("buses");
      // Reset initialization ref on unmount is optional depending on desired behavior, 
      // but usually for strict mode we want to keep it true if we don't want re-fetch.
      // However, if we unmount "for real", we want to reset. 
      // In this specific case, leaking the ref value (if it were global) would be bad, but it's local to instance.
      // React StrictMode destroys and recreates the component instance? No, it unmounts and remounts. 
      // Refs are reset on remount. Wait, double-invoke preserves ref? 
      // No, strict mode double-invokes EFFECTS, and for components it unmounts/remounts but keeps state? 
      // Actually Strict Mode in dev does: Mount -> Unmount -> Mount.
      // So ref starts fresh on second mount. 
      // So preventing double fetch across strict mode "Mount-Unmount-Mount" requires a global cache or identifying request persistence.
      // BUT `dataLoaded` state update might be the key?
      // Since we can't easily prevent StrictMode double-fetch without a global cache, we should just handle the AbortError or race gracefully.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, loading]);

  const loadData = async () => {
    try {
      console.log("Starting loadData...");
      setLoadingData(true);

      console.log("Fetching buses, drivers, and conductors...");
      const [busesResult, driversResult, conductorsResult] = await Promise.all([
        getAllBuses(),
        getDrivers(),
        getConductors(),
      ]);

      console.log("Buses Result:", JSON.stringify(busesResult, null, 2));
      console.log("Drivers Result:", JSON.stringify(driversResult, null, 2));
      console.log("Conductors Result:", JSON.stringify(conductorsResult, null, 2));

      if (busesResult.error) {
        console.error("Buses query error:", busesResult.error);
        throw new Error(`Buses Error: ${busesResult.error.message}`);
      }
      if (driversResult.error) {
        console.error("Drivers query error:", driversResult.error);
        throw new Error(`Drivers Error: ${driversResult.error.message}`);
      }
      if (conductorsResult.error) {
        console.error("Conductors query error:", conductorsResult.error);
        throw new Error(`Conductors Error: ${conductorsResult.error.message}`);
      }

      console.log("All queries successful. Transforming data...");

      // Transform the data to match the expected interface
      const transformedBuses = (busesResult.data || []).map((bus: any) => ({
        ...bus,
        routes: Array.isArray(bus.routes) ? bus.routes[0] : bus.routes,
        driver: Array.isArray(bus.driver) ? bus.driver[0] : bus.driver,
        conductor: Array.isArray(bus.conductor)
          ? bus.conductor[0]
          : bus.conductor,
      }));

      console.log("Transformed Buses:", transformedBuses.length > 0 ? transformedBuses[0] : "No buses found");

      setBuses(transformedBuses);
      setDrivers(driversResult.data || []);
      setConductors(conductorsResult.data || []);
      console.log("State updated successfully.");
    } catch (error: any) {
      // Ignore abort errors which can happen during rapid updates or strict mode unmounting
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        console.log("Data loading aborted");
        return;
      }
      console.error("Error loading fleet data:", error);
      message.error("Failed to load: " + (error.message || "Unknown error"));
    } finally {
      setLoadingData(false);
    }
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

  const handleEditBus = async (values: {
    driverId?: string;
    conductorId?: string;
  }) => {
    if (!selectedBus) return;

    console.log("handleEditBus called with values:", values);
    console.log("Selected bus:", selectedBus.id, selectedBus.plate_number);

    try {
      const { data, error } = await updateBusAssignment(selectedBus.id, {
        driverId: values.driverId,
        conductorId: values.conductorId,
      });

      console.log("updateBusAssignment response:", { data, error });

      if (error) throw error;

      message.success("Bus assignments updated successfully");
      setEditModalVisible(false);
      setSelectedBus(null);
      form.resetFields();
      loadData();
    } catch (error: any) {
      console.error("Error updating bus assignments:", error);
      if (error.code === "23505") {
        message.error("This driver is already assigned to another bus.");
      } else {
        message.error("Failed to update bus assignments: " + error.message);
      }
    }
  };

  const openEditModal = (bus: Bus) => {
    setSelectedBus(bus);
    setEditModalVisible(true);
    // Set form values after a short delay to ensure form is mounted
    setTimeout(() => {
      form.setFieldsValue({
        bus: bus.plate_number,
        driverId: bus.driver_id || undefined,
        conductorId: bus.conductor_id || undefined,
      });
    }, 100);
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
      title: "Conductor",
      key: "conductor",
      render: (record: Bus) =>
        record.conductor ? (
          <div>
            <Text>{record.conductor.fullName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.conductor.contact_number}
            </Text>
          </div>
        ) : (
          <Text type="secondary">No conductor assigned</Text>
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
            onClick={() => openEditModal(record)}
          >
            Edit
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
                Fleet
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
                Bus Management
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
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              height: "40px",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
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
                🚍 Fleet Management
              </Title>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "18px",
                  fontWeight: 500,
                  position: "relative",
                }}
              >
                Manage buses, assign drivers and conductors, and monitor capacity
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
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <CarOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {activeBuses}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Active Buses
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
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <UserOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {totalCapacity}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Total Capacity
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
                  <TeamOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {totalPassengers}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Current Passengers
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
                    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 16px rgba(6, 182, 212, 0.3)",
                  }}
                >
                  <CheckCircleOutlined style={{ fontSize: "24px", color: "white" }} />
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                  {busesWithDrivers}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                  Buses with Drivers
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Fleet Table Card */}
        <Card
          title={
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
                <CarOutlined style={{ color: "white", fontSize: "18px" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                  Bus Fleet
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {buses.length} buses registered
                </div>
              </div>
            </div>
          }
          extra={
            <Button
              icon={<ReloadOutlined spin={loadingData} />}
              onClick={loadData}
              style={{
                borderRadius: "10px",
                fontWeight: 600,
              }}
            >
              Refresh
            </Button>
          }
          style={{
            borderRadius: "20px",
            border: "none",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
          }}
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
          title="Edit Bus Assignment"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedBus(null);
            form.resetFields();
          }}
          footer={null}
          forceRender
        >
          <Form form={form} layout="vertical" onFinish={handleEditBus}>
            <Form.Item
              label="Bus"
              name="bus"
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              label="Driver"
              name="driverId"
              help="Drivers assigned to other buses are disabled"
            >
              <Select
                placeholder="Select a driver (Optional)"
                allowClear
                showSearch
                loading={loadingData}
                optionFilterProp="label"
                optionLabelProp="label"
                filterOption={(input, option) =>
                  (option?.label as string ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {drivers.map((driver) => {
                  const isAssigned = buses.some(
                    (b) =>
                      b.driver_id === driver.id && b.id !== selectedBus?.id
                  );
                  return (
                    <Select.Option
                      key={driver.id}
                      value={driver.id}
                      label={driver.fullName}
                      disabled={isAssigned}
                    >
                      <div style={{ opacity: isAssigned ? 0.5 : 1 }}>
                        <Text strong>
                          {driver.fullName}{" "}
                          {isAssigned && <Tag color="error">Assigned</Tag>}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {driver.contact_number}
                          {driver.license_number
                            ? ` • License: ${driver.license_number}`
                            : ""}
                        </Text>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item label="Conductor" name="conductorId">
              <Select
                placeholder="Select a conductor (Optional)"
                allowClear
                showSearch
                loading={loadingData}
                optionFilterProp="label"
                optionLabelProp="label"
                filterOption={(input, option) =>
                  (option?.label as string ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {conductors.map((conductor) => {
                  // Check if conductor is assigned to another bus (if unique constraint exists for conductors too)
                  // The schema provided only shows unique_driver_per_bus, but assuming we might want to check for conductors too or just show them all.
                  // The schema shows: constraint buses_conductor_id_fkey foreign KEY (conductor_id) references users (id)
                  // It does NOT show a unique constraint for conductor_id in the provided schema snippet.
                  // However, logical consistency usually implies one conductor per bus at a time, but they might be able to conduct multiple buses? Unlikely physically.
                  // Let's assume we don't strictly enforce unique conductor in DB but conceptually they can't be in two places.
                  // But since there is no DB constraint, I won't disable them, but I will show if they are assigned.
                  const isAssigned = buses.some(
                    (b) =>
                      b.conductor_id === conductor.id && b.id !== selectedBus?.id
                  );

                  return (
                    <Select.Option
                      key={conductor.id}
                      value={conductor.id}
                      label={conductor.fullName}
                    // Not disabling conductors as there is no specific unique constraint in the provided schema
                    // But maybe good UX to show they are busy?
                    // I will NOT disable, but hint.
                    >
                      <div style={{ opacity: isAssigned ? 0.8 : 1 }}>
                        <Text strong>
                          {conductor.fullName}{" "}
                          {isAssigned && (
                            <Tag color="orange">On Another Bus</Tag>
                          )}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {conductor.contact_number}
                        </Text>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setEditModalVisible(false);
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
