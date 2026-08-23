import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile devices on LAN to connect during development
  allowedDevOrigins: ["192.168.1.63", "127.0.0.1", "192.168.0.153"],
};

export default nextConfig;
