/**
 * Fynvita Tradelines Marketplace Screen
 * Authorized user tradelines from marketplace API
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import type { MarketplaceProduct } from "../../src/services/api/marketplace";

export default function TradelinesScreen() {
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("tradelines");
  }, []);

  const handlePurchase = (product: MarketplaceProduct) => {
    Alert.alert(
      "Purchase Tradeline",
      `Add ${product.name} tradeline for $${product.price}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            if (product.provider?.website) {
              Linking.openURL(product.provider.website);
            }
          },
        },
      ],
    );
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
          <Text style={styles.title}>Tradelines</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tradelines...</Text>
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
          <Text style={styles.title}>Tradelines</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons
            name="cloud-offline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorTitle}>Unable to load tradelines</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchProducts("tradelines");
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
          <Text style={styles.title}>Tradelines</Text>
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
            <Text style={styles.infoTitle}>What are Tradelines?</Text>
            <Text style={styles.infoText}>
              Tradelines are credit accounts that appear on your credit report.
              Being added as an authorized user on someone else's account can
              help build your credit history.
            </Text>
          </View>
        </Card>

        {/* How It Works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsRow}>
          {[
            { step: "1", title: "Choose", desc: "Select a tradeline" },
            { step: "2", title: "Purchase", desc: "Complete payment" },
            { step: "3", title: "Added", desc: "Added to your report" },
          ].map((item, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>{item.step}</Text>
              </View>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Tradelines List */}
        <Text style={styles.sectionTitle}>Available Tradelines</Text>

        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="trending-up-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              No tradelines available yet
            </Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new offerings
            </Text>
          </View>
        )}

        {products.map((product) => {
          const features = renderFeatures(product.features);
          return (
            <Card key={product.id} style={styles.tradelineCard}>
              <View style={styles.tradelineHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tradelineBank}>{product.name}</Text>
                  <Text style={styles.tradelineAge}>
                    {product.provider?.name || ""}
                  </Text>
                </View>
                <Text style={styles.tradelinePrice}>${product.price}</Text>
              </View>

              <View style={styles.tradelineStats}>
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
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={[styles.statValue, { color: product.active ? "#22C55E" : "#EF4444" }]}>
                    {product.active ? "Available" : "Sold Out"}
                  </Text>
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
                style={[
                  styles.purchaseButton,
                  !product.active && styles.purchaseButtonDisabled,
                ]}
                onPress={() => handlePurchase(product)}
                disabled={!product.active}
              >
                <Text style={styles.purchaseButtonText}>
                  {product.active ? "Purchase" : "Unavailable"}
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            Tradelines are typically removed after 1-2 billing cycles. Results
            may vary. This is not a guarantee of credit score improvement.
          </Text>
        </Card>

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
  infoBanner: { marginBottom: theme.spacing.lg },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  stepItem: { flex: 1, alignItems: "center" },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumber: { fontSize: 16, fontWeight: "700", color: "#fff" },
  stepTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  stepDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  tradelineCard: { marginBottom: theme.spacing.sm },
  tradelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  tradelineBank: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  tradelineAge: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tradelinePrice: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  tradelineStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 14,
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
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  purchaseButtonDisabled: { backgroundColor: theme.colors.textSecondary },
  purchaseButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    marginTop: theme.spacing.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    marginLeft: 10,
    lineHeight: 16,
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
