/**
 * Fynvita Credit Report Detail Screen
 *
 * Real-data wiring (M1-2 / FR-202): reads the report id from the route and
 * fetches the user's real credit report from GET /api/credit-repair/reports/[id]
 * (withAuth) via creditRepairApi.getReport, adapted web -> mobile by
 * mapWebCreditReport. Fetch on mount with honest inline loading / error / empty
 * states and a retry; pull-to-refresh re-fetches. The former hardcoded `report`
 * object (bureau/score/date plus fabricated accounts / negativeItems / inquiries)
 * and the setTimeout no-op refresh were removed.
 *
 * Radical honesty: only the report's real header fields render — bureau, score,
 * and report date. The four structured sections (accounts, negative items,
 * inquiries, public records) are NOT yet populated by the report POST (that is a
 * later slice, M2-4), so each section shows an honest empty-state driven by a real
 * count rather than fabricated rows. Nothing falls back to the old mock.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type {
  CreditReportDetail,
  ReportBureau,
} from "../../src/services/api/creditRepair";

const BUREAU_COLORS: Record<ReportBureau, string> = {
  experian: "#0066CC",
  equifax: "#CC0000",
  transunion: "#00AA00",
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// Prefer the calendar date embedded in the ISO string so a UTC-midnight report
// date is not shifted to the previous day in negative-offset timezones; fall back
// to a parsed date, and to "" when the value is unusable (the screen then hides
// the date line rather than showing an invented one).
function formatReportDate(iso: string): string {
  if (!iso) return "";
  const datePart = iso.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// A structured report section. Today every section's count is 0 (the report POST
// does not yet populate accounts / inquiries / collections / public records —
// M2-4), so each renders its honest empty-state. When a count is > 0 the badge
// reflects the real number; per-item rows are added by the slice that populates
// the data.
function ReportSection({
  title,
  icon,
  count,
  emptyText,
  emptyTestID,
}: {
  title: string;
  icon: IoniconName;
  count: number;
  emptyText: string;
  emptyTestID: string;
}) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </View>
      {count === 0 ? (
        <View style={styles.sectionEmpty} testID={emptyTestID}>
          <Text style={styles.sectionEmptyText}>{emptyText}</Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<CreditReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!id) {
      setReport(null);
      setError("This credit report could not be found.");
      return;
    }
    const res = await creditRepairApi.getReport(id);
    if (res.success && res.data) {
      setReport(res.data.report);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load this credit report.");
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchReport();
    } finally {
      setLoading(false);
    }
  }, [fetchReport]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  }, [fetchReport]);

  if (loading && !report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="report-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading credit report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="report-error">
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

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="report-empty">
          <Ionicons
            name="document-text-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>
            This credit report is unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const reportDate = formatReportDate(report.reportDate);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Report</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Score card — real bureau / score / date */}
        <Card
          style={[
            styles.scoreCard,
            report.bureau
              ? {
                  borderLeftWidth: 4,
                  borderLeftColor: BUREAU_COLORS[report.bureau],
                }
              : null,
          ]}
        >
          <Text style={styles.bureauName}>
            {report.bureau ? capitalize(report.bureau) : "Unknown bureau"}
          </Text>
          <Text style={styles.scoreValue}>
            {report.score !== undefined ? report.score : "—"}
          </Text>
          <Text style={styles.scoreLabel}>
            {report.score !== undefined ? "Credit Score" : "Score unavailable"}
          </Text>
          {reportDate ? (
            <Text style={styles.reportDate}>Report Date: {reportDate}</Text>
          ) : null}
        </Card>

        {/* Structured sections — each empty-states independently when its count is
            0 (always today; the report POST does not yet populate them — M2-4). */}
        <ReportSection
          title="Accounts"
          icon="card-outline"
          count={report.accountsCount}
          emptyText="No accounts reported."
          emptyTestID="report-accounts-empty"
        />
        <ReportSection
          title="Negative Items"
          icon="warning-outline"
          count={report.negativeItemsCount}
          emptyText="No negative items reported."
          emptyTestID="report-negative-empty"
        />
        <ReportSection
          title="Inquiries"
          icon="search-outline"
          count={report.inquiriesCount}
          emptyText="No inquiries reported."
          emptyTestID="report-inquiries-empty"
        />
        <ReportSection
          title="Public Records"
          icon="document-text-outline"
          count={report.publicRecordsCount}
          emptyText="No public records reported."
          emptyTestID="report-public-records-empty"
        />

        {/* Actions (navigation only — independent of report data) */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/reports/comparison")}
          >
            <Ionicons name="git-compare-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Compare Bureaus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => router.push("/dispute/create")}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Start Dispute
            </Text>
          </TouchableOpacity>
        </View>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  scoreCard: { alignItems: "center", marginBottom: theme.spacing.md },
  bureauName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "700",
    color: theme.colors.text,
    marginVertical: 8,
  },
  scoreLabel: { fontSize: 14, color: theme.colors.textSecondary },
  reportDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  section: { marginBottom: theme.spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  sectionEmpty: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actions: { marginTop: theme.spacing.md, gap: theme.spacing.sm },
  actionButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: { color: theme.colors.primary },
});
