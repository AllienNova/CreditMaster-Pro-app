/**
 * Fynvita Credit Coaching Marketplace Screen
 * 1-on-1 credit coaching services from marketplace API
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
import type { MarketplaceProvider } from "../../src/services/api/marketplace";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

export default function CoachingScreen() {
  const { providers, isLoadingProviders, error, fetchProviders, clearError } =
    useMarketplaceStore();

  useEffect(() => {
    fetchProviders("coaching");
  }, []);

  const handleBookCoach = (provider: MarketplaceProvider) => {
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
          <Text style={styles.title}>Credit Coaching</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading coaches...</Text>
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
          <Text style={styles.title}>Credit Coaching</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="cloud-offline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorTitle}>Unable to load coaches</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { clearError(); fetchProviders("coaching"); }}
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
          <Text style={styles.title}>Credit Coaching</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <Ionicons name="people" size={32} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>Get Personalized Guidance</Text>
          <Text style={styles.heroText}>
            Work 1-on-1 with certified credit experts to achieve your financial goals faster.
          </Text>
        </Card>

        {/* Coaches */}
        <Text style={styles.sectionTitle}>Our Coaches</Text>

        {providers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No coaches available yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for new coaching options</Text>
          </View>
        )}

        {providers.map((provider) => (
          <Card key={provider.id} style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {provider.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{provider.name}</Text>
                <Text style={styles.coachTitle}>{provider.description || provider.category}</Text>
                <View style={styles.coachMeta}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.coachRating}>{provider.rating.toFixed(1)}</Text>
                  <Text style={styles.coachReviews}>
                    {provider.reviewCount} reviews
                  </Text>
                </View>
              </View>
              <View>
                {provider.yearsInBusiness && (
                  <Text style={styles.coachExperience}>
                    {provider.yearsInBusiness}yr exp
                  </Text>
                )}
                <View
                  style={[
                    styles.availabilityBadge,
                    { backgroundColor: provider.verified ? "#22C55E15" : "#EF444415" },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      { color: provider.verified ? "#22C55E" : "#EF4444" },
                    ]}
                  >
                    {provider.verified ? "Verified" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
            {provider.bbbRating && (
              <View style={styles.specialtyRow}>
                <Ionicons name="ribbon" size={14} color={theme.colors.primary} />
                <Text style={styles.specialtyText}>BBB Rating: {provider.bbbRating}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => handleBookCoach(provider)}
            >
              <Text style={styles.bookButtonText}>Book Session</Text>
            </TouchableOpacity>
          </Card>
        ))}

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
  heroTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing.md },
  heroText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text, marginBottom: theme.spacing.sm },
  coachCard: { marginBottom: theme.spacing.md },
  coachHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.sm },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: theme.colors.primary, justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "600", color: "#fff" },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  coachTitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  coachMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  coachRating: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginLeft: 4 },
  coachReviews: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  coachExperience: { fontSize: 12, fontWeight: "600", color: theme.colors.primary, textAlign: "right" },
  availabilityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  availabilityText: { fontSize: 10, fontWeight: "600" },
  specialtyRow: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  specialtyText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 6 },
  bookButton: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  bookButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
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
