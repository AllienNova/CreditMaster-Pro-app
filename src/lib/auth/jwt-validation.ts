/**
 * JWT Validation Service
 * Handles JWT token validation from request headers
 */

export interface JWTUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface JWTValidationResult {
  valid: boolean;
  user: JWTUser | null;
  error?: string;
}

/**
 * JWT Validation service
 */
export const jwtValidation = {
  /**
   * Validate JWT token from request headers
   */
  async validateFromHeaders(request: Request): Promise<JWTValidationResult> {
    try {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          valid: false,
          user: null,
          error: 'No authorization token provided',
        };
      }
      
      const token = authHeader.substring(7);
      
      // In production, this would verify the JWT token signature
      // For now, we decode and validate the token structure
      const user = await this.verifyToken(token);
      
      if (!user) {
        return {
          valid: false,
          user: null,
          error: 'Invalid or expired token',
        };
      }
      
      return {
        valid: true,
        user,
      };
    } catch (error) {
      return {
        valid: false,
        user: null,
        error: 'Token validation failed',
      };
    }
  },

  /**
   * Verify JWT token
   * In production, use jsonwebtoken or jose library
   */
  async verifyToken(token: string): Promise<JWTUser | null> {
    try {
      // Development token for testing
      if (token === 'dev-token') {
        return {
          id: 'dev-user-1',
          email: 'dev@example.com',
          name: 'Dev User',
          role: 'premium',
        };
      }
      
      // In production, decode and verify JWT:
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return { id: decoded.userId, email: decoded.email, ... };
      
      // For now, try to decode base64 token payload
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          if (payload.userId && payload.email) {
            return {
              id: payload.userId,
              email: payload.email,
              name: payload.name,
              role: payload.role || 'user',
            };
          }
        }
      } catch {
        // Not a valid JWT format
      }
      
      return null;
    } catch {
      return null;
    }
  },
};

export default jwtValidation;

