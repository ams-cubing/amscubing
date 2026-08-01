/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  transpilePackages: ["@workspace/ui", "@workspace/db"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
}

export default nextConfig
