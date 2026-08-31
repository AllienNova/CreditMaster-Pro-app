"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/*
 * WHAT THIS REPLACED. `initialAccounts` listed Chase Bank, Bank of America and
 * three credit bureaus with statuses and "2 hours ago" sync times, for every
 * caller, with no request of any kind. Disconnect filtered the local array;
 * Reconnect set the row to "pending" and a setTimeout flipped it back. A user
 * checking whether their bank was still linked was shown a yes, and a user
 * cutting a bank off was shown a disconnection that never happened.
 *
 * The mobile twin of this screen was fixed earlier today for exactly this.
 *
 * WHERE EVERY FIELD NOW COMES FROM.
 *   banks    GET /api/financial/connections -> plaidService.listConnections,
 *            which returns bank_connections with their financial_accounts.
 *            `status` is "active" | "needs_attention", derived from what
 *            Plaid's webhooks reported; `lastSynced` is the real
 *            financial_accounts.last_synced, never "just now".
 *   bureaus  GET /api/credit-bureau/connect ->
 *            CreditBureauService.getBureauConnectionStatuses, which answers for
 *            all three bureaus with `connected` and a real `last_pull_date`.
 *   remove   DELETE /api/financial/connections/[connectionId], which revokes
 *            at Plaid and reports which of four outcomes happened.
 *
 * THERE IS NO RECONNECT BUTTON. Re-authenticating a Plaid Item needs Link's
 * update mode (a link_token minted from the existing access_token), which this
 * app does not build. A button that cannot do the thing is the defect being
 * removed, not a feature worth preserving.
 */

/** plaid-service.ts:162-183. */
interface BankConnectionAccount {
  id: string;
  accountName: string;
  lastSynced: string;
}
interface BankConnection {
  id: string;
  institutionName: string | null;
  status: "active" | "needs_attention";
  errorMessage: string | null;
  consentExpiresAt: string | null;
  accounts: BankConnectionAccount[];
}

/** credit-bureau/types.ts:296-302. */
interface BureauConnectionStatus {
  bureau: string;
  connected: boolean;
  last_pull_date: string | null;
}

/** An ISO timestamp as "3 days ago". Null stays null — never "just now". */
function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** The most recent sync across a connection's accounts, or null if none. */
function lastSyncOf(connection: BankConnection): string | null {
  const times = connection.accounts
    .map((a) => new Date(a.lastSynced).getTime())
    .filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export default function ConnectedAccountsPage() {
  const [banks, setBanks] = useState<BankConnection[] | null>(null);
  const [bureaus, setBureaus] = useState<BureauConnectionStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [bankRes, bureauRes] = await Promise.all([
        fetch("/api/financial/connections"),
        fetch("/api/credit-bureau/connect"),
      ]);
      if (!bankRes.ok || !bureauRes.ok) throw new Error("load failed");
      const bankJson = await bankRes.json();
      const bureauJson = await bureauRes.json();
      setBanks(Array.isArray(bankJson.connections) ? bankJson.connections : []);
      setBureaus(Array.isArray(bureauJson.data) ? bureauJson.data : []);
    } catch {
      // A failed read and "you have linked nothing" are different, and must
      // not render the same — that equivalence is what let the invented list
      // look plausible in the first place.
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDisconnect = async (connection: BankConnection) => {
    const label = connection.institutionName ?? "this bank";
    const count = connection.accounts.length;
    if (
      !confirm(
        `Disconnecting ${label} removes all ${count} of its account${count === 1 ? "" : "s"} from Fynvita and revokes our access at your bank.`,
      )
    )
      return;
    setRemoving(connection.id);
    try {
      const res = await fetch(`/api/financial/connections/${connection.id}`, {
        method: "DELETE",
      });
      // Only drop the row when the server says it is gone. The old handler
      // removed it locally whatever happened, which is how a disconnection
      // that never occurred looked successful.
      if (res.ok) setBanks((prev) => (prev ?? []).filter((c) => c.id !== connection.id));
      else alert("We could not disconnect that account. Nothing has changed.");
    } catch {
      alert("We could not disconnect that account. Nothing has changed.");
    }
    setRemoving(null);
  };

  const statusBadge = (label: string, tone: "ok" | "warn") => (
    <span
      className={`px-2 py-1 text-xs rounded-full ${
        tone === "ok"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Connected Accounts
      </h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">
        Manage your linked bank accounts and credit bureaus
      </p>

      {error ? (
        <div className="mb-8 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
          <p className="text-gray-900 dark:text-white font-medium">
            We could not load your connections.
          </p>
          <button
            onClick={load}
            className="mt-2 text-sm text-emerald-500 hover:text-emerald-600 font-medium"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <p className="mb-8 text-gray-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          {/* Bank Accounts */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Bank Accounts
            </h3>
            {(banks ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No bank is linked yet.
              </p>
            ) : (
              <div className="space-y-3">
                {(banks ?? []).map((c) => {
                  const synced = relativeTime(lastSyncOf(c));
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Icon name="building" className="text-2xl inline-block" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {c.institutionName ?? "Unnamed institution"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {c.accounts.length} account
                            {c.accounts.length === 1 ? "" : "s"}
                            {synced ? ` · last synced ${synced}` : " · never synced"}
                          </p>
                          {c.status === "needs_attention" && (
                            <p className="text-sm text-yellow-700">
                              {c.errorMessage ??
                                "Your bank needs you to sign in again."}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {statusBadge(
                          c.status === "active" ? "Connected" : "Needs attention",
                          c.status === "active" ? "ok" : "warn",
                        )}
                        <button
                          onClick={() => handleDisconnect(c)}
                          disabled={removing === c.id}
                          className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-50"
                        >
                          {removing === c.id ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Credit Bureaus */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Credit Bureaus
            </h3>
            <div className="space-y-3">
              {(bureaus ?? []).map((b) => {
                const pulled = relativeTime(b.last_pull_date);
                return (
                  <div
                    key={b.bureau}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Icon
                        name="document-chart"
                        className="text-2xl inline-block"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {b.bureau}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {pulled ? `Last pulled ${pulled}` : "Never pulled"}
                        </p>
                      </div>
                    </div>
                    {statusBadge(
                      b.connected ? "Connected" : "Not connected",
                      b.connected ? "ok" : "warn",
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Security Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-blue-500"></span>
          <div>
            <p className="font-medium text-blue-900">Your data is secure</p>
            <p className="text-sm text-blue-700">
              We use bank-level 256-bit encryption and never store your login
              credentials. All connections are read-only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
