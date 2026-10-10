export type SecurityHeadersOptions = {
  extraConnectSrc?: string[];
  extraFrameSrc?: string[];
  extraFormAction?: string[];
  isProduction?: boolean;
};

export function buildContentSecurityPolicy(
  options?: SecurityHeadersOptions,
): string;

export function securityHeaders(
  options?: SecurityHeadersOptions,
): { key: string; value: string }[];
