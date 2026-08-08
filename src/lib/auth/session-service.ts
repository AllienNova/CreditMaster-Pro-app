/**
 * Session Management Service
 *
 * Provides session tracking and management functionality:
 * - Track active sessions across devices
 * - View session details (device, location, last active)
 * - Revoke sessions remotely
 * - Session timeout management
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Browser client, NOT the anon-keyed getSupabase() singleton this used to hold.
 *
 * getSupabase() builds a raw createClient(url, ANON_KEY), which stores its
 * session in localStorage. The app signs in through useAuth -> createClient()
 * -> @supabase/ssr's createBrowserClient, which stores its session in COOKIES.
 * Two different stores: the raw client never saw the session the app actually
 * established, so auth.uid() was NULL here and every RLS policy of the form
 * (auth.uid() = user_id) matched nothing — zero rows, no error.
 *
 * These modules are called at runtime from "use client" components, so they
 * must NOT use the service role (that key is server-only). createBrowserClient
 * returns a cached singleton in the browser (@supabase/ssr 0.7.0,
 * createBrowserClient.js:8-14,46), so this is the same client useAuth holds,
 * and RLS correctly enforces ownership under the user's own identity.
 */
const supabase = createClient();

export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface SessionCreateData {
  userId: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
}

class SessionService {
  /**
   * Create a new session
   */
  async createSession(
    data: SessionCreateData,
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      const { data: sessionData, error } = await supabase
        .from("sessions")
        .insert({
          user_id: data.userId,
          device_name: data.deviceName,
          device_type: data.deviceType,
          browser: data.browser,
          os: data.os,
          ip_address: data.ipAddress,
          location: data.location,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        sessionId: sessionData.id,
      };
    } catch (error) {
      // SessionService error: Create session error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create session",
      };
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<Session[]> {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("last_active_at", { ascending: false });

      if (error) {
        // SessionService error: Get user sessions error
        return [];
      }

      return data.map((session) => ({
        id: session.id,
        userId: session.user_id,
        deviceName: session.device_name,
        deviceType: session.device_type,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ip_address,
        location: session.location,
        createdAt: new Date(session.created_at),
        lastActiveAt: new Date(session.last_active_at),
        expiresAt: new Date(session.expires_at),
        isCurrent: session.id === currentSessionId,
      }));
    } catch (error) {
      // SessionService error: Get user sessions error
      return [];
    }
  }

  /**
   * Update session last active time
   */
  async updateSessionActivity(
    sessionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          // Real column is `last_activity`; `last_active_at` exists nowhere on
          // public.sessions, so every session-activity update failed and
          // updateSessionActivity always returned success:false.
          last_activity: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // SessionService error: Update session activity error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update session",
      };
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // SessionService error: Revoke session error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke session",
      };
    }
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("user_id", userId)
        .neq("id", currentSessionId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // SessionService error: Revoke all other sessions error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke sessions",
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // SessionService error: Cleanup expired sessions error
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to cleanup sessions",
      };
    }
  }

  /**
   * Get device information from user agent
   */
  getDeviceInfo(userAgent: string): {
    deviceType: "desktop" | "mobile" | "tablet" | "unknown";
    browser: string;
    os: string;
  } {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
    if (ua.includes("mobile")) {
      deviceType = "mobile";
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      deviceType = "tablet";
    } else if (
      ua.includes("windows") ||
      ua.includes("mac") ||
      ua.includes("linux")
    ) {
      deviceType = "desktop";
    }

    // Detect browser
    let browser = "Unknown";
    if (ua.includes("chrome") && !ua.includes("edg")) {
      browser = "Chrome";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      browser = "Safari";
    } else if (ua.includes("firefox")) {
      browser = "Firefox";
    } else if (ua.includes("edg")) {
      browser = "Edge";
    } else if (ua.includes("opera") || ua.includes("opr")) {
      browser = "Opera";
    }

    // Detect OS
    let os = "Unknown";
    if (ua.includes("windows")) {
      os = "Windows";
    } else if (ua.includes("mac")) {
      os = "macOS";
    } else if (ua.includes("linux")) {
      os = "Linux";
    } else if (ua.includes("android")) {
      os = "Android";
    } else if (
      ua.includes("ios") ||
      ua.includes("iphone") ||
      ua.includes("ipad")
    ) {
      os = "iOS";
    }

    return { deviceType, browser, os };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
