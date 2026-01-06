import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide X-Powered-By header for security
  poweredByHeader: false,

  // Enable React strict mode for development
  reactStrictMode: true,

  // Configure allowed image sources
  // NOTE: hostname "**" allows all domains - intentionally permissive for scaffolding.
  // Users should restrict this in production to their specific CDN/image domains.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes (/:path* handles i18n correctly unlike /(.*))
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // HSTS - enforce HTTPS connections
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
