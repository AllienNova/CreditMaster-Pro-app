/**
 * Fynvita Personalized Recommendations Dashboard
 * AI-generated recommendations with priority ranking and impact estimation
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "credit" | "debt" | "savings" | "protection";
  priority: "high" | "medium" | "low";
  impact: number; // Score impact points
  timeframe: string;
  action: string;
  route: string;
}

const AI_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "1",
    title: "Pay Down Credit Card Balance",
    description:
      "Reduce your Chase card balance by $500 to lower utilization to 25%",
    category: "credit",
    priority: "high",
    impact: 25,
    timeframe: "30 days",
    action: "View Strategy",
    route: "/credit-builder/utilization",
  },
  {
    id: "2",
    title: "Dispute Incorrect Late Payment",
    description:
      "We found a late payment on your Experian report that may be inaccurate",
    category: "credit",
    priority: "high",
    impact: 40,
    timeframe: "45 days",
    action: "Start Dispute",
    route: "/dispute/new",
  },
  {
    id: "3",
    title: "Become Authorized User",
    description: "Ask a family member to add you to their oldest credit card",
    category: "credit",
    priority: "medium",
    impact: 20,
    timeframe: "60 days",
    action: "Learn More",
    route: "/credit-builder/authorized-user",
  },
  {
    id: "4",
    title: "Set Up Autopay",
    description: "Enable autopay on 3 accounts to ensure on-time payments",
    category: "credit",
    priority: "medium",
    impact: 15,
    timeframe: "Ongoing",
    action: "Set Up",
    route: "/credit-builder/payments",
  },
  {
    id: "5",
    title: "Freeze Your Credit",
    description: "Protect against identity theft by freezing at all 3 bureaus",
    category: "protection",
    priority: "medium",
    impact: 0,
    timeframe: "Immediate",
    action: "Freeze Now",
    route: "/credit-builder/freeze",
  },
  {
    id: "6",
    title: "Apply for Secured Card",
    description:
      "Build credit history with a secured card - high approval odds",
    category: "credit",
    priority: "low",
    impact: 10,
    timeframe: "90 days",
    action: "View Cards",
    route: "/credit-builder/secured-card",
  },
  {
    id: "7",
    title: "Consolidate High-Interest Debt",
    description:
      "Save $1,200/year by consolidating 3 cards into a personal loan",
    category: "debt",
    priority: "medium",
    impact: 5,
    timeframe: "30 days",
    action: "Compare Loans",
    route: "/recommendations/loans",
  },
  {
    id: "8",
    title: "Build Emergency Fund",
    description:
      "Start with $500 to avoid future credit damage from emergencies",
    category: "savings",
    priority: "low",
    impact: 0,
    timeframe: "90 days",
    action: "Set Goal",
    route: "/financial/goals",
  },
];

const CATEGORIES = [
  { id: "all", label: "All", icon: "apps" },
  { id: "credit", label: "Credit", icon: "trending-up" },
  { id: "debt", label: "Debt", icon: "card" },
  { id: "savings", label: "Savings", icon: "wallet" },
  { id: "protection", label: "Protection", icon: "shield" },
];

export default function RecommendationsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const filteredRecs =
    selectedCategory === "all"
      ? AI_RECOMMENDATIONS
      : AI_RECOMMENDATIONS.filter((r) => r.category === selectedCategory);
  const totalImpact = AI_RECOMMENDATIONS.filter(
    (r) => r.priority === "high",
  ).reduce((sum, r) => sum + r.impact, 0);

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
        <View style={styles.header}>
          <Text style={styles.title}>For You</Text>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* AI Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>AI Analysis Complete</Text>
              <Text style={styles.summaryText}>
                Based on your credit profile, we found{" "}
                {AI_RECOMMENDATIONS.length} personalized recommendations
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
                {AI_RECOMMENDATIONS.filter((r) => r.priority === "high").length}
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
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={
                  selectedCategory === cat.id
                    ? "#fff"
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recommendations List */}
        <Text style={styles.sectionTitle}>
          {filteredRecs.length} Recommendations
        </Text>
        {filteredRecs.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            onPress={() => router.push(rec.route as never)}
            activeOpacity={0.7}
          >
            <Card style={styles.recCard}>
              <View style={styles.recHeader}>
                <View
                  style={[
                    styles.recIcon,
                    { backgroundColor: `${getPriorityColor(rec.priority)}15` },
                  ]}
                >
                  <Ionicons
                    name={
                      getCategoryIcon(
                        rec.category,
                      ) as keyof typeof Ionicons.glyphMap
                    }
                    size={20}
                    color={getPriorityColor(rec.priority)}
                  />
                </View>
                <View style={styles.recContent}>
                  <View style={styles.recTitleRow}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: `${getPriorityColor(rec.priority)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(rec.priority) },
                        ]}
                      >
                        {rec.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recDescription}>{rec.description}</Text>
                </View>
              </View>
              <View style={styles.recFooter}>
                <View style={styles.recStats}>
                  {rec.impact > 0 && (
                    <View style={styles.recStat}>
                      <Ionicons name="trending-up" size={14} color="#22C55E" />
                      <Text style={styles.recStatText}>+{rec.impact} pts</Text>
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
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>{rec.action}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
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
