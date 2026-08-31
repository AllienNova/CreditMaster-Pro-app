/**
 * Fynvita Mobile Subscriptions Screen
 * Manage recurring subscriptions with AI-assisted cancellation
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";

// ============================================================================
// Types
// ============================================================================

interface Subscription {
  id: string;
  name: string;
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  status: "active" | "paused" | "pending_cancellation" | "cancelled";
  nextBillingDate: Date;
  logoUrl?: string;
  annualCost: number;
}

interface SubscriptionStats {
  totalMonthlySpend: number;
  activeCount: number;
  potentialMonthlySavings: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    name: "Netflix",
    merchantName: "Netflix Inc",
    amount: 15.99,
    frequency: "monthly",
    category: "Entertainment",
    status: "active",
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    annualCost: 191.88,
  },
  {
    id: "2",
    name: "Spotify Premium",
    merchantName: "Spotify AB",
    amount: 10.99,
    frequency: "monthly",
    category: "Entertainment",
    status: "active",
    nextBillingDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    annualCost: 131.88,
  },
  {
    id: "3",
    name: "Adobe CC",
    merchantName: "Adobe Inc",
    amount: 54.99,
    frequency: "monthly",
    category: "Software",
    status: "active",
    nextBillingDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    annualCost: 659.88,
  },
  {
    id: "4",
    name: "Planet Fitness",
    merchantName: "Planet Fitness",
    amount: 24.99,
    frequency: "monthly",
    category: "Health",
    status: "pending_cancellation",
    nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    annualCost: 299.88,
  },
  {
    id: "5",
    name: "Amazon Prime",
    merchantName: "Amazon.com",
    amount: 139.0,
    frequency: "yearly",
    category: "Shopping",
    status: "active",
    nextBillingDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    annualCost: 139.0,
  },
  {
    id: "6",
    name: "Disney+",
    merchantName: "Disney Plus",
    amount: 7.99,
    frequency: "monthly",
    category: "Entertainment",
    status: "active",
    nextBillingDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    annualCost: 95.88,
  },
];

const mockStats: SubscriptionStats = {
  totalMonthlySpend: 156.43,
  activeCount: 7,
  potentialMonthlySavings: 46.93,
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "weekly":
      return "/wk";
    case "monthly":
      return "/mo";
    case "quarterly":
      return "/qtr";
    case "yearly":
      return "/yr";
    default:
      return "";
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Entertainment: "#EC4899",
    Software: "#3B82F6",
    Health: "#22C55E",
    Shopping: "#F59E0B",
    Storage: "#8B5CF6",
  };
  return colors[category] || "#9CA3AF";
}

// ============================================================================
// Components
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function SubscriptionCard({
  subscription,
  onPress,
  onCancel,
}: {
  subscription: Subscription;
  onPress: () => void;
  onCancel: () => void;
}) {
  const daysUntil = getDaysUntil(subscription.nextBillingDate);
  const isUpcoming = daysUntil > 0 && daysUntil <= 7;

  const getStatusBadge = () => {
    switch (subscription.status) {
      case "active":
        return {
          text: "Active",
          bg: `${theme.colors.success}20`,
          color: theme.colors.success,
        };
      case "pending_cancellation":
        return {
          text: "Pending",
          bg: `${theme.colors.warning}20`,
          color: theme.colors.warning,
        };
      case "cancelled":
        return {
          text: "Cancelled",
          bg: `${theme.colors.textSecondary}20`,
          color: theme.colors.textSecondary,
        };
      default:
        return null;
    }
  };

  const badge = getStatusBadge();

  return (
    <TouchableOpacity
      style={styles.subscriptionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.subscriptionContent}>
        {/* Logo */}
        <View
          style={[
            styles.logo,
            { backgroundColor: getCategoryColor(subscription.category) },
          ]}
        >
          <Text style={styles.logoText}>{subscription.name.charAt(0)}</Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.nameRow}>
            <Text style={styles.subscriptionName}>{subscription.name}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>
                  {badge.text}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.category}>{subscription.category}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.amount}>
              {formatCurrency(subscription.amount)}
              <Text style={styles.frequency}>
                {getFrequencyLabel(subscription.frequency)}
              </Text>
            </Text>
            {subscription.status === "active" && (
              <View style={styles.dateRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={
                    isUpcoming
                      ? theme.colors.warning
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.dateText,
                    isUpcoming && { color: theme.colors.warning },
                  ]}
                >
                  {isUpcoming
                    ? `${daysUntil}d`
                    : formatDate(subscription.nextBillingDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {subscription.status === "active" && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "pending"
  >("all");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);

  const loadData = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubscriptions(mockSubscriptions);
    setStats(mockStats);
  }, []);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredSubscriptions = subscriptions
    .filter((s) => {
      if (selectedFilter === "active" && s.status !== "active") return false;
      if (selectedFilter === "pending" && s.status !== "pending_cancellation")
        return false;
      if (
        searchQuery &&
        !s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.nextBillingDate).getTime() -
        new Date(b.nextBillingDate).getTime(),
    );

  const handleCancel = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setCancelModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Subscriptions",
          // This screen configured a header — title, styling, on
          // subscriptions even a headerRight button — but never set
          // headerShown, so app/dashboard/_layout.tsx's `false` won and
          // NONE of it rendered. Turning it on makes the declared intent
          // real and gives a pushed screen its back button.
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerRight: () => (
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard
              title="Monthly"
              value={formatCurrency(stats.totalMonthlySpend)}
              subtitle={`${stats.activeCount} active`}
              icon="card"
              iconColor={theme.colors.primary}
            />
            <StatCard
              title="Savings"
              value={formatCurrency(stats.potentialMonthlySavings)}
              subtitle="potential"
              icon="sparkles"
              iconColor={theme.colors.success}
            />
          </View>
        )}

        {/* Savings Banner */}
        {stats && stats.potentialMonthlySavings > 20 && (
          <TouchableOpacity style={styles.savingsBanner}>
            <View style={styles.savingsContent}>
              <View style={styles.savingsIcon}>
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.savingsText}>
                <Text style={styles.savingsTitle}>
                  Save {formatCurrency(stats.potentialMonthlySavings * 12)}/year
                </Text>
                <Text style={styles.savingsSubtitle}>
                  AI-powered cancellation assistance
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subscriptions..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(["all", "active", "pending"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscription List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filteredSubscriptions.length} Subscription
            {filteredSubscriptions.length !== 1 ? "s" : ""}
          </Text>
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onPress={() =>
                router.push(`/billing/subscription?id=${subscription.id}`)
              }
              onCancel={() => handleCancel(subscription)}
            />
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Cancel {selectedSubscription?.name}?
              </Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              We'll guide you through the cancellation process with AI-powered
              assistance.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setCancelModalVisible(false);
                  // Navigate to cancellation flow
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  Start Cancellation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  addButton: {
    marginRight: 8,
    padding: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  savingsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  savingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  savingsText: {},
  savingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  savingsSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  subscriptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  subscriptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  subscriptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  category: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  frequency: {
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: `${theme.colors.error}15`,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  modalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
