/**
 * Fynvita Credit Monitoring Dashboard Screen
 * Real-time credit monitoring with alerts
 */

import React, { useState, useEffect } from "react";
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
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { LineChart } from "../../src/components/charts";

interface Alert {
  id: string;
  type: "score_change" | "new_account" | "inquiry" | "payment" | "utilization";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  date: string;
  read: boolean;
}

interface BureauScore {
  bureau: string;
  score: number;
  change: number;
  lastUpdated: string;
}

const MOCK_SCORES: BureauScore[] = [
  { bureau: "Experian", score: 678, change: 12, lastUpdated: "2024-12-01" },
  { bureau: "Equifax", score: 665, change: 8, lastUpdated: "2024-11-28" },
  { bureau: "TransUnion", score: 672, change: 15, lastUpdated: "2024-11-30" },
];

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "score_change",
    title: "Credit Score Increased",
    description: "Your Experian score increased by 12 points",
    severity: "info",
    date: "2024-12-01",
    read: false,
  },
  {
    id: "2",
    type: "inquiry",
    title: "New Hard Inquiry",
    description: "A hard inquiry was added by ABC Lender",
    severity: "warning",
    date: "2024-11-28",
    read: false,
  },
  {
    id: "3",
    type: "utilization",
    title: "High Utilization Alert",
    description: "Your credit utilization is above 30%",
    severity: "critical",
    date: "2024-11-25",
    read: true,
  },
  {
    id: "4",
    type: "payment",
    title: "Payment Due Soon",
    description: "Chase card payment due in 3 days",
    severity: "warning",
    date: "2024-11-20",
    read: true,
  },
];

const SCORE_HISTORY = [
  { value: 645, label: "Jul" },
  { value: 652, label: "Aug" },
  { value: 658, label: "Sep" },
  { value: 665, label: "Oct" },
  { value: 672, label: "Nov" },
  { value: 678, label: "Dec" },
];

export default function MonitoringScreen() {
  const [scores, setScores] = useState<BureauScore[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setTimeout(() => {
      setScores(MOCK_SCORES);
      setAlerts(MOCK_ALERTS);
      setLoading(false);
    }, 500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":
        return theme.colors.primary;
      case "warning":
        return theme.colors.warning;
      case "critical":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "score_change":
        return "trending-up";
      case "new_account":
        return "add-circle";
      case "inquiry":
        return "search";
      case "payment":
        return "card";
      case "utilization":
        return "pie-chart";
      default:
        return "alert-circle";
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Credit Monitoring</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Bureau Scores */}
        <View style={styles.scoresSection}>
          {scores.map((bureau) => (
            <Card key={bureau.bureau} style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.bureauName}>{bureau.bureau}</Text>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        (bureau.change >= 0
                          ? theme.colors.success
                          : theme.colors.error) + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={bureau.change >= 0 ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={
                      bureau.change >= 0
                        ? theme.colors.success
                        : theme.colors.error
                    }
                  />
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          bureau.change >= 0
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {Math.abs(bureau.change)}
                  </Text>
                </View>
              </View>
              <Text style={styles.scoreValue}>{bureau.score}</Text>
              <Text style={styles.lastUpdated}>
                Updated: {new Date(bureau.lastUpdated).toLocaleDateString()}
              </Text>
            </Card>
          ))}
        </View>

        {/* Score History Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Score Trend (6 Months)</Text>
          <LineChart
            data={SCORE_HISTORY}
            height={180}
            color={theme.colors.success}
            showDots
            showLabels
            showGrid
          />
        </Card>

        {/* Credit Factors */}
        <Card style={styles.factorsCard}>
          <Text style={styles.sectionTitle}>Key Factors</Text>
          <View style={styles.factorsList}>
            <View style={styles.factorItem}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: theme.colors.success + "20" },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.success}
                />
              </View>
              <View style={styles.factorInfo}>
                <Text style={styles.factorLabel}>Payment History</Text>
                <Text style={styles.factorValue}>Excellent</Text>
              </View>
            </View>
            <View style={styles.factorItem}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: theme.colors.warning + "20" },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={theme.colors.warning}
                />
              </View>
              <View style={styles.factorInfo}>
                <Text style={styles.factorLabel}>Credit Utilization</Text>
                <Text style={styles.factorValue}>32%</Text>
              </View>
            </View>
            <View style={styles.factorItem}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: theme.colors.success + "20" },
                ]}
              >
                <Ionicons name="time" size={20} color={theme.colors.success} />
              </View>
              <View style={styles.factorInfo}>
                <Text style={styles.factorLabel}>Credit Age</Text>
                <Text style={styles.factorValue}>7 years</Text>
              </View>
            </View>
            <View style={styles.factorItem}>
              <View
                style={[
                  styles.factorIcon,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="layers"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.factorInfo}>
                <Text style={styles.factorLabel}>Credit Mix</Text>
                <Text style={styles.factorValue}>Good</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Alerts */}
        <Card style={styles.alertsCard}>
          <View style={styles.alertsHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[styles.alertItem, !alert.read && styles.alertUnread]}
            >
              <View
                style={[
                  styles.alertIconContainer,
                  { backgroundColor: getSeverityColor(alert.severity) + "20" },
                ]}
              >
                <Ionicons
                  name={
                    getTypeIcon(alert.type) as keyof typeof Ionicons.glyphMap
                  }
                  size={18}
                  color={getSeverityColor(alert.severity)}
                />
              </View>
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          getSeverityColor(alert.severity) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        { color: getSeverityColor(alert.severity) },
                      ]}
                    >
                      {alert.severity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertDescription}>{alert.description}</Text>
                <Text style={styles.alertDate}>
                  {new Date(alert.date).toLocaleDateString()}
                </Text>
              </View>
              {!alert.read && <View style={styles.unreadDot} />}
            </View>
          ))}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  statusText: { fontSize: 13, fontWeight: "600", color: theme.colors.success },
  scrollView: { flex: 1, padding: theme.spacing.lg },

  scoresSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  scoreCard: { flex: 1, padding: theme.spacing.md },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bureauName: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  changeText: { fontSize: 12, fontWeight: "700" },
  scoreValue: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  lastUpdated: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  chartCard: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  factorsCard: { marginBottom: theme.spacing.md },
  factorsList: { gap: 12 },
  factorItem: { flexDirection: "row", alignItems: "center" },
  factorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  factorInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factorLabel: { fontSize: 14, color: theme.colors.text },
  factorValue: { fontSize: 14, fontWeight: "600", color: theme.colors.text },

  alertsCard: { marginBottom: theme.spacing.md },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  alertUnread: {
    backgroundColor: theme.colors.primary + "08",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  alertDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  alertDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
});
