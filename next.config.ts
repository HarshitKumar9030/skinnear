import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  serverExternalPackages: ["mongodb"],
  outputFileTracingIncludes: {
    "/api/routine": ["./src/data/product-embeddings.json"],
    "/api/routine/compare": ["./src/data/product-embeddings.json"],
    "/api/routine/explain": ["./src/data/product-embeddings.json"],
  },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
