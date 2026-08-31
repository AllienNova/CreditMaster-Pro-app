/**
 * Authentication & Authorization Middleware
 * 
 * Provides:
 * - JWT token validation
 * - Session management
 * - Role-based access control (RBAC)
 * - API key authentication
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'premium' | 'admin' | 'super_admin' | 'enterprise';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthResult {
  authenticated: boolean;
  user?: User;
  error?: string;
}

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

/**
 * Role-based permissions
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: [
    { resource: 'disputes', action: 'read' },
    { resource: 'disputes', action: 'write' },
    { resource: 'analysis', action: 'read' },
    { resource: 'loans', action: 'read' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'write' },
  ],
  premium: [
    { resource: 'disputes', action: 'read' },
    { resource: 'disputes', action: 'write' },
    { resource: 'analysis', action: 'read' },
    { resource: 'analysis', action: 'write' },
    { resource: 'loans', action: 'read' },
    { resource: 'loans', action: 'write' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'write' },
    { resource: 'voice', action: 'read' },
    { resource: 'voice', action: 'write' },
    { resource: 'images', action: 'read' },
    { resource: 'images', action: 'write' },
  ],
  enterprise: [
    { resource: '*', action: 'read' },
    { resource: '*', action: 'write' },
  ],
  admin: [
    { resource: '*', action: 'read' },
    { resource: '*', action: 'write' },
    { resource: '*', action: 'delete' },
    { resource: '*', action: 'admin' },
  ],
};

/**
 * Check if user has permission
 */
export function hasPermission(
  user: User,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin'
): boolean {
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  
  return permissions.some(
    p => (p.resource === resource || p.resource === '*') && 
         (p.action === action || p.action === 'admin')
  );
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'No authorization token provided',
      };
    }
    
    const token = authHeader.substring(7);
    
    // Validate token (this would use JWT verification in production)
    const user = await validateToken(token);
    
    if (!user) {
      return {
        authenticated: false,
        error: 'Invalid or expired token',
      };
    }
    
    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return {
      authenticated: false,
      error: `Authentication failed: ${message}`,
    };
  }
}

/**
 * Require specific role middleware
 */
export async function requireRole(
  request: Request,
  requiredRole: 'user' | 'premium' | 'enterprise' | 'admin'
): Promise<AuthResult> {
  const authResult = await requireAuth(request);
  
  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }
  
  const roleHierarchy = ['user', 'premium', 'enterprise', 'admin'];
  const userRoleLevel = roleHierarchy.indexOf(authResult.user.role);
  const requiredRoleLevel = roleHierarchy.indexOf(requiredRole);
  
  if (userRoleLevel < requiredRoleLevel) {
    return {
      authenticated: false,
      error: `Requires ${requiredRole} role or higher`,
    };
  }
  
  return authResult;
}

/**
 * Require permission middleware
 */
export async function requirePermission(
  request: Request,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin'
): Promise<AuthResult> {
  const authResult = await requireAuth(request);
  
  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }
  
  if (!hasPermission(authResult.user, resource, action)) {
    return {
      authenticated: false,
      error: `Permission denied: ${action} ${resource}`,
    };
  }
  
  return authResult;
}

/**
 * Validate JWT token
 *
 * NOTE: This is a legacy function kept for backward compatibility.
 * New code should use jwtValidation service from @/lib/auth/jwt-validation
 *
 * @deprecated Use jwtValidation.validateToken() instead
 */
async function validateToken(token: string): Promise<User | null> {
  try {
    // Import the proper JWT validation service
    const { jwtValidation } = await import('@/lib/auth/jwt-validation');

    const result = await jwtValidation.validateToken(token);

    if (!result.valid || !result.user) {
      return null;
    }

    // Convert to legacy User format
    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name || undefined,
      role: result.user.role,
      permissions: [], // Permissions are handled by RBAC service
      createdAt: new Date(result.user.createdAt || Date.now()),
      lastLogin: new Date(),
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * API Key authentication
 */
export async function validateAPIKey(apiKey: string): Promise<AuthResult> {
  try {
    // In production, validate against database
    // For now, check against environment variable
    const validKey = process.env.AIML_API_KEY;
    
    if (apiKey === validKey) {
      return {
        authenticated: true,
        user: {
          id: 'api-user',
          email: 'api@system',
          role: 'enterprise',
          permissions: [],
          createdAt: new Date(),
        },
      };
    }
    
    return {
      authenticated: false,
      error: 'Invalid API key',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation error';
    return {
      authenticated: false,
      error: `API key validation failed: ${message}`,
    };
  }
}

/**
 * Create authentication response
 */
export function createAuthResponse(authResult: AuthResult): Response {
  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({
        error: authResult.error || 'Authentication required',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer',
        },
      }
    );
  }
  
  // Should not reach here
  return new Response('OK', { status: 200 });
}

/**
 * Create permission denied response
 */
export function createPermissionDeniedResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Permission denied',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Extract user from request
 * Helper function to get authenticated user in route handlers
 */
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authResult = await requireAuth(request);
  return authResult.user || null;
}

/**
 * Session management
 */
interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

const sessions: Map<string, Session> = new Map();

/**
 * Create session
 */
export function createSession(userId: string, expiresIn: number = 24 * 60 * 60 * 1000): string {
  const token = generateToken();
  const now = new Date();
  
  const session: Session = {
    userId,
    token,
    expiresAt: new Date(now.getTime() + expiresIn),
    createdAt: now,
    lastActivity: now,
  };
  
  sessions.set(token, session);
  return token;
}

/**
 * Get session
 */
export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }
  
  // Check if expired
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  
  // Update last activity
  session.lastActivity = new Date();
  
  return session;
}

/**
 * Delete session
 */
export function deleteSession(token: string): void {
  sessions.delete(token);
}

/**
 * Generate random token
 */
function generateToken(): string {
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2) +
         Date.now().toString(36);
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  const tokensToDelete: string[] = [];
  
  sessions.forEach((session, token) => {
    if (session.expiresAt < now) {
      tokensToDelete.push(token);
    }
  });
  
  tokensToDelete.forEach(token => sessions.delete(token));
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

