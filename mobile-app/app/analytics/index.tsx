/**
 * Fynvita Analytics Dashboard
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { ScreenHeader } from "../../src/components/ScreenHeader";

export default function AnalyticsScreen() {
  const analyticsItems = [
    {
      icon: "speedometer",
      title: "Credit Score Analytics",
      subtitle: "Score trends and predictions",
      route: "/analytics/credit-score",
    },
    {
      icon: "document-text",
      title: "Dispute Analytics",
      subtitle: "Success rates and patterns",
      route: "/analytics/disputes",
    },
    {
      icon: "trending-up",
      title: "Trends",
      subtitle: "Historical data analysis",
      route: "/analytics/trends",
    },
    {
      icon: "bar-chart",
      title: "Reports",
      subtitle: "Generate detailed reports",
      route: "/analytics/reports",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <ScreenHeader title="Analytics" subtitle="Insights and data analysis" />

        {/*
          A "Quick Stats" row lived here telling EVERY user their score had
          moved +45 and their dispute success rate was 87% — two numbers with
          no source, on a screen that makes no request at all.

          Not replaced with a real read. This is a navigation hub, and both
          figures already have a screen that computes them from the caller's
          own data: /analytics/credit-score for score movement and
          /analytics/disputes for dispute outcomes. Duplicating them here would
          mean a second calculation to keep in agreement with the first, which
          is how transactions ended up with a chart that disagreed with its own
          list.
        */}

        {/* Analytics Items */}
        <View style={styles.analyticsSection}>
          {analyticsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.analyticsItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.analyticsIcon}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsTitle}>{item.title}</Text>
                <Text style={styles.analyticsSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  analyticsSection: { marginTop: theme.spacing.md },
  analyticsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  analyticsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  analyticsContent: { flex: 1 },
  analyticsTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  analyticsSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
