/**
 * Fynvita Income Screen
 * Income sources, trends, and tax estimates
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { incomeApi } from "../../src/services/api/financial";
import type { IncomeSourceSummary } from "../../src/services/api/financial";

/*
 * The local `IncomeSource` interface lived here. It declared `type` and
 * `taxWithheld` as required — two fields the server has never sent — which is
 * how the invented withholding passed a typecheck. The screen now uses
 * IncomeSourceSummary from the adapter, which mirrors what the route returns.
 */

/*
 * INCOME_SOURCES and INCOME_HISTORY lived here.
 *
 * INCOME_SOURCES invented the user's earnings (Primary Job 4800/month) AND a
 * `taxWithheld` figure per source. INCOME_HISTORY invented six months of gross
 * and net (Jul 6800/5200 through Dec 6950/5300).
 *
 * WHAT THE SERVER ACTUALLY HAS. GET /api/financial/income returns
 * `{ sources, stats }`. An IncomeSource is
 * `{ id, name, amount, frequency, nextPayDate, category, isAutoDetected }`
 * (src/lib/financial/income-tracking-service.ts:16-29) — there is NO
 * taxWithheld field, and nothing anywhere stores a monthly income history.
 *
 * So gross income is real. Tax withheld, net income, the effective tax rate
 * and the six-month trend have no source at all, and every one of them was
 * derived from the invented number. They are gone rather than estimated: a
 * withholding figure the user did not give us is a claim about their payslip.
 */



/**
 * `category` is optional on the server and free-form, so these lookups take a
 * plain string and fall back. Casting an arbitrary category into a closed
 * union would only move the failure to runtime, where it renders `undefined`
 * as an icon name.
 */
const getSourceIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    salary: "briefcase",
    freelance: "laptop",
    investment: "trending-up",
    rental: "home",
    other: "cash",
  };
  return icons[type];
};

const getSourceColor = (type: string): string => {
  const colors: Record<string, string> = {
    salary: "#22C55E",
    freelance: "#3B82F6",
    investment: "#8B5CF6",
    rental: "#F59E0B",
    other: "#6B7280",
  };
  return colors[type];
};

const getFrequencyLabel = (freq: string): string => {
  const labels: Record<string, string> = {
    weekly: "/week",
    biweekly: "/2 weeks",
    monthly: "/month",
    annual: "/year",
  };
  return labels[freq];
};

export default function IncomeScreen() {
  const [sources, setSources] = useState<IncomeSourceSummary[]>([]);
  const [totalMonthlyGross, setTotalMonthlyGross] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await incomeApi.get();
    if (!res.success || !res.data) {
      setError("We could not load your income.");
      setLoading(false);
      return;
    }
    setSources(res.data.sources ?? []);
    // The server's own total, not a re-sum here: sources have different
    // frequencies, and getMonthlyIncomeStats already normalises them.
    setTotalMonthlyGross(res.data.stats?.totalMonthlyIncome ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <Text style={styles.title}>Income</Text>
          <TouchableOpacity>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* Summary Card — gross only. Taxes, net and the effective rate were
            all derived from an invented per-source `taxWithheld`, which the
            server does not have. */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly gross</Text>
              <Text style={styles.summaryValue}>
                ${totalMonthlyGross.toLocaleString()}
              </Text>
            </View>
          </View>
          <Text style={styles.noteText}>
            Take-home pay and withholding are not tracked yet — nothing records
            what your employer withholds, so this is gross income only.
          </Text>
        </Card>

        {/* The period selector and the 6-Month Trend chart lived here.
            Nothing stores a monthly income history — the route returns current
            sources and a computed monthly total, and no table records past
            months — so both were drawing INCOME_HISTORY, six invented pairs of
            gross and net. */}
        <Card style={styles.summaryCard}>
          <Text style={styles.chartTitle}>Income over time</Text>
          <Text style={styles.noteText}>
            Not tracked yet. Your income sources are recorded, but no history of
            what you actually received each month is stored, so there is no
            trend to chart.
          </Text>
        </Card>


        {/* Income Sources */}
        <Text style={styles.sectionTitle}>Income Sources</Text>
        {sources.length === 0 ? (
          <Card style={styles.sourceCard}>
            <Text style={styles.stateText}>
              No income sources recorded yet.
            </Text>
          </Card>
        ) : null}
        {sources.map((source) => {
          // `category` is optional on the server and often absent, so the
          // colour and icon fall back rather than asserting a type the record
          // does not carry.
          const color = getSourceColor(source.category ?? "other");
          const percent =
            totalMonthlyGross > 0
              ? ((source.amount / totalMonthlyGross) * 100).toFixed(0)
              : null;
          return (
            <Card key={source.id} style={styles.sourceCard}>
              <View style={styles.sourceRow}>
                <View
                  style={[styles.sourceIcon, { backgroundColor: `${color}15` }]}
                >
                  <Ionicons
                    name={getSourceIcon(source.category ?? "other")}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceType}>
                    {source.category ?? source.frequency}
                    {percent !== null ? ` • ${percent}% of income` : ""}
                  </Text>
                </View>
                <View style={styles.sourceValues}>
                  <Text style={styles.sourceAmount}>
                    ${source.amount.toLocaleString()}
                    {getFrequencyLabel(source.frequency)}
                  </Text>
                  {/* per-source withholding removed: not a field the server has */}

                </View>
              </View>
            </Card>
          );
        })}

        {/* The "Annual Tax Estimate" card lived here: estimated annual
            income, estimated federal tax and estimated take-home. Only the
            first was real — the other two multiplied the invented
            per-source `taxWithheld` by twelve, so an invented withholding
            became an invented annual tax bill. Nothing withholds, computes or
            records tax for this user; /api/tax/* is a separate surface with
            its own findings. */}
        <Card style={styles.taxCard}>
          <View style={styles.taxHeader}>
            <Ionicons
              name="calculator"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.taxTitle}>Annual income</Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Gross, at your current rate</Text>
            <Text style={styles.taxValue}>
              ${(totalMonthlyGross * 12).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.noteText}>
            Twelve times your monthly gross. It is not a tax estimate: nothing
            here knows your withholding, filing status or deductions.
          </Text>
        </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBlock: { paddingVertical: 40, alignItems: "center" },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
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
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  taxRateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  taxRateLabel: { fontSize: 12, color: theme.colors.textSecondary },
  taxRateValue: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  periodSelector: { flexDirection: "row", marginBottom: theme.spacing.lg },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  periodTextActive: { color: "#fff" },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 90,
  },
  chartColumn: { alignItems: "center" },
  barGroup: { flexDirection: "row", alignItems: "flex-end" },
  grossBar: {
    width: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 2,
  },
  netBar: { width: 12, backgroundColor: "#22C55E", borderRadius: 2 },
  chartLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sourceCard: { marginBottom: theme.spacing.sm },
  sourceRow: { flexDirection: "row", alignItems: "center" },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  sourceType: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sourceValues: { alignItems: "flex-end" },
  sourceAmount: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  sourceTax: { fontSize: 10, color: "#EF4444", marginTop: 2 },
  taxCard: { marginTop: theme.spacing.md },
  taxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  taxTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 8,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  taxLabel: { fontSize: 13, color: theme.colors.textSecondary },
  taxValue: { fontSize: 13, color: theme.colors.text },
});
