"use client";

import { CarOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Typography } from "antd";
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
      message.success("Welcome back! Redirecting to dashboard...");
      router.push("/");
    } catch (error: any) {
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        return;
      }
      message.error(error.message || "Login failed. Please check your credentials.");
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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-20%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(131, 58, 180, 0.3) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "24px",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3)",
          padding: "48px 40px",
          position: "relative",
          zIndex: 1,
          animation: "scaleIn 0.5s ease-out",
        }}
      >
        {/* Logo Section */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 20px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(102, 126, 234, 0.4)",
            }}
          >
            <CarOutlined style={{ fontSize: "40px", color: "white" }} />
          </div>
          <Title
            level={2}
            style={{
              margin: 0,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontWeight: 800,
              fontSize: "28px",
              letterSpacing: "-0.5px",
            }}
          >
            Miniway Admin
          </Title>
          <Text
            style={{
              color: "#64748b",
              fontSize: "15px",
              display: "block",
              marginTop: "8px",
            }}
          >
            Transportation Management System
          </Text>
        </div>

        {/* Login Form */}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                Email Address
              </span>
            }
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
              placeholder="admin@miniway.com"
              style={{
                height: "52px",
                borderRadius: "12px",
                fontSize: "15px",
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                Password
              </span>
            }
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
              placeholder="Enter your password"
              style={{
                height: "52px",
                borderRadius: "12px",
                fontSize: "15px",
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: "16px", marginTop: "32px" }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.4)",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Text style={{ color: "#94a3b8", fontSize: "13px" }}>
            🔒 Admin access only
          </Text>
          <br />
          <Text style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
            Contact system administrator for credentials
          </Text>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
