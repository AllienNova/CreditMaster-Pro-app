/**
 * Fynvita Credit Attorneys Marketplace Screen
 * Find credit repair attorneys from marketplace API
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import type { MarketplaceProvider } from "../../src/services/api/marketplace";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

export default function AttorneysScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { providers, isLoadingProviders, error, fetchProviders, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProviders("legal");
  }, []);

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (provider.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleContact = (provider: MarketplaceProvider) => {
    if (provider.website) {
      openExternalUrl(provider.website);
    }
  };

  if (isLoadingProviders) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { padding: theme.spacing.lg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Attorneys</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading attorneys...</Text>
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
          <Text style={styles.title}>Credit Attorneys</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cloud-offline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorTitle}>Unable to load attorneys</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { clearError(); fetchProviders("legal"); }}
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
          <Text style={styles.title}>Credit Attorneys</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            These attorneys specialize in consumer credit law and can help with
            FCRA violations, debt collection harassment, and more.
          </Text>
        </Card>

        {/* Search */}
        {providers.length > 0 && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or specialty..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Attorneys List */}
        {filteredProviders.map((provider) => (
          <Card key={provider.id} style={styles.attorneyCard}>
            <View style={styles.attorneyHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {provider.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </Text>
              </View>
              <View style={styles.attorneyInfo}>
                <Text style={styles.attorneyName}>{provider.name}</Text>
                <Text style={styles.attorneyFirm}>{provider.description || ""}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewsText}>({provider.reviewCount} reviews)</Text>
                </View>
              </View>
              {provider.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.detailsRow}>
              {provider.bbbRating && (
                <View style={styles.detailItem}>
                  <Ionicons name="ribbon" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>BBB: {provider.bbbRating}</Text>
                </View>
              )}
              {provider.yearsInBusiness && (
                <View style={styles.detailItem}>
                  <Ionicons name="briefcase" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>{provider.yearsInBusiness} years experience</Text>
                </View>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContact(provider)}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {filteredProviders.length === 0 && providers.length > 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No attorneys found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        )}

        {providers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No attorneys available yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for legal assistance options</Text>
          </View>
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
    backgroundColor: `${theme.colors.primary}10`, marginBottom: theme.spacing.md,
  },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 10, lineHeight: 18 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: theme.spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, marginLeft: 8 },
  attorneyCard: { marginBottom: theme.spacing.md },
  attorneyHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.md },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "600", color: "#fff" },
  attorneyInfo: { flex: 1 },
  attorneyName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  attorneyFirm: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginLeft: 4 },
  reviewsText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  verifiedBadge: { backgroundColor: "#22C55E", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  detailsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: theme.spacing.md },
  detailItem: { flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 4 },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 6 },
  actionsRow: {
    flexDirection: "row", paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  contactButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8,
  },
  contactButtonText: { fontSize: 14, fontWeight: "600", color: "#fff", marginLeft: 6 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  errorTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginTop: theme.spacing.md },
  errorSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: "center" },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: theme.spacing.lg },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
});
