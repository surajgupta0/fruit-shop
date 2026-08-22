import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fruitshop/web-core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
