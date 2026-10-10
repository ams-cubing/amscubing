import { securityHeaders } from "@workspace/server/security-headers";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ufs.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.worldcubeassociation.org",
        pathname: "/rails/active_storage/**",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
