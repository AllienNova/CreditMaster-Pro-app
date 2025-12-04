/**
 * JWT Validation Service
 * 
 * Provides JWT token validation and verification for API routes.
 */

import { supabase } from '@/lib/supabase';
import { User } from './auth-service';

export interface JWTValidationResult {
  valid: boolean;
  user?: User;
  error?: string;
}

class JWTValidationService {
  /**
   * Validate JWT token from Authorization header
   */
  async validateToken(token: string): Promise<JWTValidationResult> {
    try {
      if (!token) {
        return {
          valid: false,
          error: 'No token provided',
        };
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');

      // Verify token with Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(cleanToken);

      if (authError || !authUser) {
        return {
          valid: false,
          error: authError?.message || 'Invalid token',
        };
      }

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Failed to fetch user profile:', profileError);
      }

      const user: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: profileData?.name || authUser.user_metadata?.name || 'User',
        role: profileData?.role || 'user',
        subscriptionId: profileData?.subscription_id,
        subscriptionStatus: profileData?.subscription_status,
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(profileData?.updated_at || authUser.updated_at),
      };

      return {
        valid: true,
        user,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
      return null;
    }

    // Support both 'Bearer token' and 'token' formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Validate token from request headers
   */
  async validateFromHeaders(headers: Headers): Promise<JWTValidationResult> {
    const authHeader = headers.get('authorization');
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        valid: false,
        error: 'No authorization token provided',
      };
    }

    return this.validateToken(token);
  }
}

// Export singleton instance
export const jwtValidation = new JWTValidationService();
export default jwtValidation;

