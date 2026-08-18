/**
 * Fynvita Personalized Recommendations Dashboard
 * AI-generated recommendations with priority ranking and impact estimation
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
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { creditBuilderRecommendationsApi } from "../../src/services/api/credit";
import type { CreditBuilderAction } from "../../src/services/api/credit";

/*
 * A local `Recommendation` interface and an AI_RECOMMENDATIONS array lived
 * here.
 *
 * The interface SHADOWED the shared `Recommendation` in
 * src/services/api/types.ts with different fields — it had `category`,
 * `impact`, `timeframe`, `action` and `route`; the shared one has `userId`,
 * `type`, `potentialImpact`, `actionUrl`, `expiresAt` and `dismissed`. That
 * mismatch is exactly what audit:shadow-types now catches, and it is why an
 * invented list typechecked: the local type described the fixture, so nothing
 * could compare this screen to a route.
 *
 * The real source is GET /api/credit-builder/recommendations, which derives
 * actions from the caller's own credit-builder score. It is NOT AI generated —
 * every action carries `aiGenerated: false`, and the service used to make a
 * billable AI call and throw the response away.
 */



/*
 * A fixed CATEGORIES list lived here — credit / debt / savings / protection.
 * The service's categories are payment / utilization / age / mix / inquiry, so
 * every one of those chips filtered the list to nothing. They are derived from
 * the caller's own actions now.
 */

export default function RecommendationsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [recs, setRecs] = useState<CreditBuilderAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await creditBuilderRecommendationsApi.getAll();
    if (!res.success || !res.data) {
      setError("We could not load your recommendations.");
      setLoading(false);
      return;
    }
    setRecs(res.data.recommendations ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Chips from the caller's OWN action categories. The fixed list was
   * credit/debt/savings/protection; the service's categories are
   * payment/utilization/age/mix/inquiry, so every chip filtered to nothing.
   */
  const categories = ["all", ...new Set(recs.map((r) => r.category))];

  const filteredRecs =
    selectedCategory === "all"
      ? recs
      : recs.filter((r) => r.category === selectedCategory);

  const highPriority = recs.filter((r) => r.impact === "high");
  // `pointsImpact` is the estimated points increase. The old screen summed a
  // field it called `impact`, which on the real payload is a low/medium/high
  // band, not a number.
  const totalImpact = highPriority.reduce((sum, r) => sum + r.pointsImpact, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "credit":
        return "trending-up";
      case "debt":
        return "card";
      case "savings":
        return "wallet";
      case "protection":
        return "shield";
      default:
        return "bulb";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ScreenHeader
          title="For You"
          right={
            <TouchableOpacity style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* AI Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.summaryContent}>
              {/* Not "AI Analysis Complete": these come from the caller's own
                  credit-builder score, and every action carries
                  aiGenerated: false. */}
              <Text style={styles.summaryTitle}>Based on your credit profile</Text>
              <Text style={styles.summaryText}>
                Based on your credit profile, we found{" "}
                {recs.length} personalized recommendations
              </Text>
            </View>
          </View>
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <Text style={styles.impactValue}>+{totalImpact}</Text>
              <Text style={styles.impactLabel}>Potential Score Impact</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactValue}>
                {highPriority.length}
              </Text>
              <Text style={styles.impactLabel}>High Priority</Text>
            </View>
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              testID={`category-chip-${cat}`}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              {/* No per-category icon: the fixed list carried one, the
                  server's categories do not. The label is the category. */}
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === cat && styles.categoryLabelActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recommendations List */}
        {loading ? (
          <View style={styles.stateBlock} testID="recs-loading">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && recs.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>
              No recommendations yet. They are derived from your credit-builder
              score, so link an account to get started.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          {filteredRecs.length} Recommendations
        </Text>
        {/* Rendered as a View, not a TouchableOpacity: the payload has no
            route or actionUrl to navigate to. The fixture invented one per
            item, so every card looked tappable and none of the targets were
            real. */}
        {filteredRecs.map((rec) => (
          <View key={rec.id}>
            <Card style={styles.recCard}>
              <View style={styles.recHeader}>
                <View
                  style={[
                    styles.recIcon,
                    { backgroundColor: `${getPriorityColor(rec.impact)}15` },
                  ]}
                >
                  <Ionicons
                    name={
                      getCategoryIcon(
                        rec.category,
                      ) as keyof typeof Ionicons.glyphMap
                    }
                    size={20}
                    color={getPriorityColor(rec.impact)}
                  />
                </View>
                <View style={styles.recContent}>
                  <View style={styles.recTitleRow}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: `${getPriorityColor(rec.impact)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(rec.impact) },
                        ]}
                      >
                        {rec.impact.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recDescription}>{rec.description}</Text>
                </View>
              </View>
              <View style={styles.recFooter}>
                <View style={styles.recStats}>
                  {/* `pointsImpact` is the estimated points increase.
                      `impact` is a low/medium/high band and was being
                      rendered as "+high pts" against a real payload. */}
                  {rec.pointsImpact > 0 && (
                    <View style={styles.recStat}>
                      <Ionicons name="trending-up" size={14} color="#22C55E" />
                      <Text style={styles.recStatText}>
                        +{rec.pointsImpact} pts
                      </Text>
                    </View>
                  )}
                  <View style={styles.recStat}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.recStatText}>{rec.timeframe}</Text>
                  </View>
                </View>
                {/* An "action" call-to-action button lived here, labelled from
                    `rec.action` — a field the payload does not have, and one
                    that pointed at `rec.route`, which it also does not have.
                    The difficulty IS on the payload and is the honest detail
                    to show instead. */}
                <View style={styles.recStat}>
                  <Ionicons
                    name="barbell-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.recStatText}>{rec.difficulty}</Text>
                </View>
              </View>
            </Card>
          </View>
        ))}

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Explore More</Text>
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push("/recommendations/credit-cards")}
          >
            <Ionicons name="card" size={24} color={theme.colors.primary} />
            <Text style={styles.quickLinkText}>Credit Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push("/recommendations/loans")}
          >
            <Ionicons name="cash" size={24} color={theme.colors.primary} />
            <Text style={styles.quickLinkText}>Loans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push("/recommendations/insights")}
          >
            <Ionicons name="bulb" size={24} color={theme.colors.primary} />
            <Text style={styles.quickLinkText}>Insights</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBlock: { paddingVertical: 32, alignItems: "center" },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
  categoryLabel: { fontSize: 13, color: theme.colors.textSecondary },
  categoryLabelActive: { color: "#FFFFFF", fontWeight: "600" },
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  refreshButton: { padding: 8 },
  summaryCard: { marginBottom: theme.spacing.lg, backgroundColor: "#F5F3FF" },
  summaryRow: { flexDirection: "row", alignItems: "flex-start" },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  summaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  impactRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E9D5FF",
  },
  impactItem: { flex: 1, alignItems: "center" },
  impactValue: { fontSize: 24, fontWeight: "700", color: "#8B5CF6" },
  impactLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  categoryScroll: { marginBottom: theme.spacing.md },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  categoryChipTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  recCard: { marginBottom: theme.spacing.sm },
  recHeader: { flexDirection: "row" },
  recIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recContent: { flex: 1 },
  recTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  priorityText: { fontSize: 10, fontWeight: "700" },
  recDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  recFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recStats: { flexDirection: "row" },
  recStat: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  recStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.primary,
    marginRight: 4,
  },
  quickLinksRow: { flexDirection: "row", justifyContent: "space-between" },
  quickLink: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: 4,
  },
  quickLinkText: { fontSize: 12, color: theme.colors.text, marginTop: 8 },
});
