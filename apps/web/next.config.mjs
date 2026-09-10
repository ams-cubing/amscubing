/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/auth"],
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
    ],
  },
};

export default nextConfig;
