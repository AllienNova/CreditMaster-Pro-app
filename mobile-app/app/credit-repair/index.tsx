/**
 * Fynvita Credit Repair Hub Screen
 * Central hub for all credit repair tools.
 *
 * Real-data wiring (PARITY-P2): the Quick Stats are derived from real store
 * data — dispute counts from useDisputeStore (fetched via disputeApi.getAll)
 * and the credit score from useCreditStore (fetched via creditScoreApi). The
 * former hardcoded stats ("12" active, "+45" points, "85%" success rate) and
 * the fake setTimeout load were removed. Honest inline loading / error / empty
 * states for the stats; nothing is fabricated. The TOOLS navigation grid is
 * legitimate static navigation and stays static.
 */

import React, { useEffect, useCallback } from "react";
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
import { useDisputeStore } from "../../src/store/disputeStore";
import { useCreditStore } from "../../src/store/creditStore";
import type { Dispute } from "../../src/services/api/types";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const TOOLS: Tool[] = [
  {
    id: "1",
    name: "Dispute Center",
    description: "File and track credit disputes",
    icon: "document-text",
    route: "/credit-repair/disputes",
    color: theme.colors.primary,
  },
  {
    id: "2",
    name: "Credit Building",
    description: "Strategies to build credit",
    icon: "trending-up",
    route: "/credit-repair/building",
    color: theme.colors.success,
  },
  {
    id: "3",
    name: "Credit Cards",
    description: "Card recommendations",
    icon: "card",
    route: "/credit-repair/cards",
    color: theme.colors.secondary,
  },
  {
    id: "4",
    name: "Goodwill Letters",
    description: "Request late payment removal",
    icon: "mail",
    route: "/credit-repair/goodwill",
    color: theme.colors.warning,
  },
  {
    id: "5",
    name: "Inquiry Removal",
    description: "Remove hard inquiries",
    icon: "search",
    route: "/credit-repair/inquiries",
    color: "#9333ea",
  },
  {
    id: "6",
    name: "Debt Negotiation",
    description: "Negotiate with creditors",
    icon: "chatbubbles",
    route: "/credit-repair/negotiate",
    color: "#0891b2",
  },
  {
    id: "7",
    name: "Payment History",
    description: "Track payment patterns",
    icon: "calendar",
    route: "/credit-repair/payments",
    color: "#059669",
  },
];

// "Active" mirrors the Dispute Center (disputes.tsx): a dispute is active while
// still in flight — not resolved, rejected, or deleted. Kept aligned so the hub
// and the disputes list never report conflicting active counts.
const CLOSED_STATUSES: readonly Dispute["status"][] = [
  "resolved",
  "rejected",
  "deleted",
];

function isActive(status: Dispute["status"]): boolean {
  return !CLOSED_STATUSES.includes(status);
}

export default function CreditRepairScreen() {
  const {
    disputes,
    isLoading: disputesLoading,
    error: disputesError,
    fetchDisputes,
  } = useDisputeStore();
  const { currentScore, isLoadingScores, fetchScores } = useCreditStore();

  const load = useCallback(() => {
    fetchDisputes();
    fetchScores();
  }, [fetchDisputes, fetchScores]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = disputes.filter((d) => isActive(d.status)).length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  const hasStatData = disputes.length > 0 || currentScore !== null;
  const statsLoading =
    (disputesLoading || isLoadingScores) && !hasStatData && !disputesError;
  const statsUnavailable = Boolean(disputesError) && disputes.length === 0;

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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Credit Repair</Text>
            <Text style={styles.subtitle}>Tools to improve your credit</Text>
          </View>
        </View>

        {/* Quick Stats — real data from useDisputeStore + useCreditStore */}
        <Card style={styles.statsCard}>
          {statsLoading ? (
            <View style={styles.statsState} testID="credit-repair-hub-loading">
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.statsStateText}>Loading stats...</Text>
            </View>
          ) : statsUnavailable ? (
            <View style={styles.statsState} testID="credit-repair-hub-error">
              <Text style={styles.statsStateText}>{disputesError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={load}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statsRow} testID="credit-repair-hub-stats">
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeCount}</Text>
                <Text style={styles.statLabel}>Active Disputes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text
                  style={[styles.statValue, { color: theme.colors.success }]}
                >
                  {resolvedCount}
                </Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue} testID="credit-repair-hub-score">
                  {currentScore ?? "—"}
                </Text>
                <Text style={styles.statLabel}>Credit Score</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Tools Grid */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionTitle}>Repair Tools</Text>
          <View style={styles.toolsGrid}>
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.toolCard}
                onPress={() => router.push(tool.route as any)}
              >
                <View
                  style={[
                    styles.toolIcon,
                    { backgroundColor: `${tool.color}15` },
                  ]}
                >
                  <Ionicons
                    name={tool.icon as keyof typeof Ionicons.glyphMap}
                    size={28}
                    color={tool.color}
                  />
                </View>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDesc} numberOfLines={2}>
                  {tool.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.tipsTitle}> Pro Tip</Text>
          </View>
          <Text style={styles.tipsText}>
            Start with disputing inaccurate information on your credit report.
            This often has the biggest impact on your score.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  statsState: { alignItems: "center", paddingVertical: theme.spacing.sm },
  statsStateText: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  toolsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  toolCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    margin: "1%",
    marginBottom: 8,
  },
  toolIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  toolName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  toolDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  tipsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tipsTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.warning },
  tipsText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
});
