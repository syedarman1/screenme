// next.config.js (or next.config.ts)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),

  async headers() {
    const development = process.env.NODE_ENV === "development";
    return [{ source: "/checkout", headers: [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Content-Security-Policy", value: [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval'" : ""} https://*.stripe.com https://maps.googleapis.com`,
        "frame-src https://*.stripe.com https://*.stripecdn.com https://link.com https://*.link.com",
        `connect-src 'self' https://*.stripe.com https://*.supabase.co wss://*.supabase.co https://link.com https://*.link.com https://maps.googleapis.com ${development ? "ws://localhost:*" : ""}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://*.stripe.com https://*.stripecdn.com https://*.link.com",
        "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self'",
      ].join("; ") },
    ] }];
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
