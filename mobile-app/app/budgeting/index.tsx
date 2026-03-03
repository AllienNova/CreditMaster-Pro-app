import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface FeatureItem {
  title: string;
  description: string;
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const FEATURES: FeatureItem[] = [
  {
    title: "Bill Tracker",
    description: "Track and manage all your bills",
    route: "./bills" as Href,
    icon: "calendar-outline",
    color: "#22C55E",
  },
  {
    title: "Subscription Manager",
    description: "Find and cancel unwanted subscriptions",
    route: "./subscriptions" as Href,
    icon: "card-outline",
    color: "#3B82F6",
  },
  {
    title: "Zero-Based Budget",
    description: "Give every dollar a purpose",
    route: "./zero-based" as Href,
    icon: "wallet-outline",
    color: "#8B5CF6",
  },
  {
    title: "Auto-Save Rules",
    description: "Automate your savings",
    route: "./auto-save" as Href,
    icon: "piggy-bank-outline" as keyof typeof Ionicons.glyphMap,
    color: "#10B981",
  },
];

const QUICK_STATS = [
  { label: "Total Bills", value: "5", icon: "receipt-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Subscriptions", value: "6", icon: "repeat-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Save Rules", value: "4", icon: "shield-checkmark-outline" as keyof typeof Ionicons.glyphMap },
];

export default function BudgetingIndexScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Smart Budgeting</Text>
            <Text style={styles.headerSubtitle}>
              AI-powered tools to master your money
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Budget Overview Card */}
        <Card style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Monthly Overview</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Income</Text>
              <Text style={[styles.overviewAmount, { color: theme.colors.success }]}>
                $5,000
              </Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Expenses</Text>
              <Text style={[styles.overviewAmount, { color: theme.colors.error }]}>
                $3,245
              </Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Remaining</Text>
              <Text style={[styles.overviewAmount, { color: theme.colors.primary }]}>
                $1,755
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: "64.9%" }]} />
          </View>
          <Text style={styles.progressText}>64.9% of budget used</Text>
        </Card>

        {/* Feature Cards */}
        <Text style={styles.sectionTitle}>Budgeting Tools</Text>
        {FEATURES.map((feature) => (
          <TouchableOpacity
            key={feature.title}
            onPress={() => router.push(feature.route)}
            activeOpacity={0.7}
          >
            <Card style={styles.featureCard}>
              <View style={styles.featureRow}>
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: feature.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          {QUICK_STATS.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Ionicons
                name={stat.icon}
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  settingsButton: {
    padding: theme.spacing.sm,
  },
  overviewCard: {
    marginBottom: theme.spacing.lg,
  },
  overviewTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  overviewLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  overviewAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  featureCard: {
    marginBottom: theme.spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  featureContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  featureTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  featureDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
