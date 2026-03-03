import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES = ["All", "Entertainment", "Software", "Services", "Fitness", "Cloud"];

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "1",
    name: "Netflix",
    cost: 15.99,
    billingCycle: "monthly",
    category: "Entertainment",
    icon: "play-circle-outline",
  },
  {
    id: "2",
    name: "Spotify",
    cost: 10.99,
    billingCycle: "monthly",
    category: "Entertainment",
    icon: "musical-notes-outline",
  },
  {
    id: "3",
    name: "Disney+",
    cost: 13.99,
    billingCycle: "monthly",
    category: "Entertainment",
    icon: "star-outline",
  },
  {
    id: "4",
    name: "Adobe Creative Cloud",
    cost: 54.99,
    billingCycle: "monthly",
    category: "Software",
    icon: "color-palette-outline",
  },
  {
    id: "5",
    name: "iCloud Storage",
    cost: 2.99,
    billingCycle: "monthly",
    category: "Cloud",
    icon: "cloud-outline",
  },
  {
    id: "6",
    name: "Gym Membership",
    cost: 24.99,
    billingCycle: "monthly",
    category: "Fitness",
    icon: "barbell-outline",
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function SubscriptionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredSubscriptions =
    selectedCategory === "All"
      ? MOCK_SUBSCRIPTIONS
      : MOCK_SUBSCRIPTIONS.filter((sub) => sub.category === selectedCategory);

  const totalMonthly = MOCK_SUBSCRIPTIONS.reduce((sum, sub) => {
    return sum + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost);
  }, 0);

  const totalAnnual = totalMonthly * 12;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Cost</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalMonthly)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Annual Cost</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(totalAnnual)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryAmount}>
                {MOCK_SUBSCRIPTIONS.length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subscription List */}
        {filteredSubscriptions.map((sub) => (
          <TouchableOpacity key={sub.id} activeOpacity={0.7}>
            <Card style={styles.subCard}>
              <View style={styles.subRow}>
                <View style={styles.subIconContainer}>
                  <Ionicons
                    name={sub.icon}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.subContent}>
                  <Text style={styles.subName}>{sub.name}</Text>
                  <Text style={styles.subDetail}>
                    {sub.category} &middot;{" "}
                    {sub.billingCycle === "monthly" ? "Monthly" : "Yearly"}
                  </Text>
                </View>
                <View style={styles.subRight}>
                  <Text style={styles.subCost}>
                    {formatCurrency(sub.cost)}
                  </Text>
                  <Text style={styles.subCycle}>/{sub.billingCycle === "monthly" ? "mo" : "yr"}</Text>
                </View>
              </View>
              <View style={styles.subActions}>
                <TouchableOpacity style={styles.manageButton}>
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  categoryScroll: {
    marginBottom: theme.spacing.md,
  },
  categoryContainer: {
    paddingVertical: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: theme.colors.white,
  },
  subCard: {
    marginBottom: theme.spacing.sm,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  subContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  subName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  subDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subRight: {
    alignItems: "flex-end",
  },
  subCost: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subCycle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  subActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  manageButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
  },
  manageButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "#FEE2E2",
  },
  cancelButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.error,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
