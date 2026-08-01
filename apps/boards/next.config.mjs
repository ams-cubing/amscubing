/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/auth"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
