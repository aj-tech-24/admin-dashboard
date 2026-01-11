import { ConfigProvider } from "antd";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Miniway Admin Dashboard",
  description:
    "Comprehensive admin dashboard for Miniway transportation system",
  keywords: ["transportation", "admin", "dashboard", "miniway", "bus", "fleet"],
  authors: [{ name: "Miniway Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#6366f1",
              colorSuccess: "#10b981",
              colorWarning: "#f59e0b",
              colorError: "#ef4444",
              colorInfo: "#3b82f6",
              colorLink: "#6366f1",
              colorLinkHover: "#8b5cf6",
              borderRadius: 12,
              borderRadiusSM: 8,
              borderRadiusLG: 16,
              fontSize: 14,
              fontFamily:
                "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontWeightStrong: 600,
              boxShadow:
                "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              boxShadowSecondary:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              controlHeight: 44,
              controlHeightLG: 52,
              controlHeightSM: 36,
            },
            components: {
              Layout: {
                headerBg: "#ffffff",
                siderBg: "#f8fafc",
              },
              Card: {
                borderRadiusLG: 16,
                boxShadowTertiary:
                  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              },
              Button: {
                borderRadius: 10,
                controlHeight: 44,
                controlHeightLG: 52,
                controlHeightSM: 36,
                fontWeight: 600,
              },
              Input: {
                borderRadius: 10,
                controlHeight: 44,
                controlHeightLG: 52,
              },
              Select: {
                borderRadius: 10,
                controlHeight: 44,
              },
              Table: {
                borderRadius: 12,
                headerBg: "#f8fafc",
                headerColor: "#1e293b",
              },
              Modal: {
                borderRadiusLG: 20,
              },
              Message: {
                borderRadiusLG: 12,
              },
              Notification: {
                borderRadiusLG: 16,
              },
            },
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}

