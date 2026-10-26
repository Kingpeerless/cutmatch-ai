import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
