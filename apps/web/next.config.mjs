/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/auth"],
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
    ],
  },
};

export default nextConfig;
