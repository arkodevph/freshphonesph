import type { NextConfig } from "next";
import path from "node:path";

const localPreview = process.env.FRESHPHONES_LOCAL_PREVIEW === "true";

const nextConfig: NextConfig = {
  output: localPreview ? undefined : "standalone",
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
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 20,
  },
  experimental: {
    ...(localPreview ? { cpus: 2 } : {}),
    webpackMemoryOptimizations:
      process.env.NODE_ENV === "development" || localPreview,
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
