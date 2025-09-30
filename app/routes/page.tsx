"use client";

import {
  CompassOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
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
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createRoute,
  deleteRoute,
  getAllRoutes,
  updateRoute,
} from "../../lib/queries";
import { useAuth } from "../providers/AuthProvider";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Route {
  id: string;
  name: string;
  start_address: string;
  end_address: string;
  path?: any;
  created_at: string;
  updated_at: string;
}

export default function RoutesPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
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
      loadRoutes();
    }
  }, [user, isAdmin]);

  const loadRoutes = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await getAllRoutes();

      if (error) {
        console.error("Error loading routes:", error);
        message.error("Failed to load routes");
        setRoutes([]);
      } else {
        setRoutes(data || []);
      }
    } catch (error) {
      console.error("Error loading routes:", error);
      message.error("Failed to load routes");
      setRoutes([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRoute) {
        // Update existing route
        const { error } = await updateRoute(editingRoute.id, values);
        if (error) throw error;
        message.success("Route updated successfully");
      } else {
        // Create new route
        const { error } = await createRoute(values);
        if (error) throw error;
        message.success("Route created successfully");
      }

      setModalVisible(false);
      setEditingRoute(null);
      form.resetFields();
      loadRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      message.error("Failed to save route");
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    form.setFieldsValue({
      name: route.name,
      start_address: route.start_address,
      end_address: route.end_address,
    });
    setModalVisible(true);
  };

  const handleDelete = async (routeId: string) => {
    try {
      const { error } = await deleteRoute(routeId);
      if (error) throw error;
      message.success("Route deleted successfully");
      loadRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      message.error("Failed to delete route");
    }
  };

  const openCreateModal = () => {
    setEditingRoute(null);
    form.resetFields();
    setModalVisible(true);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  const columns = [
    {
      title: "Route Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Text strong style={{ color: "#1890ff" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Start Address",
      dataIndex: "start_address",
      key: "start_address",
      render: (text: string) => (
        <div>
          <EnvironmentOutlined
            style={{ color: "#52c41a", marginRight: "8px" }}
          />
          <Text>{text}</Text>
        </div>
      ),
    },
    {
      title: "End Address",
      dataIndex: "end_address",
      key: "end_address",
      render: (text: string) => (
        <div>
          <EnvironmentOutlined
            style={{ color: "#ff4d4f", marginRight: "8px" }}
          />
          <Text>{text}</Text>
        </div>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (text: string) => formatTime(text),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Route) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => {
              Modal.confirm({
                title: "Delete Route",
                content: `Are you sure you want to delete the route "${record.name}"?`,
                onOk: () => handleDelete(record.id),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

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
          <Button onClick={loadRoutes} icon={<ReloadOutlined />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="admin-content">
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Title level={2}>Route Management</Title>
            <Text type="secondary">
              Manage transportation routes and their details
            </Text>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Routes"
                value={routes.length}
                prefix={<CompassOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Routes"
                value={routes.length}
                prefix={<CompassOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Transportation Routes"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              Add Route
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={routes}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} routes`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        <Modal
          title={editingRoute ? "Edit Route" : "Add New Route"}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingRoute(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Route Name"
              name="name"
              rules={[{ required: true, message: "Please enter route name!" }]}
            >
              <Input placeholder="e.g., Downtown to Airport" />
            </Form.Item>

            <Form.Item
              label="Start Address"
              name="start_address"
              rules={[
                { required: true, message: "Please enter start address!" },
              ]}
            >
              <TextArea
                rows={2}
                placeholder="e.g., 123 Main Street, Downtown"
              />
            </Form.Item>

            <Form.Item
              label="End Address"
              name="end_address"
              rules={[{ required: true, message: "Please enter end address!" }]}
            >
              <TextArea
                rows={2}
                placeholder="e.g., International Airport Terminal 1"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingRoute ? "Update Route" : "Create Route"}
                </Button>
                <Button
                  onClick={() => {
                    setModalVisible(false);
                    setEditingRoute(null);
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
