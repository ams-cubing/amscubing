/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "amscubing.org",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
}

export default nextConfig
