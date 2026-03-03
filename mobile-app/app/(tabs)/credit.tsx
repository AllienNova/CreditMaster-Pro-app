/**
 * Fynvita Credit Tab Screen
 * Main credit score overview with navigation to detailed screens
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { ScoreGauge } from "../../src/components/ScoreGauge";
import { Card, LastUpdated } from "../../src/components";
import {
  useCreditStore,
  selectLastScoreFetch,
  selectIsBackgroundSyncEnabled,
} from "../../src/store/creditStore";

export default function CreditScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, withOpacity } =
    useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const {
    scores,
    factors,
    fetchScores,
    fetchFactors,
    isLoadingScores,
    enableBackgroundSync,
    disableBackgroundSync,
  } = useCreditStore();
  const lastScoreFetch = useCreditStore(selectLastScoreFetch);
  const isBackgroundSyncEnabled = useCreditStore(selectIsBackgroundSyncEnabled);

  useEffect(() => {
    fetchScores();
    fetchFactors();

    // Enable background sync when component mounts
    enableBackgroundSync(5 * 60 * 1000); // 5 minutes

    // Cleanup on unmount
    return () => {
      disableBackgroundSync();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchScores(), fetchFactors()]);
    setRefreshing(false);
  };

  const primaryScore = scores.find((s) => s.bureau === "experian") || scores[0];

  const menuItems = [
    {
      icon: "speedometer",
      title: "Score Details",
      subtitle: "View detailed score breakdown",
      route: "/credit/score-detail",
    },
    {
      icon: "analytics",
      title: "Score History",
      subtitle: "Track your progress over time",
      route: "/credit/history",
    },
    {
      icon: "pie-chart",
      title: "Credit Factors",
      subtitle: "What affects your score",
      route: "/credit/factors",
    },
    {
      icon: "notifications",
      title: "Monitoring",
      subtitle: "Alerts and bureau connections",
      route: "/monitoring",
    },
    {
      icon: "calculator",
      title: "Score Simulator",
      subtitle: "See how actions affect your score",
      route: "/credit-builder/simulator",
    },
    {
      icon: "build",
      title: "Credit Builder",
      subtitle: "18 tools to improve your score",
      route: "/credit-builder",
    },
    {
      icon: "construct",
      title: "Credit Repair",
      subtitle: "Dispute & repair strategies",
      route: "/credit-repair",
    },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollView: { flex: 1 },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing.lg,
        },
        title: { fontSize: 28, fontWeight: "700", color: colors.text },
        scoreCard: {
          marginHorizontal: spacing.lg,
          marginBottom: spacing.lg,
        },
        scoreContainer: { alignItems: "center", paddingVertical: spacing.lg },
        lastUpdatedContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
          gap: 12,
        },
        syncBadge: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: withOpacity(colors.primary, 0.08),
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          gap: 4,
        },
        syncBadgeText: {
          fontSize: 10,
          color: colors.primary,
          fontWeight: "600",
        },
        lastUpdated: {
          textAlign: "center",
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: spacing.md,
        },
        bureauScores: {
          flexDirection: "row",
          justifyContent: "space-around",
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        bureauItem: { alignItems: "center" },
        bureauName: {
          fontSize: 12,
          color: colors.textSecondary,
          textTransform: "capitalize",
          marginBottom: 4,
        },
        bureauScore: { fontSize: 20, fontWeight: "700", color: colors.text },
        changeBadge: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 10,
          marginTop: 4,
        },
        changeText: { fontSize: 11, fontWeight: "600", marginLeft: 2 },
        loadingContainer: {
          alignItems: "center",
          paddingVertical: spacing.xl * 2,
        },
        loadingText: {
          fontSize: 16,
          color: colors.textSecondary,
          marginTop: spacing.md,
        },
        emptyContainer: {
          alignItems: "center",
          paddingVertical: spacing.xl * 2,
        },
        emptyTitle: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
          marginTop: spacing.md,
        },
        emptyText: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: spacing.sm,
          textAlign: "center",
          paddingHorizontal: spacing.xl,
        },
        connectButton: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.lg,
          marginTop: spacing.lg,
        },
        connectButtonText: {
          color: colors.textInverse,
          fontSize: 16,
          fontWeight: "600",
        },
        menuSection: { paddingHorizontal: spacing.lg },
        menuItem: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        menuIcon: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: withOpacity(colors.primary, 0.08),
          justifyContent: "center",
          alignItems: "center",
          marginRight: spacing.md,
        },
        menuContent: { flex: 1 },
        menuTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
        menuSubtitle: {
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 2,
        },
      }),
    [colors, spacing, borderRadius, withOpacity],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Credit Score</Text>
          <TouchableOpacity onPress={() => router.push("/notifications")}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Score Gauge */}
        <Card style={styles.scoreCard}>
          {isLoadingScores && scores.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="sync" size={48} color={colors.primary} />
              <Text style={styles.loadingText}>
                Loading your credit score...
              </Text>
            </View>
          ) : scores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="speedometer-outline"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No Credit Score Data</Text>
              <Text style={styles.emptyText}>
                Connect to a credit bureau to view your score
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => router.push("/monitoring/bureaus")}
              >
                <Text style={styles.connectButtonText}>Connect Bureau</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.scoreContainer}>
                <ScoreGauge
                  score={primaryScore?.score || 0}
                  size={180}
                  showLabel
                  change={primaryScore?.change}
                />
              </View>
              <View style={styles.lastUpdatedContainer}>
                <LastUpdated
                  timestamp={lastScoreFetch}
                  label="Last updated"
                  size="medium"
                />
                {isBackgroundSyncEnabled && (
                  <View style={styles.syncBadge}>
                    <Ionicons name="sync" size={10} color={colors.primary} />
                    <Text style={styles.syncBadgeText}>Auto-sync</Text>
                  </View>
                )}
              </View>

              {/* Bureau Scores */}
              <View style={styles.bureauScores}>
                {scores.map((score) => (
                  <TouchableOpacity
                    key={score.bureau}
                    style={styles.bureauItem}
                    onPress={() =>
                      router.push(`/credit/score-detail?bureau=${score.bureau}`)
                    }
                  >
                    <Text style={styles.bureauName}>{score.bureau}</Text>
                    <Text style={styles.bureauScore}>{score.score}</Text>
                    {score.change !== undefined && score.change !== 0 && (
                      <View
                        style={[
                          styles.changeBadge,
                          {
                            backgroundColor:
                              score.change > 0
                                ? withOpacity(colors.success, 0.15)
                                : withOpacity(colors.error, 0.15),
                          },
                        ]}
                      >
                        <Ionicons
                          name={score.change > 0 ? "arrow-up" : "arrow-down"}
                          size={12}
                          color={
                            score.change > 0 ? colors.secondary : colors.error
                          }
                        />
                        <Text
                          style={[
                            styles.changeText,
                            {
                              color:
                                score.change > 0
                                  ? colors.secondary
                                  : colors.error,
                            },
                          ]}
                        >
                          {Math.abs(score.change)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
