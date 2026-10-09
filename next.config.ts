import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
