import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  devIndicators: false,
  async rewrites() {
    if (process.env.NEXT_PUBLIC_PRESENTATION_MODE === "true") {
      return [];
    }

    const apiOrigin = process.env.API_PROXY_URL?.replace(/\/$/, "");

    return apiOrigin
      ? {
          beforeFiles: [
            { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
          ],
        }
      : [];
  },
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/dist/ssr",
    ],
  },
  turbopack: {
    // Monorepo: point Turbopack at the workspace root so hoisted (pnpm)
    // packages like `next` resolve correctly.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
