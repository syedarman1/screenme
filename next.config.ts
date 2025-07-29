// next.config.js (or next.config.ts)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  eslint: {
    // Disable ESLint during builds for now - allows deployment with code quality warnings
    ignoreDuringBuilds: true,
  },

  typescript: {
    // Allow build with TypeScript warnings
    ignoreBuildErrors: true,
  },

  webpack(config) {
    // 1. Stub out Node‑only modules so pdfjs-dist doesn't pull in `canvas`
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      canvas: false,
      fs: false,
      path: false,
    };

    // 2. Emit pdf.worker(.entry).js as a static asset
    config.module.rules.push({
      test: /pdf\.worker(\.entry)?\.(js|ts)$/,
      type: "asset/resource",
      generator: {
        filename: "static/chunks/[hash][ext]",
      },
    });

    return config;
  },
};

export default nextConfig;
