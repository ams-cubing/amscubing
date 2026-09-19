/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/db",
    "@workspace/auth",
    "@workspace/social",
  ],
  serverExternalPackages: ["sharp", "@resvg/resvg-js"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
}

export default nextConfig
