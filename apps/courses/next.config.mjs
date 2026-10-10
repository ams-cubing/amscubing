import { securityHeaders } from "@workspace/server/security-headers";

/** @type {import('next').NextConfig} */
export default {
  transpilePackages: [
    "@workspace/auth",
    "@workspace/db",
    "@workspace/server",
    "@workspace/ui",
  ],
  outputFileTracingIncludes: {
    "/cursos/*/certificado": [
      "./public/fonts/*.ttf",
      "./public/source/imagotipo-sm.png",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};
