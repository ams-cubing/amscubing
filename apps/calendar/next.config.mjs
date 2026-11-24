import { securityHeaders } from "@workspace/server/security-headers";

function stripTrailingSlash(url) {
  return url.replace(/\/$/, "");
}

const webUrl = stripTrailingSlash(
  process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: false,
  reactCompiler: true,
  typedRoutes: true,
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
  async redirects() {
    return [
      {
        source: "/panel/equipo",
        destination: `${webUrl}/admin/equipo`,
        permanent: true,
      },
      {
        source: "/panel/equipo/:path*",
        destination: `${webUrl}/admin/equipo/:path*`,
        permanent: true,
      },
    ];
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
