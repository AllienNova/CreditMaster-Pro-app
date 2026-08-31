/**
 * Fynvita Credit Utilization Screen
 *
 * Real-data wiring (M1-1 / FR-201): renders the user's real credit cards from
 * GET /api/credit-repair/cards (withAuth) via creditRepairApi.getCards, adapted
 * web -> mobile by mapWebCard. Fetch on mount with honest inline
 * loading / error / empty states and a retry. The former hardcoded MOCK_CARDS
 * array and the local CreditCard interface were removed; overall utilization,
 * totals, and the pay-down recommendation are computed from the real cards.
 * Nothing is fabricated — a card missing a required numeric is dropped by the
 * adapter rather than shown as $0 / 0%.
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
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type { CreditCard } from "../../src/services/api/creditRepair";
import { toArray } from "../../src/store/toArray";

const getUtilizationColor = (util: number) => {
  if (util <= 10) return "#22C55E";
  if (util <= 30) return "#84CC16";
  if (util <= 50) return "#F59E0B";
  if (util <= 75) return "#F97316";
  return "#EF4444";
};

const getUtilizationLabel = (util: number) => {
  if (util <= 10) return "Excellent";
  if (util <= 30) return "Good";
  if (util <= 50) return "Fair";
  if (util <= 75) return "Poor";
  return "Very Poor";
};

export default function UtilizationScreen() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      const res = await creditRepairApi.getCards();
      if (res.success && res.data) {
        setCards(toArray<CreditCard>(res?.data?.cards));
        setError(null);
      } else {
        setError(res.error?.message ?? "Unable to load your credit cards.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Totals computed from the real, displayed cards. The totalLimit guard keeps a
  // zero-limit set at 0% rather than NaN.
  const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);
  const totalLimit = cards.reduce((sum, c) => sum + c.limit, 0);
  const overallUtilization =
    totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

  const idealBalance = Math.round(totalLimit * 0.1);
  const amountToPayOff = Math.max(0, totalBalance - idealBalance);

  if (loading && cards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="utilization-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading credit cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && cards.length === 0) {
    return (
      <ScreenError
        title="Credit Utilization"
        message={error}
        onRetry={load}
        testID="utilization-error"
      />
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
          <Text style={styles.title}>Credit Utilization</Text>
          <View style={{ width: 24 }} />
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyCard} testID="utilization-empty">
            <Ionicons
              name="card-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No credit cards yet</Text>
            <Text style={styles.emptyText}>
              Add a credit card to track your utilization and get pay-down
              recommendations.
            </Text>
          </View>
        ) : (
          <>
            {/* Overall Utilization Card */}
            <Card style={styles.overallCard}>
              <View style={styles.utilizationCircle}>
                <Text
                  style={[
                    styles.utilizationPercent,
                    { color: getUtilizationColor(overallUtilization) },
                  ]}
                >
                  {overallUtilization}%
                </Text>
                <Text style={styles.utilizationLabel}>
                  {getUtilizationLabel(overallUtilization)}
                </Text>
              </View>
              <View style={styles.utilizationBar}>
                <View
                  style={[
                    styles.utilizationFill,
                    {
                      width: `${Math.min(overallUtilization, 100)}%`,
                      backgroundColor: getUtilizationColor(overallUtilization),
                    },
                  ]}
                />
                <View style={styles.idealMarker} />
              </View>
              <View style={styles.utilizationLegend}>
                <Text style={styles.legendText}>0%</Text>
                <Text style={styles.legendIdeal}>10% ideal</Text>
                <Text style={styles.legendText}>100%</Text>
              </View>
            </Card>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total Balance</Text>
                <Text style={styles.statValue}>
                  ${totalBalance.toLocaleString()}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total Limit</Text>
                <Text style={styles.statValue}>
                  ${totalLimit.toLocaleString()}
                </Text>
              </Card>
            </View>

            {/* Recommendation */}
            {amountToPayOff > 0 && (
              <Card style={styles.recommendationCard}>
                <View style={styles.recommendationIcon}>
                  <Ionicons name="bulb" size={24} color="#F59E0B" />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>
                    Pay off ${amountToPayOff.toLocaleString()}
                  </Text>
                  <Text style={styles.recommendationText}>
                    To reach the ideal 10% utilization, pay down your balances by
                    ${amountToPayOff.toLocaleString()}
                  </Text>
                </View>
              </Card>
            )}

            {/* Cards List */}
            <Text style={styles.sectionTitle}>Your Credit Cards</Text>
            {cards.map((card) => (
              <Card key={card.id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Ionicons
                      name="card"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardBalance}>
                      ${card.balance.toLocaleString()} / $
                      {card.limit.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.utilizationBadge,
                      {
                        backgroundColor: `${getUtilizationColor(card.utilization)}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.utilizationBadgeText,
                        { color: getUtilizationColor(card.utilization) },
                      ]}
                    >
                      {card.utilization}%
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBar}>
                  <View
                    style={[
                      styles.cardBarFill,
                      {
                        width: `${Math.min(card.utilization, 100)}%`,
                        backgroundColor: getUtilizationColor(card.utilization),
                      },
                    ]}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to Lower Utilization</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Pay balances before statement closes
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Request credit limit increases</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Spread spending across multiple cards
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Keep old cards open (even if unused)
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
  overallCard: { alignItems: "center", marginBottom: theme.spacing.md },
  utilizationCircle: { alignItems: "center", marginBottom: theme.spacing.md },
  utilizationPercent: { fontSize: 48, fontWeight: "700" },
  utilizationLabel: { fontSize: 16, color: theme.colors.textSecondary },
  utilizationBar: {
    width: "100%",
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    position: "relative",
  },
  utilizationFill: { height: "100%", borderRadius: 6 },
  idealMarker: {
    position: "absolute",
    left: "10%",
    top: -4,
    width: 2,
    height: 20,
    backgroundColor: "#22C55E",
  },
  utilizationLegend: {
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
  statCard: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
    backgroundColor: "#FEF3C720",
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  recommendationContent: { flex: 1 },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  recommendationText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  cardItem: { marginBottom: theme.spacing.sm },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  cardBalance: { fontSize: 13, color: theme.colors.textSecondary },
  utilizationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  utilizationBadgeText: { fontSize: 13, fontWeight: "600" },
  cardBar: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3 },
  cardBarFill: { height: "100%", borderRadius: 3 },
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
