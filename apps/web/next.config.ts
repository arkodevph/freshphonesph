import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo: point Turbopack at the workspace root so hoisted (pnpm)
    // packages like `next` resolve correctly.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
