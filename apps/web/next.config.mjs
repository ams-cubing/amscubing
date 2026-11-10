import { securityHeaders } from "@workspace/server/security-headers";

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: false,
  // Next's default list (facebookexternalhit, Googlebot, Bingbot…) skips the cached
  // shell and renders in a function on every crawl. All metadata here is static, so
  // it is already in the shell's <head>. Use a pattern no user agent contains.
  htmlLimitedBots: /ams-no-html-limited-bots/,
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
  serverExternalPackages: ["sharp", "@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/*": ["../../packages/social/assets/**/*"],
  },
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      {
        source: "/torneos",
        destination: "/competencias",
        permanent: true,
      },
      {
        source: "/privacidad",
        destination: "/aviso-de-privacidad",
        permanent: true,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "amscubing.org",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "amscubing.org",
        pathname: "/utils/comps-logos/**",
      },
      {
        protocol: "https",
        hostname: "avatars.worldcubeassociation.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.worldcubeassociation.org",
        pathname: "/rails/active_storage/**",
      },
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
    ],
  },
};

export default nextConfig;
