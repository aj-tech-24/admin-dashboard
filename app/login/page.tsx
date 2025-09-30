"use client";

import { CarOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../providers/AuthProvider";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await signIn(values.email, values.password);
      message.success("Login successful!");
      router.push("/");
    } catch (error: any) {
      message.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <CarOutlined
            style={{ fontSize: "48px", color: "#1890ff", marginBottom: "16px" }}
          />
          <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
            Miniway Admin
          </Title>
          <Text type="secondary">Transportation Management System</Text>
        </div>

        <Form name="login" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: "100%" }}
              loading={loading}
            >
              {loading ? <Spin size="small" /> : "Sign In"}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Admin access only. Contact system administrator for credentials.
          </Text>
        </div>
      </Card>
    </div>
  );
}
