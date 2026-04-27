/**
 * FIX Protocol Reject Handler
 *
 * Maps FIX protocol reject codes (tag 103) to typed actions and emits
 * the corresponding canonical incident codes.
 *
 * Reference: FIX 4.2+ tag 103 (OrdRejReason).
 */

import type { CanonicalIncident } from "@/lib/trading/incidents/incident-codes";
import {
  INC_BROKER_REJECT,
  INC_BROKER_CIRCUIT_OPEN,
} from "@/lib/trading/incidents/incident-codes";

// ============================================================================
// TYPES
// ============================================================================

export type RejectActionKind =
  | "RETRY"
  | "FAIL"
  | "ESCALATE"
  | "DISABLE_SYMBOL";

export interface RejectAction {
  kind: RejectActionKind;
  orderId: string;
  rejectCode: number;
  reason: string;
  /** Milliseconds to wait before retry (only for RETRY). */
  retryDelayMs: number | null;
  /** Which incident definition applies. */
  incident: CanonicalIncident;
}

// ============================================================================
// FIX TAG 103 CODE MAP
// ============================================================================

interface CodeEntry {
  kind: RejectActionKind;
  reason: string;
  /** Base delay in ms; doubles per attempt (capped externally). */
  retryDelayMs: number | null;
}

const FIX_REJECT_MAP: ReadonlyMap<number, CodeEntry> = new Map([
  [0, { kind: "FAIL", reason: "Too late to cancel", retryDelayMs: null }],
  [1, { kind: "DISABLE_SYMBOL", reason: "Unknown symbol", retryDelayMs: null }],
  [2, { kind: "RETRY", reason: "Exchange closed", retryDelayMs: 5_000 }],
  [3, { kind: "ESCALATE", reason: "Order exceeds limit", retryDelayMs: null }],
  [4, { kind: "FAIL", reason: "Too late to cancel", retryDelayMs: null }],
  [5, { kind: "FAIL", reason: "Unknown order", retryDelayMs: null }],
  [6, { kind: "FAIL", reason: "Duplicate order", retryDelayMs: null }],
  [7, { kind: "RETRY", reason: "Stale order (duplicate of verbally communicated order)", retryDelayMs: 2_000 }],
  [8, { kind: "ESCALATE", reason: "Trade along required", retryDelayMs: null }],
  [9, { kind: "ESCALATE", reason: "Invalid investor ID", retryDelayMs: null }],
  [10, { kind: "ESCALATE", reason: "Unsupported order characteristic", retryDelayMs: null }],
  [11, { kind: "ESCALATE", reason: "Surveillance option", retryDelayMs: null }],
  [13, { kind: "FAIL", reason: "Incorrect quantity", retryDelayMs: null }],
  [14, { kind: "FAIL", reason: "Incorrect allocated quantity", retryDelayMs: null }],
  [15, { kind: "DISABLE_SYMBOL", reason: "Unknown account", retryDelayMs: null }],
  [99, { kind: "ESCALATE", reason: "Other (unspecified)", retryDelayMs: null }],
]);

const UNKNOWN_CODE_ENTRY: CodeEntry = {
  kind: "ESCALATE",
  reason: "Unmapped FIX reject code",
  retryDelayMs: null,
};

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Maps a FIX tag 103 reject code to a typed action describing how the
 * system should respond. Always returns a valid action; unknown codes
 * default to ESCALATE.
 */
export function handleReject(rejectCode: number, orderId: string): RejectAction {
  const entry = FIX_REJECT_MAP.get(rejectCode) ?? UNKNOWN_CODE_ENTRY;

  const incident: CanonicalIncident =
    entry.kind === "DISABLE_SYMBOL"
      ? { ...INC_BROKER_CIRCUIT_OPEN, description: `FIX reject ${rejectCode}: ${entry.reason}` }
      : INC_BROKER_REJECT;

  return {
    kind: entry.kind,
    orderId,
    rejectCode,
    reason: entry.reason,
    retryDelayMs: entry.retryDelayMs,
    incident,
  };
}
