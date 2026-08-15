/**
 * Fynvita Subscription Management Screen
 *
 * Real-data wiring (PARITY-P2): the plan catalog, the active plan, the current
 * status, and the renewal date are fetched from the real Stripe-backed web route
 * GET /api/payment/billing (withPermission("billing:read")) via
 * subscriptionApi.getSubscriptionDetail, adapted web -> mobile by mapWebSubscription.
 *
 * The former hardcoded PLANS array — a wrong 4-plan catalog ("Basic"/"Enterprise"
 * don't exist; prices $9.99/$29.99/$99.99 diverged from the real 6-tier pricing)
 * with "pro" hardcoded as the current plan — and its fake setTimeout load were
 * removed. Plans, prices, features, and the current marker now come from the real
 * SUBSCRIPTION_PLANS catalog; the plan-change and cancel actions call the real
 * route POST /api/payment/billing/plan instead of a dead local-state toggle.
 * No payment-method / card data is rendered on this screen.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { subscriptionApi } from "../../src/services/api/user";
import type {
  SubscriptionDetail,
  SubscriptionPlanView,
} from "../../src/services/api/user";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

const STATUS_COLORS: Record<string, string> = {
  active: theme.colors.success,
  trialing: theme.colors.success,
  past_due: theme.colors.warning,
  incomplete: theme.colors.warning,
  unpaid: theme.colors.error,
  canceled: theme.colors.error,
};

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatus(status: string): string {
  return titleCase(status.replace(/_/g, " "));
}

function actionLabel(
  plan: SubscriptionPlanView,
  currentPlan: SubscriptionPlanView | null,
): string {
  if (!currentPlan) return "Select";
  if (plan.price > currentPlan.price) return "Upgrade";
  if (plan.price < currentPlan.price) return "Downgrade";
  return "Select";
}

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await subscriptionApi.getSubscriptionDetail();
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      setError(
        res.error?.message ?? "Unable to load your subscription right now.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscription();
    setRefreshing(false);
  };

  const submitPlanChange = useCallback(
    async (planId: string) => {
      setPendingPlanId(planId);
      const res = await subscriptionApi.updatePlan(planId);
      setPendingPlanId(null);
      if (!res.success || !res.data) {
        Alert.alert(
          "Unable to change plan",
          res.error?.message ?? "Please try again.",
        );
        return;
      }
      if (res.data.status === "redirect" && res.data.checkoutUrl) {
        await openExternalUrl(res.data.checkoutUrl);
        return;
      }
      await loadSubscription();
    },
    [loadSubscription],
  );

  const handleSelectPlan = (plan: SubscriptionPlanView) => {
    if (plan.isCurrent || pendingPlanId) return;
    Alert.alert("Change Plan", `Switch to the ${plan.name} plan?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => submitPlanChange(plan.id) },
    ]);
  };

  const submitCancel = useCallback(async () => {
    setPendingPlanId("cancel");
    const res = await subscriptionApi.cancelPlan();
    setPendingPlanId(null);
    if (!res.success || !res.data) {
      Alert.alert("Unable to cancel", res.error?.message ?? "Please try again.");
      return;
    }
    await loadSubscription();
  }, [loadSubscription]);

  const handleCancelSubscription = () => {
    if (pendingPlanId) return;
    Alert.alert(
      "Cancel Subscription",
      "Your paid features stay active until the end of the current billing period, then your account moves to the Free plan.",
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: () => submitCancel(),
        },
      ],
    );
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Subscription</Text>
        <Text style={styles.subtitle}>Choose your plan</Text>
      </View>
    </View>
  );

  if (loading && !detail) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View
          style={styles.loadingContainer}
          testID="billing-subscription-loading"
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !detail) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {header}
        <View style={styles.stateBlock} testID="billing-subscription-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadSubscription}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = detail?.plans?.find((p) => p.isCurrent) ?? null;
  const statusColor = detail
    ? (STATUS_COLORS[detail.status] ?? theme.colors.textSecondary)
    : theme.colors.textSecondary;
  const hasPlans = (detail?.plans?.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {header}

        {detail && !hasPlans && (
          <View style={styles.stateBlock} testID="billing-subscription-empty">
            <Ionicons
              name="pricetags-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>
              No plans are available right now.
            </Text>
          </View>
        )}

        {detail && hasPlans && (
          <>
            {/* Current subscription status */}
            {currentPlan && (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Current plan</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor}15` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {formatStatus(detail.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.summaryPlan}>{currentPlan.name}</Text>
                {detail.nextBilling && (
                  <Text style={styles.summaryRenewal}>
                    {detail.cancelAtPeriodEnd ? "Access ends" : "Renews"}:{" "}
                    {detail.nextBilling}
                  </Text>
                )}
              </Card>
            )}

            {/* Plans */}
            {detail.plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => handleSelectPlan(plan)}
                disabled={plan.isCurrent || !!pendingPlanId}
              >
                <Card
                  style={[styles.planCard, plan.isCurrent && styles.currentPlan]}
                >
                  {plan.isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentText}>Current Plan</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.planPrice}>
                        ${plan.price.toFixed(2)}
                      </Text>
                      {plan.price > 0 && (
                        <Text style={styles.planPeriod}>
                          /{plan.interval === "year" ? "yr" : "mo"}
                        </Text>
                      )}
                    </View>
                  </View>
                  {plan.features.length > 0 && (
                    <View style={styles.featuresContainer}>
                      {plan.features.map((feature, i) => (
                        <View key={i} style={styles.featureRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={theme.colors.success}
                          />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!plan.isCurrent && (
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => handleSelectPlan(plan)}
                      disabled={!!pendingPlanId}
                    >
                      {pendingPlanId === plan.id ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                      ) : (
                        <Text style={styles.selectText}>
                          {actionLabel(plan, currentPlan)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </Card>
              </TouchableOpacity>
            ))}

            {/* Cancel — only offered while on a paid, non-cancelling plan */}
            {currentPlan &&
              currentPlan.price > 0 &&
              !detail.cancelAtPeriodEnd && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                  disabled={!!pendingPlanId}
                  testID="billing-subscription-cancel"
                >
                  {pendingPlanId === "cancel" ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.error}
                    />
                  ) : (
                    <Text style={styles.cancelText}>Cancel Subscription</Text>
                  )}
                </TouchableOpacity>
              )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  stateBlock: { alignItems: "center", paddingVertical: 40 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  summaryPlan: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  summaryRenewal: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  planCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    position: "relative",
  },
  currentPlan: { borderWidth: 2, borderColor: theme.colors.primary },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planName: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  priceContainer: { flexDirection: "row", alignItems: "baseline" },
  planPrice: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  planPeriod: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  featuresContainer: { marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  featureText: { fontSize: 13, color: theme.colors.text, marginLeft: 8 },
  selectButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectText: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  cancelButton: {
    alignItems: "center",
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  cancelText: { fontSize: 14, color: theme.colors.error },
});
