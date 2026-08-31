/**
 * Connected Accounts — the banks and bureaus the user has actually linked.
 *
 * WHAT THIS REPLACED. A hardcoded CONNECTED_ACCOUNTS array shown to every
 * user: Experian, Equifax and TransUnion "connected" (TransUnion helpfully
 * "needs attention", synced "3 days ago"), plus Chase Checking, Marcus Savings
 * and a Fidelity 401(k). The screen made no request of any kind. Disconnect
 * filtered the local array — nothing was revoked, and reopening the screen
 * brought the account back. Reconnect set status to "connected" and the sync
 * time to "Just now" without contacting anything.
 *
 * That is worse than a blank screen. A user checking whether their bank is
 * still linked was shown a yes; a user cutting a bank off was shown a
 * disconnection that never happened.
 *
 * WHERE EVERY FIELD NOW COMES FROM.
 *   banks    GET /api/financial/connections -> bank_connections + their
 *            financial_accounts rows. status is derived from what Plaid's
 *            webhooks actually reported (error_code / consent_expiration_time)
 *            and nothing else; silence is reported as connected, not as a
 *            problem.
 *   bureaus  GET /api/credit-bureau/connect ->
 *            CreditBureauService.getBureauConnectionStatuses, which answers for
 *            all three bureaus with connected true/false and a real last-pull
 *            date.
 *   sync     the real financial_accounts.last_synced, rendered relatively.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no Reconnect button. Re-authenticating
 * a Plaid Item needs Link's update mode (a link_token minted with the existing
 * access_token), which this app does not build — so a needs-attention
 * connection states the reason and says re-linking is the fix, rather than
 * offering a control that would do nothing. Same reasoning as the deleted
 * Reconnect, arrived at from the other direction.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { PlaidHostedLink } from "../../src/components/PlaidHostedLink";
import { useAuthStore } from "../../src/store/authStore";
import {
  bankConnectionApi,
  type BankConnection,
} from "../../src/services/api/financial";
import {
  creditMonitoringApi,
  type BureauConnection,
} from "../../src/services/api/credit";

const BUREAU_LABELS: Record<BureauConnection["bureau"], string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const CONNECTED_COLOR = "#22C55E";
const ATTENTION_COLOR = "#F59E0B";
const DISCONNECTED_COLOR = "#94A3B8";

const currency = (amount: number, code: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(amount);

/**
 * "5 minutes ago" from a real timestamp.
 *
 * Returns null for an absent or unparseable value so the caller can omit the
 * line entirely — the previous screen's answer to not knowing when something
 * synced was to say "2 hours ago".
 */
function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** The most recent sync across a connection's accounts, or null if none. */
function lastSyncedAt(connection: BankConnection): string | null {
  const times = connection.accounts
    .map((a) => a.lastSynced)
    .filter((t): t is string => Boolean(t));
  if (times.length === 0) return null;
  return times.reduce((latest, t) => (t > latest ? t : latest));
}

/**
 * What to tell the user about a connection needing attention.
 *
 * Prefers Plaid's own error_message because it names the actual problem
 * ("the login details of this item have changed"). Falls back to the consent
 * case, which has no message — only a date.
 */
function attentionReason(connection: BankConnection): string {
  if (connection.errorMessage) return connection.errorMessage;
  if (connection.consentExpiresAt) {
    return "Your permission for this bank is expiring. Link it again to keep it up to date.";
  }
  // The webhook writes error_code and error_message independently, so a code
  // can arrive with no prose. Showing the code beats the tautology "this
  // connection needs attention" — it is at least something support can act on.
  if (connection.errorCode) {
    return `Your bank reported a problem (${connection.errorCode}). Link it again to fix it.`;
  }
  return "This connection needs attention.";
}

