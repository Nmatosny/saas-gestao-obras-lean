import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Forçar recarregamento alterando a configuração
  env: {
    RESTART_ID: "12345"
  }
};

export default nextConfig;
