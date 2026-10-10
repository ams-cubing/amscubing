import { securityHeaders } from "@workspace/server/security-headers";

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/db",
    "@workspace/auth",
    "@workspace/server",
    "@workspace/social",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  serverExternalPackages: ["sharp", "@resvg/resvg-js"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
