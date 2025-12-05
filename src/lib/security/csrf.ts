/**
 * CSRF Protection
 * Generates and validates CSRF tokens for form submissions
 */

import { cookies } from 'next/headers';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a cryptographically secure token
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Set CSRF token in cookie
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  return token;
}

// Validate CSRF token from request
export async function validateCSRFToken(requestToken: string | null): Promise<boolean> {
  if (!requestToken) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!cookieToken) return false;

  // Constant-time comparison to prevent timing attacks
  if (requestToken.length !== cookieToken.length) return false;

  let result = 0;
  for (let i = 0; i < requestToken.length; i++) {
    result |= requestToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }

  return result === 0;
}

// Get CSRF token from request headers
export function getCSRFTokenFromRequest(request: Request): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

// Middleware to check CSRF on state-changing requests
export async function csrfProtection(request: Request): Promise<{ valid: boolean; error?: string }> {
  const method = request.method.toUpperCase();
  
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const token = getCSRFTokenFromRequest(request);
  const isValid = await validateCSRFToken(token);

  if (!isValid) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

