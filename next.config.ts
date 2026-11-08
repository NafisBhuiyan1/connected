import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /app is the web build of the Connected. mobile app (Expo, exported to public/app).
  // Its files are served as-is; any other /app path is a client-side route of that app.
  async rewrites() {
    return [
      { source: "/app", destination: "/app/index.html" },
      { source: "/app/:path*", destination: "/app/index.html" },
    ];
  },
};

export default nextConfig;
