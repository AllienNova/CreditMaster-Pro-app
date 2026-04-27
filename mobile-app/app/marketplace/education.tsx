/**
 * Fynvita Credit Education Marketplace Screen
 * Courses and educational resources from marketplace API
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

export default function EducationScreen() {
  const { products, isLoadingProducts, error, fetchProducts, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProducts("education");
  }, []);

  const renderFeatures = (features: Record<string, unknown>): string[] => {
    if (Array.isArray(features)) return features as string[];
    if (features && typeof features === "object" && "list" in features) {
      return features.list as string[];
    }
    return Object.values(features).filter(
      (v) => typeof v === "string",
    ) as string[];
  };

  const handleSelectCourse = (product: MarketplaceProduct) => {
    if (product.provider?.website) {
      Linking.openURL(product.provider.website);
    }
  };

  if (isLoadingProducts) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { padding: theme.spacing.lg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Education Library</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading education resources...</Text>
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
          <Text style={styles.title}>Education Library</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cloud-offline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorTitle}>Unable to load resources</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { clearError(); fetchProducts("education"); }}
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
          <Text style={styles.title}>Education Library</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="school" size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Learn to Master Your Credit</Text>
          <Text style={styles.heroSubtitle}>
            Courses and guides to help you understand and improve your credit
          </Text>
        </Card>

        {/* Empty State */}
        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No education resources available yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for courses and guides</Text>
          </View>
        )}

        {/* Courses List */}
        {products.map((product) => {
          const features = renderFeatures(product.features);
          const priceLabel = product.price === 0
            ? "Free"
            : `$${product.price}${product.priceType === "monthly" ? "/mo" : product.priceType === "yearly" ? "/yr" : ""}`;

          return (
            <TouchableOpacity key={product.id} onPress={() => handleSelectCourse(product)}>
              <Card style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <View style={styles.courseIcon}>
                    <Ionicons name="book" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.courseInfo}>
                    <View style={styles.courseTitleRow}>
                      <Text style={styles.courseTitle} numberOfLines={1}>{product.name}</Text>
                      {product.price === 0 ? (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeText}>Free</Text>
                        </View>
                      ) : (
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceText}>{priceLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.courseDescription} numberOfLines={2}>
                      {product.description || ""}
                    </Text>
                  </View>
                </View>

                {features.length > 0 && (
                  <View style={styles.courseMeta}>
                    {features.slice(0, 3).map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Ionicons name="checkmark" size={14} color="#22C55E" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.courseFooter}>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewsText}>({product.reviewCount})</Text>
                  </View>
                  <TouchableOpacity style={styles.courseButton}>
                    <Text style={styles.courseButtonText}>View Course</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
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
  heroCard: { alignItems: "center", paddingVertical: theme.spacing.xl, marginBottom: theme.spacing.lg },
  heroIconContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${theme.colors.primary}15`, justifyContent: "center", alignItems: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing.md },
  heroSubtitle: {
    fontSize: 13, color: theme.colors.textSecondary, textAlign: "center",
    marginTop: 8, lineHeight: 18, paddingHorizontal: theme.spacing.md,
  },
  courseCard: { marginBottom: theme.spacing.md },
  courseHeader: { flexDirection: "row", marginBottom: theme.spacing.sm },
  courseIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`, justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  courseInfo: { flex: 1 },
  courseTitleRow: { flexDirection: "row", alignItems: "center" },
  courseTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text, flex: 1, marginRight: 8 },
  freeBadge: { backgroundColor: "#22C55E", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freeText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  priceBadge: { backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priceText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  courseDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  courseMeta: {
    paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },
  courseFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginLeft: 4 },
  reviewsText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 2 },
  courseButton: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.colors.primary, borderRadius: 8,
  },
  courseButtonText: { fontSize: 13, fontWeight: "600", color: "#fff" },
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
