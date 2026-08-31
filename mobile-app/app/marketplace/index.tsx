/**
 * Fynvita Marketplace Dashboard
 * Shows marketplace categories with real data from API
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
import { useMarketplaceStore } from "../../src/store/marketplaceStore";
import { ScreenHeader } from "../../src/components/ScreenHeader";

const SERVICES = [
  {
    icon: "card",
    title: "Secured Cards",
    subtitle: "Build credit with secured cards",
    route: "/marketplace/secured-cards",
  },
  {
    icon: "eye",
    title: "Monitoring Services",
    subtitle: "Credit monitoring options",
    route: "/marketplace/monitoring-services",
  },
  {
    icon: "school",
    title: "Credit Education",
    subtitle: "Courses and guides",
    route: "/marketplace/education",
  },
  {
    icon: "briefcase",
    title: "Credit Attorneys",
    subtitle: "Legal assistance",
    route: "/marketplace/attorneys",
  },
  {
    icon: "people",
    title: "Community",
    subtitle: "Coming soon",
    route: "/marketplace/community",
  },
  {
    icon: "construct",
    title: "Credit Services",
    subtitle: "Professional services",
    route: "/marketplace/services",
  },
  {
    icon: "calculator",
    title: "Calculators",
    subtitle: "Financial calculators",
    route: "/marketplace/calculators",
  },
  {
    icon: "trending-up",
    title: "Tradelines",
    subtitle: "Authorized user tradelines",
    route: "/marketplace/tradelines",
  },
  {
    icon: "person",
    title: "Credit Coaching",
    subtitle: "1-on-1 coaching",
    route: "/marketplace/coaching",
  },
  {
    icon: "git-merge",
    title: "Debt Consolidation",
    subtitle: "Consolidation options",
    route: "/marketplace/consolidation",
  },
  {
    icon: "analytics",
    title: "Credit Analysis",
    subtitle: "Professional analysis",
    route: "/marketplace/analysis",
  },
];

export default function MarketplaceScreen() {
  const { categories, isLoading, fetchCategories } = useMarketplaceStore();

  useEffect(() => {
    fetchCategories();
  }, []);

  const getCategoryCount = (title: string): number | null => {
    if (categories.length === 0) return null;
    const categoryMap: Record<string, string> = {
      "Secured Cards": "secured_cards",
      "Monitoring Services": "monitoring",
      "Credit Education": "education",
      "Credit Attorneys": "legal",
      "Credit Services": "services",
      "Tradelines": "tradelines",
      "Credit Coaching": "coaching",
      "Debt Consolidation": "loans",
      "Credit Analysis": "analysis",
    };
    const apiCategory = categoryMap[title];
    if (!apiCategory) return null;
    const found = categories.find((c) => c.category === apiCategory);
    return found ? found.count : 0;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        <ScreenHeader title="Marketplace" />
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Products and services to help your credit journey
          </Text>
        </View>

        {/* Services Grid */}
        <View style={styles.servicesSection}>
          {SERVICES.map((service, index) => {
            const count = getCategoryCount(service.title);
            return (
              <TouchableOpacity
                key={index}
                style={styles.serviceItem}
                onPress={() => router.push(service.route as never)}
              >
                <View style={styles.serviceIcon}>
                  <Ionicons
                    name={service.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceSubtitle}>
                    {count !== null && count > 0
                      ? `${count} available`
                      : service.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.xl },
  // `title` used to live here; ScreenHeader owns the title now.
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  servicesSection: { marginTop: theme.spacing.md },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  serviceContent: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  serviceSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
