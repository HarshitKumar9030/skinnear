import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mongodb"],
  outputFileTracingIncludes: {
    "/api/routine": ["./src/data/product-embeddings.json"],
    "/api/routine/explain": ["./src/data/product-embeddings.json"],
  },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
