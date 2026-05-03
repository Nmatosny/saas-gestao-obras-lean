import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // O Next.js 16+ gerencia ESLint automaticamente ou via CLI separada.
  // Removendo chaves depreciadas para garantir build limpo (P0).
  env: {
    RESTART_ID: "12345"
  }
};

export default nextConfig;
