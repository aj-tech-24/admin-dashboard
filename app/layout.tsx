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
              colorPrimary: "#1890ff",
              borderRadius: 6,
            },
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
