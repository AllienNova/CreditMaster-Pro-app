/**
 * Next.js Middleware
 *
 * Handles:
 * - CORS (Cross-Origin Resource Sharing)
 * - Authentication and authorization for protected routes
 * - Admin RBAC enforcement
 * - Security headers
 *
 * Note: API routes should implement their own authentication using JWT validation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicApiRoute } from "@/lib/auth/PUBLIC_ROUTES";
import { isFlagEnabledEdge } from "@/lib/flags/edge";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/callback",
  "/pricing",
  "/about",
  "/contact",
  "/credit/factors",
];

// Define admin-only routes
const adminRoutes = ["/admin"];

// CORS configuration
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://fynvita.com",
  "https://www.fynvita.com",
  "https://app.fynvita.com",
];

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
];

/**
 * Check if running in development mode
 */
const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Add security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - don't upgrade insecure requests in development
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.plaid.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    // Local Supabase is added in DEVELOPMENT ONLY. Without it `connect-src`
    // permits `https://*.supabase.co` and nothing else, so a browser pointed at
    // a local stack cannot even sign in — every auth call is refused by the CSP
    // before it leaves the page:
    //
    //   Connecting to 'http://127.0.0.1:54321/auth/v1/token?grant_type=password'
    //   violates the following Content Security Policy directive: "connect-src…"
    //
    // That silently made browser dogfooding of EVERY authenticated feature
    // impossible locally, which is why the curl-based scripts/dogfood.sh could
    // pass while the real UI could not log in at all. Found while device-testing
    // the backup-codes screen.
    //
    // Production is untouched: this appends only when NODE_ENV !== "production",
    // and the hosted app talks to *.supabase.co, which was already allowed.
    `connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.plaid.com https://api.aimlapi.com wss://*.supabase.co${
      isDevelopment
        ? " http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321"
        : ""
    }`,
    "frame-src 'self' https://js.stripe.com https://cdn.plaid.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // Only add upgrade-insecure-requests in production
  if (!isDevelopment) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS filter
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  // Strict Transport Security (HSTS) - only in production
  if (!isDevelopment) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

/**
 * Handle CORS
 */
function handleCORS(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");

  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      ALLOWED_METHODS.join(", "),
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      ALLOWED_HEADERS.join(", "),
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  }

  return response;
}

/**
 * Build an Edge-safe Supabase client scoped to the request's cookies.
 *
 * Uses `@supabase/ssr` `createServerClient` (Edge-safe, cookie-scoped) — never
 * `@supabase/supabase-js` with the service-role key, which is not safe to
 * bundle into the Edge runtime.
 */
function createEdgeSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Cookie writes are handled on the response elsewhere.
        },
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addSecurityHeaders(handleCORS(request, response));
  }

  // Allow public routes
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  }

  // Allow static files (they have no auth surface)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    (pathname.includes(".") && !pathname.startsWith("/api"))
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  }

  // API routes: deny-by-default (FND-001 / AUTH-04).
  // Public routes (the explicit PUBLIC_API_ROUTES allowlist) always pass
  // through. Every other /api/* route requires a valid session at the
  // middleware layer. Enforcement is gated behind the auth.deny_by_default
  // feature flag so it ships dark and is flipped after the staging soak.
  if (pathname.startsWith("/api")) {
    if (isPublicApiRoute(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(handleCORS(request, response));
    }

    const enforce = await isFlagEnabledEdge("auth.deny_by_default");
    if (enforce) {
      const supabase = createEdgeSupabaseClient(request);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const response = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
        return addSecurityHeaders(handleCORS(request, response));
      }
    }

    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  }

  try {
    // Check for auth token in cookies
    const token =
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("supabase-auth-token")?.value;

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, verify admin role.
    // FND-005: the role decision MUST come from the profiles table, never from
    // a JWT/metadata claim (app_metadata / user_metadata) — those are forgeable
    // and would let a user self-grant admin. The profiles.role query (via the
    // Edge-safe @supabase/ssr cookie client) is the only source of truth.
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      try {
        const supabase = createEdgeSupabaseClient(request);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.redirect(new URL("/auth/login", request.url));
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role ?? "user";

        if (role !== "admin" && role !== "super_admin") {
          // Redirect non-admins to dashboard
          return NextResponse.redirect(
            new URL("/dashboard?error=unauthorized", request.url),
          );
        }
      } catch {
        // Admin role check failed - redirect to dashboard
        return NextResponse.redirect(
          new URL("/dashboard?error=unauthorized", request.url),
        );
      }
    }

    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  } catch {
    // On error, redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
