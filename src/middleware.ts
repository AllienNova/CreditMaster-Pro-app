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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  '/pricing',
  '/about',
  '/contact',
];

// Define admin-only routes
const adminRoutes = [
  '/admin',
];

// CORS configuration
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://creditmaster-pro.com',
  'https://www.creditmaster-pro.com',
  'https://app.creditmaster-pro.com',
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
];

/**
 * Add security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.plaid.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.plaid.com https://api.aimlapi.com wss://*.supabase.co; " +
    "frame-src 'self' https://js.stripe.com https://cdn.plaid.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests"
  );

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security (HSTS)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  return response;
}

/**
 * Handle CORS
 */
function handleCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return addSecurityHeaders(handleCORS(request, response));
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  }

  // Allow static files and API routes (they handle their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  }

  try {
    // Check for auth token in cookies
    const token = request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, verify admin role
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      try {
        // Create Supabase client for role check
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                // This is handled in the response
              },
            },
          }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.redirect(new URL('/auth/login', request.url));
        }

        // Check user role from app_metadata or profiles table
        const userRole = user.app_metadata?.role || user.user_metadata?.role;

        // If role not in metadata, check profiles table
        if (!userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
          // Fetch role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          const role = profile?.role || userRole || 'user';

          if (role !== 'admin' && role !== 'super_admin') {
            // Redirect non-admins to dashboard
            return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
          }
        }
      } catch (adminError) {
        console.error('Admin role check error:', adminError);
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
      }
    }

    const response = NextResponse.next();
    return addSecurityHeaders(handleCORS(request, response));
  } catch (error) {
    console.error('Middleware error:', error);

    // On error, redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

