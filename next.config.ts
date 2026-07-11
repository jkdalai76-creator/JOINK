import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],
  poweredByHeader: false,
};

export default nextConfig;
