/* global process */

const UPLOADTHING_CONNECT = [
  "https://uploadthing.com",
  "https://*.uploadthing.com",
  "https://*.ingest.uploadthing.com",
  "https://utfs.io",
  "https://*.ufs.sh",
];

const EMBED_FRAMES = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
];

/**
 * @param {{ extraConnectSrc?: string[]; extraFrameSrc?: string[]; extraFormAction?: string[]; isProduction?: boolean }} [options]
 */
export function buildContentSecurityPolicy(options = {}) {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";

  const directives = {
    "default-src": ["'self'"],
    // Next's inline bootstrap and next-themes need inline scripts; dev needs eval for HMR.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...UPLOADTHING_CONNECT,
      ...(options.extraConnectSrc ?? []),
      ...(isProduction ? [] : ["ws:", "http://localhost:*"]),
    ],
    "frame-src": ["'self'", ...EMBED_FRAMES, ...(options.extraFrameSrc ?? [])],
    "frame-ancestors": ["'none'"],
    "form-action": [
      "'self'",
      "https://www.worldcubeassociation.org",
      ...(options.extraFormAction ?? []),
    ],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Headers for `next.config` `headers()`. CSP ships as Report-Only until
 * violations are reviewed in production.
 *
 * @param {{ extraConnectSrc?: string[]; extraFrameSrc?: string[]; extraFormAction?: string[]; isProduction?: boolean }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function securityHeaders(options = {}) {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";

  const headers = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicy({ ...options, isProduction }),
    },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }

  return headers;
}
