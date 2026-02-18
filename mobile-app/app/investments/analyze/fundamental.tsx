/**
 * Fynvita Fundamental Analysis Screen
 * Valuation metrics, profitability, growth, and financial health
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import { BarChart, DonutChart } from "../../../src/components/charts";

interface MetricItem {
  name: string;
  value: string | number;
  comparison?: string;
  status: "good" | "neutral" | "warning";
}

const VALUATION_METRICS: MetricItem[] = [
  {
    name: "P/E Ratio",
    value: 28.5,
    comparison: "vs Industry 24.2",
    status: "neutral",
  },
  {
    name: "Forward P/E",
    value: 24.8,
    comparison: "vs Industry 22.1",
    status: "neutral",
  },
  {
    name: "P/B Ratio",
    value: 45.2,
    comparison: "vs Industry 12.8",
    status: "warning",
  },
  {
    name: "P/S Ratio",
    value: 7.4,
    comparison: "vs Industry 3.2",
    status: "warning",
  },
  {
    name: "PEG Ratio",
    value: 2.1,
    comparison: "1-2 is fair",
    status: "neutral",
  },
  {
    name: "EV/EBITDA",
    value: 22.8,
    comparison: "vs Industry 18.4",
    status: "neutral",
  },
];

const PROFITABILITY_METRICS: MetricItem[] = [
  {
    name: "Gross Margin",
    value: "43.3%",
    comparison: "+2.1% YoY",
    status: "good",
  },
  {
    name: "Operating Margin",
    value: "30.7%",
    comparison: "+1.5% YoY",
    status: "good",
  },
  {
    name: "Net Margin",
    value: "25.3%",
    comparison: "+0.8% YoY",
    status: "good",
  },
  {
    name: "ROE",
    value: "147.5%",
    comparison: "vs Industry 28.4%",
    status: "good",
  },
  {
    name: "ROA",
    value: "28.1%",
    comparison: "vs Industry 12.3%",
    status: "good",
  },
  { name: "ROIC", value: "52.4%", comparison: "vs WACC 8.2%", status: "good" },
];

const GROWTH_METRICS: MetricItem[] = [
  {
    name: "Revenue Growth (YoY)",
    value: "+8.5%",
    comparison: "vs Industry +5.2%",
    status: "good",
  },
  {
    name: "EPS Growth (YoY)",
    value: "+11.2%",
    comparison: "vs Industry +7.8%",
    status: "good",
  },
  {
    name: "Revenue Growth (5Y)",
    value: "+12.4%",
    comparison: "CAGR",
    status: "good",
  },
  {
    name: "EPS Growth (5Y)",
    value: "+18.7%",
    comparison: "CAGR",
    status: "good",
  },
];

const FINANCIAL_HEALTH: MetricItem[] = [
  {
    name: "Current Ratio",
    value: 0.94,
    comparison: "> 1.5 ideal",
    status: "warning",
  },
  {
    name: "Quick Ratio",
    value: 0.85,
    comparison: "> 1.0 ideal",
    status: "warning",
  },
  {
    name: "Debt/Equity",
    value: 1.87,
    comparison: "< 1.0 ideal",
    status: "warning",
  },
  {
    name: "Interest Coverage",
    value: 42.5,
    comparison: "> 3 is safe",
    status: "good",
  },
  {
    name: "Cash/Debt",
    value: "0.43",
    comparison: "Higher is better",
    status: "neutral",
  },
];

const DIVIDEND_INFO = {
  yield: "0.52%",
  annualDividend: "$0.96",
  payoutRatio: "15.3%",
  dividendGrowth: "+5.8%",
  exDividendDate: "Feb 9, 2026",
  paymentDate: "Feb 15, 2026",
};

const PEER_COMPARISON = [
  { label: "AAPL", value: 85 },
  { label: "MSFT", value: 78 },
  { label: "GOOGL", value: 72 },
  { label: "AMZN", value: 68 },
  { label: "META", value: 74 },
];

const REVENUE_BREAKDOWN = [
  { label: "iPhone", value: 52, color: theme.colors.primary },
  { label: "Services", value: 22, color: theme.colors.success },
  { label: "Mac", value: 10, color: theme.colors.warning },
  { label: "iPad", value: 8, color: theme.colors.error },
  { label: "Wearables", value: 8, color: "#8B5CF6" },
];

export default function FundamentalAnalysisScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [activeSection, setActiveSection] = useState("valuation");

  const sections = [
    { id: "valuation", label: "Valuation" },
    { id: "profitability", label: "Profit" },
    { id: "growth", label: "Growth" },
    { id: "health", label: "Health" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return theme.colors.success;
      case "warning":
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return "checkmark-circle";
      case "warning":
        return "alert-circle";
      default:
        return "remove-circle";
    }
  };

  const renderMetricSection = (metrics: MetricItem[], title: string) => (
    <Card style={styles.metricsCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {metrics.map((metric, idx) => (
        <View key={idx} style={styles.metricRow}>
          <View style={styles.metricInfo}>
            <Text style={styles.metricName}>{metric.name}</Text>
            {metric.comparison && (
              <Text style={styles.metricComparison}>{metric.comparison}</Text>
            )}
          </View>
          <View style={styles.metricRight}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Ionicons
              name={
                getStatusIcon(metric.status) as keyof typeof Ionicons.glyphMap
              }
              size={18}
              color={getStatusColor(metric.status)}
            />
          </View>
        </View>
      ))}
    </Card>
  );

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
          <Text style={styles.title}>Fundamental Analysis</Text>
          <Text style={styles.symbol}>{symbol || "AAPL"}</Text>
        </View>

        {/* Fair Value Card */}
        <Card style={styles.fairValueCard}>
          <View style={styles.fairValueHeader}>
            <Text style={styles.fairValueLabel}>Fair Value Estimate</Text>
            <View style={styles.fairValueBadge}>
              <Text style={styles.fairValueBadgeText}>Overvalued by 12%</Text>
            </View>
          </View>
          <View style={styles.fairValueRow}>
            <View style={styles.fairValueItem}>
              <Text style={styles.fairValuePrice}>$160.50</Text>
              <Text style={styles.fairValueDesc}>Fair Value</Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.fairValueItem}>
              <Text
                style={[styles.fairValuePrice, { color: theme.colors.warning }]}
              >
                $180.25
              </Text>
              <Text style={styles.fairValueDesc}>Current Price</Text>
            </View>
          </View>
          <View style={styles.fairValueMethods}>
            <Text style={styles.methodsLabel}>Valuation Methods:</Text>
            <View style={styles.methodsList}>
              <Text style={styles.methodItem}>DCF: $155</Text>
              <Text style={styles.methodItem}>Comps: $168</Text>
              <Text style={styles.methodItem}>Earnings: $158</Text>
            </View>
          </View>
        </Card>

        {/* Section Tabs */}
        <View style={styles.tabContainer}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.tab,
                activeSection === section.id && styles.tabActive,
              ]}
              onPress={() => setActiveSection(section.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeSection === section.id && styles.tabTextActive,
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metrics Sections */}
        {activeSection === "valuation" &&
          renderMetricSection(VALUATION_METRICS, "Valuation Metrics")}
        {activeSection === "profitability" &&
          renderMetricSection(PROFITABILITY_METRICS, "Profitability Metrics")}
        {activeSection === "growth" &&
          renderMetricSection(GROWTH_METRICS, "Growth Metrics")}
        {activeSection === "health" &&
          renderMetricSection(FINANCIAL_HEALTH, "Financial Health")}

        {/* Revenue Breakdown */}
        <Card style={styles.revenueCard}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <DonutChart
            data={REVENUE_BREAKDOWN}
            size={180}
            strokeWidth={30}
            centerValue="$394B"
            centerLabel="Revenue"
          />
        </Card>

        {/* Peer Comparison */}
        <Card style={styles.peerCard}>
          <Text style={styles.sectionTitle}>Peer Comparison Score</Text>
          <Text style={styles.peerSubtitle}>
            Overall fundamental strength vs peers
          </Text>
          <BarChart
            data={PEER_COMPARISON}
            height={200}
            showLabels
            barColor={theme.colors.primary}
            horizontal
          />
        </Card>

        {/* Dividend Info */}
        <Card style={styles.dividendCard}>
          <View style={styles.dividendHeader}>
            <Ionicons
              name="cash-outline"
              size={24}
              color={theme.colors.success}
            />
            <Text style={styles.sectionTitle}>Dividend Information</Text>
          </View>
          <View style={styles.dividendGrid}>
            <View style={styles.dividendItem}>
              <Text style={styles.dividendValue}>{DIVIDEND_INFO.yield}</Text>
              <Text style={styles.dividendLabel}>Yield</Text>
            </View>
            <View style={styles.dividendItem}>
              <Text style={styles.dividendValue}>
                {DIVIDEND_INFO.annualDividend}
              </Text>
              <Text style={styles.dividendLabel}>Annual</Text>
            </View>
            <View style={styles.dividendItem}>
              <Text style={styles.dividendValue}>
                {DIVIDEND_INFO.payoutRatio}
              </Text>
              <Text style={styles.dividendLabel}>Payout Ratio</Text>
            </View>
            <View style={styles.dividendItem}>
              <Text style={styles.dividendValue}>
                {DIVIDEND_INFO.dividendGrowth}
              </Text>
              <Text style={styles.dividendLabel}>5Y Growth</Text>
            </View>
          </View>
          <View style={styles.dividendDates}>
            <Text style={styles.dividendDateText}>
              Ex-Dividend: {DIVIDEND_INFO.exDividendDate}
            </Text>
            <Text style={styles.dividendDateText}>
              Payment: {DIVIDEND_INFO.paymentDate}
            </Text>
          </View>
        </Card>

        {/* Key Takeaways */}
        <Card style={styles.takeawaysCard}>
          <Text style={styles.sectionTitle}>Key Takeaways</Text>
          <View style={styles.takeawayItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.takeawayText}>
              Strong profitability with industry-leading margins
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.takeawayText}>
              Consistent revenue and earnings growth
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.takeawayText}>
              Valuation appears stretched vs historical averages
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.takeawayText}>
              Leverage has increased in recent years
            </Text>
          </View>
        </Card>

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
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  symbol: { fontSize: 16, fontWeight: "600", color: theme.colors.primary },

  fairValueCard: { marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  fairValueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  fairValueLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  fairValueBadge: {
    backgroundColor: theme.colors.warning + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fairValueBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  fairValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  fairValueItem: { alignItems: "center" },
  fairValuePrice: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.success,
  },
  fairValueDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  fairValueMethods: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  methodsLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  methodsList: { flexDirection: "row", justifyContent: "space-around" },
  methodItem: { fontSize: 13, fontWeight: "500", color: theme.colors.text },

  tabContainer: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },

  metricsCard: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metricInfo: { flex: 1 },
  metricName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  metricComparison: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  metricRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricValue: { fontSize: 14, fontWeight: "600", color: theme.colors.text },

  revenueCard: { marginBottom: theme.spacing.md, alignItems: "center" },
  peerCard: { marginBottom: theme.spacing.md },
  peerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },

  dividendCard: { marginBottom: theme.spacing.md },
  dividendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dividendGrid: { flexDirection: "row", flexWrap: "wrap" },
  dividendItem: { width: "50%", paddingVertical: 8 },
  dividendValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.success,
  },
  dividendLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dividendDates: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dividendDateText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },

  takeawaysCard: { marginBottom: theme.spacing.md },
  takeawayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  takeawayText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
