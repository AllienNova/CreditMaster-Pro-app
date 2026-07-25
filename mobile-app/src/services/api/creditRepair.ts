/**
 * Fynvita Mobile Credit Repair API Service
 *
 * Shared client for the Credit Repair surface. Goodwill letters and debt
 * negotiations are wired today; the remaining screens (cards, inquiries) will
 * extend this same client as they are wired to real data. Each getter calls the
 * real web route through the shared api client and adapts the web payload onto
 * the mobile shape — nothing is fabricated.
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

// --- Mobile-facing debt-negotiation shape -----------------------------------
// The mobile Negotiate screen renders a creditor, a current balance vs. its
// original balance, a status badge, and a last-activity date. Its status
// vocabulary is narrower than the web's: the web route tracks a six-value
// pay-for-delete lifecycle (pending | negotiating | agreed | paid | completed |
// failed) while the mobile screen speaks only active | negotiating | settled.
// The adapter below compresses the web enum onto the mobile one without ever
// inventing a positive outcome.

export type NegotiationStatus = "active" | "negotiating" | "settled";

export interface NegotiationDebt {
  id: string;
  creditor: string;
  balance: number;
  originalBalance: number;
  status: NegotiationStatus;
  updatedAt: string; // ISO 8601 over HTTP; last activity on the negotiation
}

/**
 * Raw negotiation as returned by GET /api/credit-repair/negotiate
 * (src/lib/credit-repair/db/negotiations-db-service.ts `Negotiation`). The web
 * route serializes the record with `NextResponse.json`, so its `Date` columns
 * (createdAt, updatedAt, ...) arrive as ISO strings. Fields the mobile screen
 * does not render are declared for documentation but left optional and tolerant,
 * so a partial payload never throws.
 */
export interface WebNegotiation {
  id: string;
  userId?: string;
  collectionAgency?: string;
  originalCreditor?: string;
  accountNumber?: string;
  originalBalance?: number;
  currentBalance?: number;
  settlementPercentage?: number;
  settlementAmount?: number;
  scripts?: Record<string, string>;
  status?: string;
  agreedAt?: string;
  paidAt?: string;
  deletionConfirmedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Web -> mobile status compression. The mobile screen has exactly three buckets.
// `pending` (created, not yet worked) and `failed` (negotiation did not succeed —
// the debt is still owed) are both unresolved, so both map to `active`, the red
// "needs attention" floor. `negotiating` and `agreed` are in flight — `agreed`
// means a settlement was struck but the debt is not yet paid, so it stays
// `negotiating` rather than claiming a win. Only `paid` and `completed` are truly
// resolved -> `settled`. Mapping `failed` or `agreed` to `settled` would fabricate
// a positive outcome; an unknown or missing status degrades to `active`, the
// bucket that claims the least: not in progress, not resolved.
const WEB_TO_MOBILE_NEGOTIATION_STATUS: Record<string, NegotiationStatus> = {
  pending: "active",
  failed: "active",
  negotiating: "negotiating",
  agreed: "negotiating",
  paid: "settled",
  completed: "settled",
};

function normalizeNegotiationStatus(
  status: string | undefined,
): NegotiationStatus {
  // Guard with hasOwnProperty so inherited object keys (`__proto__`,
  // `constructor`, ...) can never resolve to a truthy non-status value; an
  // unrecognized status degrades to `active`.
  return status &&
    Object.prototype.hasOwnProperty.call(WEB_TO_MOBILE_NEGOTIATION_STATUS, status)
    ? WEB_TO_MOBILE_NEGOTIATION_STATUS[status]
    : "active";
}

/**
 * Map a web negotiation onto the mobile NegotiationDebt shape. Web tracks the
 * counterparty as `collectionAgency` (the entity currently holding the debt and
 * the one being negotiated with); the mobile screen labels that the `creditor`.
 * `currentBalance` becomes the displayed `balance`; `originalBalance` is
 * preserved. `updatedAt` — the last time the negotiation record changed — is the
 * honest source for the screen's last-activity date. No values are fabricated: an
 * absent creditor becomes an empty string rather than a made-up name, absent
 * balances become 0 rather than an invented amount, and an unrecognized status
 * degrades to `active` rather than an invented outcome.
 */
export function mapWebNegotiation(raw: WebNegotiation): NegotiationDebt {
  return {
    id: raw.id,
    creditor: raw.collectionAgency ?? "",
    balance: raw.currentBalance ?? 0,
    originalBalance: raw.originalBalance ?? 0,
    status: normalizeNegotiationStatus(raw.status),
    updatedAt: raw.updatedAt ?? "",
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

  /**
   * Get all debt negotiations for the current user. The web route returns
   * `{ negotiations, stats, pagination }`; the shared client unwraps the
   * `{ success, data }` envelope, so `res.data` is that inner object. The
   * negotiations are adapted onto the mobile NegotiationDebt shape; a failed
   * request passes straight through without fabricating data.
   */
  getNegotiations: async (): Promise<
    ApiResponse<{ debts: NegotiationDebt[] }>
  > => {
    const res = await api.get<{ negotiations?: WebNegotiation[] }>(
      "/credit-repair/negotiate",
    );
    if (res.success && res.data) {
      const debts = Array.isArray(res.data.negotiations)
        ? res.data.negotiations.map(mapWebNegotiation)
        : [];
      return { success: true, data: { debts } };
    }
    return { success: false, error: res.error };
  },
};

export default creditRepairApi;
