import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8090",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pocketbase-production-b489.up.railway.app",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;