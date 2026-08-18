import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks /_next/* from non-localhost origins in dev (no hydration on phones).
  allowedDevOrigins: ["192.168.1.63", "127.0.0.1"],
};

export default nextConfig;
