import type { NextConfig } from "next";


const nextConfig: NextConfig & {
  eslint?: {
    ignoreDuringBuilds: boolean;
  };
} = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: "http",
        hostname: "192.168.100.35",
        port: "8090",
      },
        {
        protocol: "https",
        hostname: "pocketbase-production-b489.up.railway.app",
      },
    ],
  },
};

export default nextConfig;