export default function ConnectedAccountsScreen() {
  const { user } = useAuthStore();

  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [bureaus, setBureaus] = useState<BureauConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [bankRes, bureauRes] = await Promise.all([
      bankConnectionApi.getConnections(),
      creditMonitoringApi.getBureauConnections(),
    ]);

    if (!bankRes.success || !bankRes.data) {
      // Not an empty list. "We could not load this" and "you have linked
      // nothing" lead a user to opposite actions, and conflating them is how
      // the fabricated version looked plausible in the first place.
      setError("We could not load your connections.");
      setIsLoading(false);
      return;
    }

    setConnections(bankRes.data.connections ?? []);
    // The bureau list is secondary: a failure there leaves that section empty
    // rather than blanking the banks the request did return.
    setBureaus(bureauRes.success && bureauRes.data ? bureauRes.data : []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDisconnect = (connection: BankConnection) => {
    const label = connection.institutionName ?? "this bank";
    const accountCount = connection.accounts.length;

    Alert.alert(
      "Disconnect bank",
      // Say how many accounts go with it. Plaid revokes the whole Item, so a
      // user disconnecting "their checking account" also loses the savings
      // account beside it — they should learn that before, not after.
      accountCount > 1
        ? `Disconnecting ${label} removes all ${accountCount} of its accounts from Fynvita and revokes our access at your bank.`
        : `Disconnecting ${label} removes its account from Fynvita and revokes our access at your bank.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnect(connection.id),
        },
      ],
    );
  };

  const disconnect = async (connectionId: string) => {
    setBusyId(connectionId);
    const res = await bankConnectionApi.disconnect(connectionId);
    setBusyId(null);

    if (!res.success) {
      // The route answers 502 with "nothing was changed" when the provider
      // refuses. Nothing is removed from the list — the bank really is still
      // connected, and showing it gone would be the original lie again.
      Alert.alert(
        "Could not disconnect",
        res.error?.message ??
          "The bank could not be disconnected right now. Nothing was changed — please try again.",
      );
      return;
    }

    await load();
  };

  const toggleBureau = async (bureau: BureauConnection) => {
    setBusyId(bureau.bureau);
    const res = bureau.connected
      ? await creditMonitoringApi.disconnectBureau(bureau.bureau)
      : await creditMonitoringApi.connectBureau(bureau.bureau);
    setBusyId(null);

    if (!res.success) {
      Alert.alert(
        bureau.connected ? "Could not disconnect" : "Could not connect",
        res.error?.message ?? "Please try again.",
      );
      return;
    }

    await load();
  };

  const renderBureau = (bureau: BureauConnection) => {
    const color = bureau.connected ? CONNECTED_COLOR : DISCONNECTED_COLOR;
    const lastPull = relativeTime(bureau.last_pull_date);

    return (
      <Card key={bureau.bureau} style={styles.accountCard}>
        <View style={styles.accountRow}>
          <View style={[styles.accountIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name="shield-checkmark" size={22} color={color} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>
              {BUREAU_LABELS[bureau.bureau]}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>
                {bureau.connected ? "Connected" : "Not connected"}
              </Text>
              {/* Only shown when there has actually been a pull. */}
              {lastPull ? (
                <Text style={styles.syncText}>• Last pull {lastPull}</Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.accountActions}>
          <TouchableOpacity
            style={bureau.connected ? styles.disconnectButton : styles.linkButton}
            disabled={busyId === bureau.bureau}
            onPress={() => toggleBureau(bureau)}
          >
            <Text
              style={
                bureau.connected ? styles.disconnectText : styles.linkButtonText
              }
            >
              {busyId === bureau.bureau
                ? "Working…"
                : bureau.connected
                  ? "Disconnect"
                  : "Connect"}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderConnection = (connection: BankConnection) => {
    const needsAttention = connection.status === "needs_attention";
    const color = needsAttention ? ATTENTION_COLOR : CONNECTED_COLOR;
    const synced = relativeTime(lastSyncedAt(connection));

    return (
      <Card key={connection.id} style={styles.accountCard}>
        <View style={styles.accountRow}>
          <View style={[styles.accountIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name="business" size={22} color={color} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>
              {/* Null when Plaid could not name the institution. Saying so
                  beats picking a bank. */}
              {connection.institutionName ?? "Bank connection"}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>
                {needsAttention ? "Needs attention" : "Connected"}
              </Text>
              {synced ? (
                <Text style={styles.syncText}>• Synced {synced}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {needsAttention ? (
          <Text style={styles.attentionText}>{attentionReason(connection)}</Text>
        ) : null}

        {connection.accounts.length === 0 ? (
          <Text style={styles.emptyAccountsText}>
            No accounts have synced from this bank yet.
          </Text>
        ) : (
          connection.accounts.map((account) => (
            <View key={account.id} style={styles.subAccountRow}>
              <Text style={styles.subAccountName} numberOfLines={1}>
                {account.accountName}
                {account.mask ? ` ••••${account.mask}` : ""}
              </Text>
              <Text style={styles.subAccountBalance}>
                {currency(account.currentBalance, account.currency)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.accountActions}>
          <TouchableOpacity
            style={styles.disconnectButton}
            disabled={busyId === connection.id}
            onPress={() => confirmDisconnect(connection)}
          >
            <Text style={styles.disconnectText}>
              {busyId === connection.id ? "Disconnecting…" : "Disconnect"}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Connected Accounts</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <Card>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.emptyText}>Loading your connections…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Credit Bureaus</Text>
            {bureaus.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>
                  We could not load your bureau connections.
                </Text>
              </Card>
            ) : (
              bureaus.map(renderBureau)
            )}

            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            {connections.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>
                  You have not linked a bank yet.
                </Text>
              </Card>
            ) : (
              connections.map(renderConnection)
            )}

            {/* The onboarding screen tells users they can "skip and link it
                later from Settings" — this is that Settings, and the button
                here used to do nothing at all. It now opens the same Plaid
                hosted-link flow onboarding uses. Rendered only for a signed-in
                user: /financial/plaid/hosted-link requires a userId matching
                the caller's token. */}
            {isLinking && user?.id ? (
              <PlaidHostedLink
                userId={user.id}
                onSuccess={() => {
                  setIsLinking(false);
                  load();
                }}
                onExit={(linkError) => {
                  setIsLinking(false);
                  if (linkError) {
                    Alert.alert(
                      "Could not link your bank",
                      "Nothing was connected. You can try again.",
                    );
                  }
                }}
              />
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                disabled={!user?.id}
                onPress={() => setIsLinking(true)}
              >
                <Ionicons name="add" size={20} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>Link Bank Account</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: "row", alignItems: "flex-start" },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: "500" },
  syncText: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },
  attentionText: {
    fontSize: 12,
    color: ATTENTION_COLOR,
    marginTop: theme.spacing.sm,
  },
  subAccountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  subAccountName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  subAccountBalance: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  emptyAccountsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  accountActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  disconnectButton: { paddingHorizontal: 12, paddingVertical: 6 },
  disconnectText: { fontSize: 12, fontWeight: "500", color: "#EF4444" },
  linkButton: { paddingHorizontal: 12, paddingVertical: 6 },
  linkButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 8,
  },
});
