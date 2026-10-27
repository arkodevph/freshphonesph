import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  devIndicators: false,
  env: { NEXT_PUBLIC_SITE_TARGET: "landing" },
  experimental: {
    cpus: 2,
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/dist/ssr",
    ],
  },
};

export default nextConfig;
