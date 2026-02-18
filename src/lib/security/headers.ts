/**
 * Security Headers Configuration
 * Production-ready security headers for Next.js
 */

export const securityHeaders = [
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Enable XSS filter
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // DNS prefetch control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Permissions Policy (formerly Feature-Policy)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Strict Transport Security (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

// Content Security Policy
export const cspHeader = {
  key: "Content-Security-Policy",
  value: `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim(),
};

// Development CSP (more permissive)
export const devCspHeader = {
  key: "Content-Security-Policy",
  value: `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' ws: wss: https:;
    frame-src 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim(),
};

// Get all headers for next.config.js
export function getSecurityHeaders(isDev: boolean = false) {
  return [...securityHeaders, isDev ? devCspHeader : cspHeader];
}

// CORS configuration
export const corsConfig = {
  allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
  allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Generate CORS headers
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] =
      corsConfig.allowedMethods.join(", ");
    headers["Access-Control-Allow-Headers"] =
      corsConfig.allowedHeaders.join(", ");
    headers["Access-Control-Allow-Credentials"] = String(
      corsConfig.credentials,
    );
    headers["Access-Control-Max-Age"] = String(corsConfig.maxAge);
  }

  return headers;
}
