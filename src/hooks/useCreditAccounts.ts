/**
 * The caller's own credit tradelines.
 *
 * GET /api/credit-repair/accounts — permission-gated (`credit:read`), user id
 * from the guard, real `credit_accounts` rows with age derived from
 * `opened_date`.
 *
 * WHY A SHARED HOOK. Five screens each held the reader's cards in a useState
 * initialiser and computed advice from them — utilisation percentages, credit
 * age, credit mix, payment timing:
 *
 *   src/app/credit-builder/utilization/page.tsx          cards
 *   src/app/credit-builder/age/page.tsx                  accounts
 *   src/app/credit-builder/mix/page.tsx                  accountTypes
 *   src/components/credit-repair/UtilizationOptimizer.tsx     cards
 *   src/components/credit-repair/PaymentTimingOptimizer.tsx   cards
 *
 * All five were invisible to audit:screen-data until the useState detector
 * landed (da4323a). Five separate fetches would drift five separate ways on
 * what an empty list means and what a missing credit limit implies, so they
 * read through here.
 *
 * ON `creditLimit`. A loan has no limit, and the column is nullable. It is
 * carried as `number | null` rather than defaulted to 0 — a zero limit would
 * make utilisation infinite or NaN, and a card with "0% used" that has no
 * limit is a claim, not a blank.
 */

"use client";

import { useState, useEffect } from "react";

/** Mirrors the projection in api/credit-repair/accounts/route.ts:54. */
export interface CreditAccount {
  id: string;
  creditorName: string;
  accountType: string;
  balance: number;
  creditLimit: number | null;
  paymentStatus: string;
  openedDate: string | null;
  /** Set when the tradeline is closed; null while it is open. */
  closedDate: string | null;
  ageMonths: number | null;
}

export interface CreditAccountsState {
  accounts: CreditAccount[];
  loading: boolean;
  /** Null when the read succeeded — an empty list is then genuinely empty. */
  error: string | null;
}

const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const numOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function useCreditAccounts(): CreditAccountsState {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/credit-repair/accounts");
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json?.accounts)) {
          setAccounts([]);
          setError(
            "We could not load your credit accounts. Nothing is filled in for you — try again in a moment.",
          );
        } else {
          setAccounts(
            (json.accounts as Record<string, unknown>[]).map((account) => ({
              id: String(account.id ?? ""),
              creditorName: String(account.creditorName ?? "Account"),
              accountType: String(account.accountType ?? ""),
              balance: num(account.balance),
              creditLimit: numOrNull(account.creditLimit),
              paymentStatus: String(account.paymentStatus ?? ""),
              openedDate:
                typeof account.openedDate === "string"
                  ? account.openedDate
                  : null,
              closedDate:
                typeof account.closedDate === "string"
                  ? account.closedDate
                  : null,
              ageMonths: numOrNull(account.ageMonths),
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setError("We could not reach the credit-accounts service.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { accounts, loading, error };
}

/**
 * Balance as a share of limit, or null when there is no limit to divide by.
 *
 * Null and not 0: a loan has no credit limit, and "0% utilised" would read as
 * a card being used well rather than as a figure that does not apply.
 */
export function utilizationOf(account: CreditAccount): number | null {
  if (account.creditLimit === null || account.creditLimit <= 0) return null;
  return Math.round((account.balance / account.creditLimit) * 100);
}
