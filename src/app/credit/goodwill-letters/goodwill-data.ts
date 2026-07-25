/**
 * Goodwill Letters — real-data adapter (web).
 *
 * Pure mapping between the HTTP payload of GET /api/credit-repair/goodwill
 * (backed by src/lib/credit-repair/db/goodwill-db-service.ts `GoodwillLetter`,
 * whose `Date` columns serialize to ISO strings over the wire) and the view
 * model the Goodwill Letters page renders.
 *
 * Nothing is fabricated: a field the route does not provide is omitted rather
 * than invented (the schema has no per-letter `letterType` nor an email-style
 * `subject`; the letter's real `reason` is the honest descriptive line), an
 * absent creditor becomes an empty string rather than a made-up name, and an
 * unrecognized status degrades to `draft` — the floor that claims the least
 * (not sent, not answered, not won).
 */

// Display status the page renders. The route/DB lifecycle is
// draft | sent | response_received | approved | denied; the page renames the two
// terminal states to successful | unsuccessful.
export type LetterDisplayStatus =
  | "draft"
  | "sent"
  | "response_received"
  | "successful"
  | "unsuccessful";

// Display outcome the page's stats read. The DB outcome is
// removed | denied | pending; `denied` renders as `declined`.
export type LetterOutcome = "removed" | "declined" | "pending";

/**
 * Raw goodwill letter as returned by GET /api/credit-repair/goodwill
 * (src/lib/credit-repair/db/goodwill-db-service.ts `GoodwillLetter`). Date
 * columns serialize to ISO strings over HTTP. Fields the page does not render
 * are declared for documentation but left optional and tolerant, so a partial
 * payload never throws.
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
  createdAt?: string;
  updatedAt?: string;
}

export interface GoodwillLetterView {
  id: string;
  creditorName: string;
  accountNumber?: string;
  reason: string;
  status: LetterDisplayStatus;
  sentDate?: string; // ISO string; present only once the letter has been sent
  outcome?: LetterOutcome;
  createdAt?: string; // ISO string
}

// DB status -> display status. `approved`/`denied` are the only terminal states,
// rendered as successful/unsuccessful. Unknown/missing -> `draft`.
const STATUS_MAP: Record<string, LetterDisplayStatus> = {
  draft: "draft",
  sent: "sent",
  response_received: "response_received",
  approved: "successful",
  denied: "unsuccessful",
};

export function normalizeStatus(
  status: string | undefined,
): LetterDisplayStatus {
  // hasOwnProperty guard so inherited keys (`__proto__`, `constructor`, ...) can
  // never resolve to a non-status value; an unrecognized status degrades to
  // `draft`.
  return status && Object.prototype.hasOwnProperty.call(STATUS_MAP, status)
    ? STATUS_MAP[status]
    : "draft";
}

// DB outcome (removed | denied | pending) -> display outcome. `denied` renders as
// `declined`; unknown/missing -> undefined (omitted rather than invented).
const OUTCOME_MAP: Record<string, LetterOutcome> = {
  removed: "removed",
  denied: "declined",
  pending: "pending",
};

export function normalizeOutcome(
  outcome: string | undefined,
): LetterOutcome | undefined {
  return outcome && Object.prototype.hasOwnProperty.call(OUTCOME_MAP, outcome)
    ? OUTCOME_MAP[outcome]
    : undefined;
}

/**
 * Map a raw web goodwill letter onto the page's view model. `creditorName` and
 * `reason` fall back to "" rather than a fabricated value; `accountNumber`,
 * `sentDate`, `outcome`, and `createdAt` pass through (omitted when absent);
 * `status` is normalized to the display union.
 */
export function mapGoodwillLetter(raw: WebGoodwillLetter): GoodwillLetterView {
  return {
    id: raw.id,
    creditorName: raw.creditorName ?? "",
    accountNumber: raw.accountNumber,
    reason: raw.reason ?? "",
    status: normalizeStatus(raw.status),
    sentDate: raw.sentAt,
    outcome: normalizeOutcome(raw.outcome),
    createdAt: raw.createdAt,
  };
}

export interface GoodwillStats {
  total: number;
  sent: number;
  successful: number;
  successRate: number;
}

/**
 * Stats computed from the real letters. `sent` counts letters that carry a real
 * sent timestamp; `successful` counts a `removed` outcome; `successRate` is
 * successful / sent as a whole percent, and 0 when nothing has been sent (never
 * divides by zero).
 */
export function computeStats(letters: GoodwillLetterView[]): GoodwillStats {
  const total = letters.length;
  const sent = letters.filter((l) => Boolean(l.sentDate)).length;
  const successful = letters.filter((l) => l.outcome === "removed").length;
  const successRate = sent > 0 ? Math.round((successful / sent) * 100) : 0;
  return { total, sent, successful, successRate };
}

/** ISO 8601 -> compact locale date. Absent or unparseable input yields "". */
export function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}
