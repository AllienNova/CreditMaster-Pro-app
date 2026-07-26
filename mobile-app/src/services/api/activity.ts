/**
 * Fynvita Mobile Activity API Service
 *
 * The Activity feed is backed by the real `notifications` table, surfaced through
 * GET /api/activity (authed). The web route maps each notification's
 * type/title/message/read/created_at onto the pinned activity contract; this
 * client adapts that web payload onto the mobile ActivityItem shape. Nothing is
 * fabricated — an absent field becomes an empty string / false, and an
 * unrecognized `type` degrades to the neutral `other` bucket (a default icon, not
 * an invented category). A failed request passes straight through so the screen
 * can show an honest error state rather than the old hardcoded feed.
 */

import { api } from "./client";
import type { ApiResponse } from "./types";

// The activity `type` vocabulary the route emits, sourced from the notifications
// table: dispute_update | payment_success | document_uploaded | tip. `other` is
// the neutral floor an unrecognized/missing type degrades to — the screen renders
// it with a default icon rather than fabricating a category.
export type ActivityType =
  | "dispute_update"
  | "payment_success"
  | "document_uploaded"
  | "tip"
  | "other";

// The four real types the route actually emits (everything else -> `other`). Used
// both to normalize an incoming type and to drive the screen's filter chips.
export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "dispute_update",
  "payment_success",
  "document_uploaded",
  "tip",
];

export interface ActivityItem {
  id: string;
  type: ActivityType; // real type, or `other` for anything unrecognized
  title: string;
  message: string;
  createdAt: string; // ISO 8601 over HTTP; "" when absent
  read: boolean; // true only when the payload literally says so
}

/**
 * Raw activity item as returned by GET /api/activity. The web route maps a
 * notifications row (type/title/message/read/created_at) onto this shape and
 * serializes it with NextResponse.json, so `createdAt` arrives as an ISO string.
 * Every field except `id` is optional and tolerant so a partial payload never
 * throws — the adapter substitutes an empty/false floor, never a fabricated value.
 */
export interface WebActivity {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
}

// Pass a type through only when it is one the route actually emits; anything else
// (unknown value, missing, or a poisoned prototype key such as "constructor")
// degrades to `other` — the neutral floor that never fabricates a category.
function normalizeActivityType(type: string | undefined): ActivityType {
  return type && (ACTIVITY_TYPES as readonly string[]).includes(type)
    ? (type as ActivityType)
    : "other";
}

/**
 * Map a raw web activity onto the mobile ActivityItem shape. No fabrication: an
 * absent title/message becomes an empty string, an absent createdAt becomes ""
 * (the screen then omits the time line rather than showing a fake one), `read` is
 * true only when the payload literally says so (an unknown item stays unread — the
 * floor that surfaces it rather than hiding it), and an unrecognized type degrades
 * to `other`.
 */
export function mapWebActivity(raw: WebActivity): ActivityItem {
  return {
    id: raw.id,
    type: normalizeActivityType(raw.type),
    title: raw.title ?? "",
    message: raw.message ?? "",
    createdAt: raw.createdAt ?? "",
    read: raw.read === true,
  };
}

export const activityApi = {
  /**
   * Get the current user's activity feed. The web route returns `{ activities }`;
   * the shared client unwraps the `{ success, data }` envelope, so `res.data` is
   * that inner object. Each item is adapted onto the mobile ActivityItem shape; a
   * non-array `activities` degrades to an empty list, and a failed request passes
   * straight through without fabricating data.
   */
  getActivity: async (): Promise<ApiResponse<{ activities: ActivityItem[] }>> => {
    const res = await api.get<{ activities?: WebActivity[] }>("/activity");
    if (res.success && res.data) {
      const activities = Array.isArray(res.data.activities)
        ? res.data.activities.map(mapWebActivity)
        : [];
      return { success: true, data: { activities } };
    }
    return { success: false, error: res.error };
  },
};

export default activityApi;
