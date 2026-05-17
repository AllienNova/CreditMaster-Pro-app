/**
 * Fynvita Monitoring Services Marketplace Screen
 * Compare credit monitoring services from marketplace API
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import type { MarketplaceProduct } from "../../src/services/api/marketplace";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

export default function MonitoringServicesScreen() {
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("monitoring");
  }, []);

  const handleLearnMore = (product: MarketplaceProduct) => {
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Monitoring Services</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading monitoring services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { padding: theme.spacing.lg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Monitoring Services</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cloud-offline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorTitle}>Unable to load services</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { clearError(); fetchProducts("monitoring"); }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Monitoring Services</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Comparison Info */}
        <Card style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Why Credit Monitoring?</Text>
            <Text style={styles.infoText}>
              Stay informed about changes to your credit report and catch identity theft early.
            </Text>
          </View>
        </Card>

        {/* Empty State */}
        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="eye-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No monitoring services available yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for new offerings</Text>
          </View>
        )}

        {/* Services List */}
        {products.map((product, index) => {
          const features = renderFeatures(product.features);
          const isTopRated = index === 0 && product.rating >= 4.5;
          const priceLabel = product.price === 0
            ? "Free"
            : `$${product.price}${product.priceType === "monthly" ? "/mo" : product.priceType === "yearly" ? "/yr" : ""}`;

          return (
            <Card
              key={product.id}
              style={[styles.serviceCard, isTopRated && styles.recommendedCard]}
            >
              {isTopRated && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Top Rated</Text>
                </View>
              )}
              <View style={styles.serviceHeader}>
                <View>
                  <Text style={styles.serviceName}>{product.name}</Text>
                  <Text style={styles.servicePrice}>{priceLabel}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingBadgeText}>{product.rating.toFixed(1)}</Text>
                </View>
              </View>

              {features.length > 0 && (
                <View style={styles.featuresSection}>
                  {features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.serviceFooter}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.learnButton, isTopRated && styles.learnButtonPrimary]}
                  onPress={() => handleLearnMore(product)}
                >
                  <Text style={[styles.learnButtonText, isTopRated && styles.learnButtonTextPrimary]}>
                    {isTopRated ? "Get Started" : "Learn More"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  infoCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.lg },
  infoContent: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  serviceCard: { marginBottom: theme.spacing.md },
  recommendedCard: { borderWidth: 2, borderColor: theme.colors.primary },
  recommendedBadge: {
    position: "absolute", top: -10, right: 12,
    backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  recommendedText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  serviceHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  serviceName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  servicePrice: { fontSize: 14, color: theme.colors.primary, fontWeight: "600", marginTop: 2 },
  ratingBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: `${theme.colors.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  ratingBadgeText: { fontSize: 12, fontWeight: "500", color: theme.colors.primary, marginLeft: 4 },
  featuresSection: { marginBottom: theme.spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  serviceFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 14, fontWeight: "600", color: theme.colors.text, marginLeft: 4 },
  learnButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.primary,
  },
  learnButtonPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  learnButtonText: { fontSize: 14, fontWeight: "600", color: theme.colors.primary },
  learnButtonTextPrimary: { color: "#fff" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  errorTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginTop: theme.spacing.md },
  errorSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: "center" },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: theme.spacing.lg },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
});
