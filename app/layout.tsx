import { ConfigProvider } from "antd";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Miniway Admin Dashboard",
  description:
    "Comprehensive admin dashboard for Miniway transportation system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#6366f1",
              colorSuccess: "#10b981",
              colorWarning: "#f59e0b",
              colorError: "#ef4444",
              colorInfo: "#3b82f6",
              borderRadius: 8,
              fontSize: 14,
              fontFamily:
                "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              boxShadow:
                "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              boxShadowSecondary:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
            components: {
              Layout: {
                headerBg: "#ffffff",
                siderBg: "#f8fafc",
              },
              Card: {
                borderRadius: 12,
                boxShadow:
                  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              },
              Button: {
                borderRadius: 8,
                controlHeight: 40,
              },
              Input: {
                borderRadius: 8,
                controlHeight: 40,
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
