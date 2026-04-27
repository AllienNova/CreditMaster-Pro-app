/**
 * Fynvita Credit Services Marketplace Screen
 * Professional credit repair services from marketplace API
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import type { MarketplaceProduct } from "../../src/services/api/marketplace";

export default function ServicesScreen() {
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("services");
  }, []);

  const handleGetStarted = (product: MarketplaceProduct) => {
    if (product.provider?.website) {
      Linking.openURL(product.provider.website);
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
          <Text style={styles.title}>Credit Services</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading services...</Text>
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
          <Text style={styles.title}>Credit Services</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cloud-offline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorTitle}>Unable to load services</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { clearError(); fetchProducts("services"); }}
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
          <Text style={styles.title}>Credit Services</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            All services include a money-back guarantee if we can't help improve your credit.
          </Text>
        </Card>

        {/* Empty State */}
        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No services available yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for new offerings</Text>
          </View>
        )}

        {/* Services List */}
        {products.map((product) => {
          const features = renderFeatures(product.features);
          const priceLabel = product.price === 0
            ? "Free"
            : `$${product.price}${product.priceType === "monthly" ? "/mo" : product.priceType === "yearly" ? "/yr" : ""}`;

          return (
            <Card key={product.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{product.name}</Text>
                  <Text style={styles.serviceDescription}>{product.description || ""}</Text>
                </View>
                <Text style={styles.servicePrice}>{priceLabel}</Text>
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
                <View style={styles.footerLeft}>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewsText}>({product.reviewCount})</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={() => handleGetStarted(product)}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {/* Guarantee Card */}
        {products.length > 0 && (
          <Card style={styles.guaranteeCard}>
            <Ionicons name="ribbon" size={32} color={theme.colors.primary} />
            <Text style={styles.guaranteeTitle}>100% Satisfaction Guarantee</Text>
            <Text style={styles.guaranteeText}>
              If we can't help improve your credit within 90 days, we'll refund your money. No questions asked.
            </Text>
          </Card>
        )}

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
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: `${theme.colors.primary}10`, marginBottom: theme.spacing.lg,
  },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 10, lineHeight: 18 },
  serviceCard: { marginBottom: theme.spacing.md },
  serviceHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  serviceName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  serviceDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, maxWidth: "80%" },
  servicePrice: { fontSize: 18, fontWeight: "700", color: theme.colors.primary },
  featuresSection: {
    paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  serviceFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  footerLeft: {},
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginLeft: 4 },
  reviewsText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 2 },
  getStartedButton: {
    backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8,
  },
  getStartedText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  guaranteeCard: { alignItems: "center", paddingVertical: theme.spacing.xl, marginTop: theme.spacing.md },
  guaranteeTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginTop: theme.spacing.md },
  guaranteeText: {
    fontSize: 13, color: theme.colors.textSecondary, textAlign: "center",
    marginTop: 8, lineHeight: 18, paddingHorizontal: theme.spacing.md,
  },
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
