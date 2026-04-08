import type { NextConfig } from "next";
import path from "path";

const stub = path.resolve("./src/lib/empty.js");

const nextConfig: NextConfig = {
  // Turbopack alias config (Next 16+)
  turbopack: {
    resolveAlias: {
      "@solana/web3.js": stub,
      "@hyperlane-xyz/utils": stub,
      "@hyperlane-xyz/sdk": stub,
      "@hyperlane-xyz/registry": stub,
      "@fatsolutions/tongo-sdk": stub,
    },
  },
  // Webpack fallback for build (in case Turbopack doesn't fully cover)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/web3.js": false,
      "@hyperlane-xyz/utils": false,
      "@hyperlane-xyz/sdk": false,
      "@hyperlane-xyz/registry": false,
      "@fatsolutions/tongo-sdk": false,
    };
    return config;
  },
};

export default nextConfig;
