import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme, getScoreColor } from "../../src/constants/theme";
import { useCreditStore } from "../../src/store/creditStore";

/*
 * BUREAUS, COMPARISON_DATA and COMPARISON_ROWS lived here.
 *
 * BUREAUS invented all three scores and their movements (Experian 695 +12,
 * Equifax 682 -5, TransUnion 688 +8). COMPARISON_DATA invented nine metrics
 * across all three bureaus — account counts, negative items, hard inquiries,
 * collections, utilization, oldest account, average age — 27 numbers in total,
 * none of them measured.
 *
 * THE SCORES ARE REAL and come from GET /credit-monitoring/scores, which
 * returns one CreditScore per bureau.
 *
 * THE NINE-METRIC TABLE HAS NO CONTRACT TO READ. Those figures live inside
 * `credit_reports.reportData`, typed `Record<string, unknown>`
 * (src/lib/credit-repair/db-legacy.ts:27) — an untyped JSONB blob whose shape
 * depends on whichever importer wrote it. Building a bureau-by-bureau
 * comparison on it would mean inventing a parse contract and presenting the
 * result as measurement, which is how the fixture got here. So the table says
 * what is missing instead.
 */



/** Brand colours, keyed by the bureau ids the scores route returns. */
const BUREAU_COLOR: Record<string, string> = {
  experian: "#0066CC",
  equifax: "#CC0000",
  transunion: "#00AA00",
};

const BUREAU_NAME: Record<string, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

export default function ComparisonScreen() {
  const router = useRouter();
  const { scores, isLoadingScores, scoreError, fetchScores } = useCreditStore();

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  /*
   * `selectedMetric` and `getValueColor` lived here. Both existed only to
   * highlight and colour rows of the comparison table, which is gone — the
   * metrics behind it have no contract to read.
   */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bureau Comparison</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {isLoadingScores ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
          </View>
        ) : null}

        {scoreError ? (
          <View style={styles.stateBlock}>
            <Text style={styles.emptyText}>
              We could not load your bureau scores.
            </Text>
            <TouchableOpacity onPress={fetchScores}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoadingScores && !scoreError && scores.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.emptyText}>
              No bureau has reported a score yet.
            </Text>
          </View>
        ) : null}

        {/* Score Cards */}
        <View style={styles.scoreCards}>
          {scores.map((s) => (
            <View
              key={s.bureau}
              style={[
                styles.scoreCard,
                { borderTopColor: BUREAU_COLOR[s.bureau] ?? "#888" },
              ]}
            >
              <Text
                style={[
                  styles.bureauName,
                  { color: BUREAU_COLOR[s.bureau] ?? "#888" },
                ]}
              >
                {BUREAU_NAME[s.bureau] ?? s.bureau}
              </Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(s.score) },
                ]}
              >
                {s.score}
              </Text>
              {/* A "+12 pts" movement arrow lived here. CreditScore carries no
                  delta — the fixture invented one per bureau. A change needs
                  two readings, and the history route is per-bureau. */}
            </View>
          ))}
        </View>

        {/* A nine-row bureau-by-bureau comparison table lived here —
            account counts, negative items, hard inquiries, collections,
            utilization, oldest account, average age. Twenty-seven numbers, all
            invented. Those figures live inside credit_reports.reportData,
            typed Record<string, unknown>, so there is no contract to read them
            from; building the table would mean inventing a parse and
            presenting the result as measurement. */}
        <View style={styles.tableContainer}>
          <Text style={styles.emptyText}>
            A side-by-side comparison of accounts, inquiries and utilization
            needs your reports parsed per bureau. That is not available yet —
            only the scores above are.
          </Text>
        </View>

        {/* Discrepancy Alert */}
        <View style={styles.alertCard}>
          <Ionicons name="alert-circle" size={24} color="#FF9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Discrepancy Found</Text>
            <Text style={styles.alertText}>
              Equifax shows 3 negative items while others show 2. This may be
              worth investigating.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="download-outline"
              size={20}
              color={lightTheme.colors.primary}
            />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
              Start Dispute
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stateBlock: { paddingVertical: 32, alignItems: "center" },
  emptyText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    padding: 16,
    lineHeight: 20,
  },
  retryText: {
    fontSize: 14,
    color: lightTheme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  content: { flex: 1, padding: 16 },
  scoreCards: { flexDirection: "row", gap: 12, marginBottom: 24 },
  scoreCard: {
    flex: 1,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderTopWidth: 4,
  },
  bureauName: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: "700" },
  changeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  changeText: { fontSize: 12, fontWeight: "500", marginLeft: 2 },
  tableContainer: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: lightTheme.colors.background,
    padding: 12,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: lightTheme.colors.textSecondary,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  tableRowSelected: { backgroundColor: lightTheme.colors.primary + "10" },
  labelCell: { flex: 2, flexDirection: "row", alignItems: "center", gap: 8 },
  valueCell: { flex: 1, alignItems: "center" },
  bureauDot: { width: 12, height: 12, borderRadius: 6 },
  rowLabel: { fontSize: 14, color: lightTheme.colors.text },
  rowValue: { fontSize: 14, fontWeight: "600" },
  highlightValue: { fontWeight: "700" },
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  alertContent: { flex: 1, marginLeft: 12 },
  alertTitle: { fontSize: 16, fontWeight: "600", color: "#E65100" },
  alertText: { fontSize: 14, color: "#E65100", marginTop: 4, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.surface,
    gap: 8,
  },
  actionButtonPrimary: { backgroundColor: lightTheme.colors.primary },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTheme.colors.primary,
  },
});
