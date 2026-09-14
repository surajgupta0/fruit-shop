import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@fruitshop/web-core"],
  turbopack: {
    // Monorepo root (has the workspace package-lock.json)
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
