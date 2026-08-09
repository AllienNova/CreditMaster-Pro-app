/**
 * Fynvita Credit Age Screen
 *
 * Real-data wiring (M2-1): renders the user's real credit accounts (tradelines)
 * from GET /api/credit-repair/accounts (withAuth) via creditRepairApi.getAccounts,
 * adapted web -> mobile by mapWebAccount. Fetch on mount with honest inline
 * loading / error / empty states and a retry. The former hardcoded MOCK_ACCOUNTS
 * array and the local Account interface were removed. Average age, oldest, and
 * newest are computed only over accounts whose age is KNOWN — an account with an
 * unknown opened_date (null ageMonths) is rendered "age unknown" and never counted
 * as 0 months, which would fabricate a brand-new account and skew the average.
 * Nothing is fabricated: null balances/limits stay null, and no dates are invented.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type { CreditAccount } from "../../src/services/api/creditRepair";

const getAgeColor = (years: number) => {
  if (years >= 7) return "#22C55E";
  if (years >= 3) return "#84CC16";
  if (years >= 1) return "#F59E0B";
  return "#EF4444";
};

export default function CreditAgeScreen() {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await creditRepairApi.getAccounts();
    if (res.success && res.data) {
      setAccounts(res.data.accounts);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load your accounts.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Age math runs only over accounts with a KNOWN age. An account whose
  // opened_date is unknown (ageMonths null) contributes nothing — counting it as
  // 0 months would fabricate a brand-new account and drag the average down.
  const knownMonths = accounts
    .map((a) => a.ageMonths)
    .filter((m): m is number => m !== null);
  const hasAges = knownMonths.length > 0;
  const avgMonths = hasAges
    ? Math.round(knownMonths.reduce((sum, m) => sum + m, 0) / knownMonths.length)
    : null;
  const avgYears = avgMonths !== null ? Math.floor(avgMonths / 12) : null;
  const avgRemMonths = avgMonths !== null ? avgMonths % 12 : null;
  const oldestMonths = hasAges ? Math.max(...knownMonths) : null;
  const newestMonths = hasAges ? Math.min(...knownMonths) : null;

  if (loading && accounts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="age-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="age-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Age</Text>
          <View style={{ width: 24 }} />
        </View>

        {accounts.length === 0 ? (
          <View style={styles.emptyCard} testID="age-empty">
            <Ionicons
              name="time-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyText}>
              Once your credit accounts are imported, you can track your credit
              age and account history here.
            </Text>
          </View>
        ) : (
          <>
            {/* Average Age Card */}
            <Card style={styles.avgCard}>
              <View style={styles.avgCircle}>
                <Text
                  style={[styles.avgValue, { color: getAgeColor(avgYears ?? 0) }]}
                >
                  {avgYears !== null
                    ? `${avgYears}y ${avgRemMonths}m`
                    : "Age unknown"}
                </Text>
                <Text style={styles.avgLabel}>Average Age</Text>
              </View>
              <View style={styles.ageBar}>
                <View
                  style={[
                    styles.ageFill,
                    {
                      width: `${Math.min(((avgYears ?? 0) / 10) * 100, 100)}%`,
                      backgroundColor: getAgeColor(avgYears ?? 0),
                    },
                  ]}
                />
              </View>
              <View style={styles.ageLegend}>
                <Text style={styles.legendText}>0 years</Text>
                <Text style={styles.legendIdeal}>7+ years ideal</Text>
                <Text style={styles.legendText}>10+ years</Text>
              </View>
            </Card>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Ionicons name="time" size={24} color="#22C55E" />
                <Text style={styles.statValue}>
                  {oldestMonths !== null
                    ? `${Math.floor(oldestMonths / 12)}y`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Oldest Account</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="add-circle" size={24} color="#F59E0B" />
                <Text style={styles.statValue}>
                  {newestMonths !== null
                    ? `${Math.floor(newestMonths / 12)}y`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Newest Account</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="layers" size={24} color="#3B82F6" />
                <Text style={styles.statValue}>{accounts.length}</Text>
                <Text style={styles.statLabel}>Accounts</Text>
              </Card>
            </View>

            {/* Impact Info */}
            <Card style={styles.impactCard}>
              <Ionicons
                name="information-circle"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.impactText}>
                Credit age accounts for 15% of your score. Longer history = better
                score.
              </Text>
            </Card>

            {/* Accounts List */}
            <Text style={styles.sectionTitle}>Your Accounts</Text>
            {accounts.map((account) => {
              const { ageMonths, ageYears } = account;
              const ageColor =
                ageYears !== null
                  ? getAgeColor(ageYears)
                  : theme.colors.textSecondary;
              const ageLabel =
                ageMonths !== null && ageYears !== null
                  ? `${ageYears}y ${ageMonths % 12}m`
                  : "Age unknown";
              const iconName = account.type.toLowerCase().includes("card")
                ? "card"
                : "document-text";
              return (
                <Card key={account.id} style={styles.accountCard}>
                  <View style={styles.accountRow}>
                    <View
                      style={[
                        styles.accountIcon,
                        { backgroundColor: `${ageColor}20` },
                      ]}
                    >
                      <Ionicons name={iconName} size={20} color={ageColor} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>
                        {account.name || "Account"}
                      </Text>
                      <Text style={styles.accountType}>
                        {(account.type || "Account") +
                          (account.openDate
                            ? ` • Opened ${new Date(
                                account.openDate,
                              ).toLocaleDateString()}`
                            : "")}
                      </Text>
                    </View>
                    <View style={styles.accountRight}>
                      <Text style={[styles.accountAge, { color: ageColor }]}>
                        {ageLabel}
                      </Text>
                      {account.status ? (
                        <Text style={styles.statusBadge}>{account.status}</Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to Improve Credit Age</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Keep your oldest accounts open</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Avoid opening many new accounts at once
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Become an authorized user on old accounts
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Use old cards occasionally to keep them active
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  avgCard: { alignItems: "center", marginBottom: theme.spacing.md },
  avgCircle: { alignItems: "center", marginBottom: theme.spacing.md },
  avgValue: { fontSize: 40, fontWeight: "700" },
  avgLabel: { fontSize: 14, color: theme.colors.textSecondary },
  ageBar: {
    width: "100%",
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
  },
  ageFill: { height: "100%", borderRadius: 6 },
  ageLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  legendIdeal: { fontSize: 12, color: "#22C55E", fontWeight: "500" },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    backgroundColor: `${theme.colors.primary}10`,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  accountType: { fontSize: 12, color: theme.colors.textSecondary },
  accountRight: { alignItems: "flex-end" },
  accountAge: { fontSize: 16, fontWeight: "600" },
  statusBadge: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});
