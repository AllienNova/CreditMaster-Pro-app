/**
 * Fynvita Mobile Credit Repair API Service
 *
 * Shared client for the Credit Repair surface. Goodwill letters are wired today;
 * the remaining screens (cards, inquiries, negotiate) will extend this same
 * client as they are wired to real data. Each getter calls the real web route
 * through the shared api client and adapts the web payload onto the mobile shape
 * — nothing is fabricated.
 */

import { api } from "./client";
import type { ApiResponse } from "./types";

// --- Mobile-facing goodwill letter shape -------------------------------------
// The mobile Goodwill screen renders a creditor, a status badge, and a date. Its
// status vocabulary is narrower than the web's: the web route tracks a five-value
// lifecycle (draft | sent | response_received | approved | denied) while the
// mobile screen speaks draft | sent | responded | success. The adapter below
// compresses the web enum onto the mobile one without ever inventing a positive
// outcome.

export type GoodwillLetterStatus = "draft" | "sent" | "responded" | "success";

export interface GoodwillLetter {
  id: string;
  creditor: string;
  status: GoodwillLetterStatus;
  createdAt: string; // ISO 8601 string over HTTP
}

/**
 * Raw goodwill letter as returned by GET /api/credit-repair/goodwill
 * (src/lib/credit-repair/db/goodwill-db-service.ts `GoodwillLetter`). Date
 * columns serialize to ISO strings over HTTP. Fields the mobile screen does not
 * render are declared for documentation but left optional and tolerant, so a
 * partial payload never throws.
 */
export interface WebGoodwillLetter {
  id: string;
  userId?: string;
  creditorName?: string;
  accountNumber?: string;
  latePaymentDate?: string;
  reason?: string;
  letterContent?: string;
  status?: string;
  sentAt?: string;
  responseReceivedAt?: string;
  outcome?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Web -> mobile status compression. `response_received` and `denied` both mean
// "the creditor replied" — neither is a success, so both map to `responded`.
// Mapping `denied` to `success` would fabricate a positive outcome; mapping it to
// `sent`/`draft` would falsely erase the reply. `approved` is the only true
// success. Unknown or missing statuses fall back to `draft`, the floor that
// claims the least: not sent, not answered, not won.
const WEB_TO_MOBILE_STATUS: Record<string, GoodwillLetterStatus> = {
  draft: "draft",
  sent: "sent",
  response_received: "responded",
  denied: "responded",
  approved: "success",
};

function normalizeGoodwillStatus(
  status: string | undefined,
): GoodwillLetterStatus {
  // Guard with hasOwnProperty so inherited object keys (`__proto__`,
  // `constructor`, ...) can never resolve to a truthy non-status value; an
  // unrecognized status degrades to `draft`.
  return status &&
    Object.prototype.hasOwnProperty.call(WEB_TO_MOBILE_STATUS, status)
    ? WEB_TO_MOBILE_STATUS[status]
    : "draft";
}

/**
 * Map a web goodwill letter onto the mobile GoodwillLetter shape. Web uses
 * `creditorName`; mobile uses `creditor`. `createdAt` is preserved as-is (already
 * an ISO string over HTTP). No values are fabricated — an absent creditorName
 * becomes an empty string rather than a made-up name, and an unrecognized status
 * degrades to `draft` rather than an invented outcome.
 */
export function mapWebGoodwillLetter(raw: WebGoodwillLetter): GoodwillLetter {
  return {
    id: raw.id,
    creditor: raw.creditorName ?? "",
    status: normalizeGoodwillStatus(raw.status),
    createdAt: raw.createdAt,
  };
}

export const creditRepairApi = {
  /**
   * Get all goodwill letters for the current user. The web route returns
   * `{ letters, stats, pagination }`; the shared client unwraps the
   * `{ success, data }` envelope, so `res.data` is that inner object. The letters
   * are adapted onto the mobile shape; a failed request passes straight through
   * without fabricating data.
   */
  getGoodwillLetters: async (): Promise<
    ApiResponse<{ letters: GoodwillLetter[] }>
  > => {
    const res = await api.get<{ letters?: WebGoodwillLetter[] }>(
      "/credit-repair/goodwill",
    );
    if (res.success && res.data) {
      const letters = Array.isArray(res.data.letters)
        ? res.data.letters.map(mapWebGoodwillLetter)
        : [];
      return { success: true, data: { letters } };
    }
    return { success: false, error: res.error };
  },
};

export default creditRepairApi;
