/**
 * Fynvita Debt Consolidation Marketplace Screen
 * Debt consolidation options from marketplace API
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import type { MarketplaceProduct } from "../../src/services/api/marketplace";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

export default function ConsolidationScreen() {
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("loans");
  }, []);

  const handleApply = (product: MarketplaceProduct) => {
    if (product.provider?.website) {
      openExternalUrl(product.provider.website);
    }
  };

  const renderFeatures = (features: Record<string, unknown>): string[] => {
    if (Array.isArray(features)) return features as string[];
    if (features && typeof features === "object" && "list" in features) {
      return features.list as string[];
    }
    return Object.values(features).filter(
      (v) => typeof v === "string",
    ) as string[];
  };

  if (isLoadingProducts) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { padding: theme.spacing.lg }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Debt Consolidation</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading consolidation options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { padding: theme.spacing.lg }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Debt Consolidation</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons
            name="cloud-offline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorTitle}>Unable to load options</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchProducts("loans");
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          <Text style={styles.title}>Debt Consolidation</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>What is Debt Consolidation?</Text>
            <Text style={styles.infoText}>
              Combine multiple debts into a single loan with one monthly
              payment, often at a lower interest rate.
            </Text>
          </View>
        </Card>

        {/* Benefits */}
        <View style={styles.benefitsRow}>
          {[
            { icon: "trending-down", text: "Lower Rate" },
            { icon: "calendar", text: "One Payment" },
            { icon: "time", text: "Pay Off Faster" },
          ].map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons
                  name={benefit.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* Empty State */}
        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="git-merge-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              No consolidation options available yet
            </Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new offerings
            </Text>
          </View>
        )}

        {/* Options List */}
        {products.map((product) => {
          const features = renderFeatures(product.features);
          return (
            <Card key={product.id} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{product.name}</Text>
                  <Text style={styles.optionType}>
                    {product.description || product.provider?.name || ""}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.optionStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Price</Text>
                  <Text style={styles.statValue}>
                    ${product.price}
                    {product.priceType === "monthly" ? "/mo" : product.priceType === "yearly" ? "/yr" : ""}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Rating</Text>
                  <Text style={styles.statValue}>
                    {product.rating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Reviews</Text>
                  <Text style={styles.statValue}>{product.reviewCount}</Text>
                </View>
              </View>

              {features.length > 0 && (
                <View style={styles.featuresSection}>
                  {features.slice(0, 3).map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#22C55E"
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => handleApply(product)}
              >
                <Text style={styles.applyButtonText}>Check Your Rate</Text>
                <Ionicons name="open-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Calculator Link */}
        <TouchableOpacity
          style={styles.calculatorLink}
          onPress={() => router.push("/financial/debt-payoff" as Href)}
        >
          <Ionicons name="calculator" size={20} color={theme.colors.primary} />
          <Text style={styles.calculatorText}>
            Use our Debt Payoff Calculator
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  infoBanner: { marginBottom: theme.spacing.md },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  benefitsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.lg,
  },
  benefitItem: { alignItems: "center" },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  benefitText: { fontSize: 12, fontWeight: "500", color: theme.colors.text },
  optionCard: { marginBottom: theme.spacing.md },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  optionName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  optionType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    marginLeft: 4,
  },
  optionStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  featuresSection: { marginTop: theme.spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginRight: 6,
  },
  calculatorLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  calculatorText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginHorizontal: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  errorSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
