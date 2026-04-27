/**
 * Fynvita Secured Cards Marketplace Screen
 * Browse and compare secured credit cards from the marketplace API
 */

import React, { useEffect, useState } from "react";
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

const getOddsColor = (rating: number): string => {
  if (rating >= 4.5) return "#22C55E";
  if (rating >= 3.5) return "#F59E0B";
  return "#EF4444";
};

const getOddsLabel = (rating: number): string => {
  if (rating >= 4.5) return "High Approval";
  if (rating >= 3.5) return "Medium Approval";
  return "Low Approval";
};

export default function SecuredCardsScreen() {
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("secured_cards");
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    return a.price - b.price;
  });

  const handleApply = (product: MarketplaceProduct) => {
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Secured Cards</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading secured cards...</Text>
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
          <Text style={styles.title}>Secured Cards</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons
            name="cloud-offline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorTitle}>Unable to load secured cards</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchProducts("secured_cards");
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
          <Text style={styles.title}>Secured Cards</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.infoText}>
            Secured cards require a refundable deposit and help build credit
            with responsible use.
          </Text>
        </Card>

        {/* Sort Options */}
        {sortedProducts.length > 0 && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            {(["rating", "price"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortChip,
                  sortBy === option && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(option)}
              >
                <Text
                  style={[
                    styles.sortText,
                    sortBy === option && styles.sortTextActive,
                  ]}
                >
                  {option === "price" ? "Price" : "Rating"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {sortedProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="card-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No secured cards available yet</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new offerings
            </Text>
          </View>
        )}

        {/* Cards List */}
        {sortedProducts.map((product) => {
          const features = renderFeatures(product.features);
          return (
            <Card key={product.id} style={styles.cardItem}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{product.name}</Text>
                  <Text style={styles.cardIssuer}>
                    {product.provider?.name || ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.oddsBadge,
                    {
                      backgroundColor: `${getOddsColor(product.rating)}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.oddsText,
                      { color: getOddsColor(product.rating) },
                    ]}
                  >
                    {getOddsLabel(product.rating)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Price</Text>
                  <Text style={styles.statValue}>
                    {product.price === 0
                      ? "No fee"
                      : `$${product.price}/${product.priceType === "monthly" ? "mo" : product.priceType === "yearly" ? "yr" : ""}`}
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
                        size={16}
                        color="#22C55E"
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => handleApply(product)}
                >
                  <Text style={styles.applyButtonText}>Apply Now</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${theme.colors.primary}10`,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 18,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sortLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginRight: 8,
  },
  sortChipActive: { backgroundColor: theme.colors.primary },
  sortText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  sortTextActive: { color: "#fff" },
  cardItem: { marginBottom: theme.spacing.md },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  cardName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  cardIssuer: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  oddsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  oddsText: { fontSize: 11, fontWeight: "600" },
  cardStats: {
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
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginRight: 6,
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
