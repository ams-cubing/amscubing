import { securityHeaders } from "@workspace/server/security-headers";

export default {
  transpilePackages: [
    "@workspace/auth",
    "@workspace/db",
    "@workspace/server",
    "@workspace/ui",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};
