/**
 * Fynvita Income Screen
 * Income sources, trends, and tax estimates
 */

import React, { useState } from "react";
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
import { Card } from "../../src/components/Card";

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "annual";
  type: "salary" | "freelance" | "investment" | "rental" | "other";
  taxWithheld: number;
}

const INCOME_SOURCES: IncomeSource[] = [
  {
    id: "1",
    name: "Primary Job",
    amount: 4800,
    frequency: "monthly",
    type: "salary",
    taxWithheld: 960,
  },
  {
    id: "2",
    name: "Freelance Work",
    amount: 800,
    frequency: "monthly",
    type: "freelance",
    taxWithheld: 0,
  },
  {
    id: "3",
    name: "Dividend Income",
    amount: 150,
    frequency: "monthly",
    type: "investment",
    taxWithheld: 22,
  },
  {
    id: "4",
    name: "Rental Property",
    amount: 1200,
    frequency: "monthly",
    type: "rental",
    taxWithheld: 0,
  },
];

const INCOME_HISTORY = [
  { month: "Jul", gross: 6800, net: 5200 },
  { month: "Aug", gross: 7200, net: 5500 },
  { month: "Sep", gross: 6950, net: 5300 },
  { month: "Oct", gross: 7100, net: 5450 },
  { month: "Nov", gross: 7500, net: 5750 },
  { month: "Dec", gross: 6950, net: 5300 },
];

const getSourceIcon = (
  type: IncomeSource["type"],
): keyof typeof Ionicons.glyphMap => {
  const icons: Record<IncomeSource["type"], keyof typeof Ionicons.glyphMap> = {
    salary: "briefcase",
    freelance: "laptop",
    investment: "trending-up",
    rental: "home",
    other: "cash",
  };
  return icons[type];
};

const getSourceColor = (type: IncomeSource["type"]): string => {
  const colors: Record<IncomeSource["type"], string> = {
    salary: "#22C55E",
    freelance: "#3B82F6",
    investment: "#8B5CF6",
    rental: "#F59E0B",
    other: "#6B7280",
  };
  return colors[type];
};

const getFrequencyLabel = (freq: IncomeSource["frequency"]): string => {
  const labels: Record<IncomeSource["frequency"], string> = {
    weekly: "/week",
    biweekly: "/2 weeks",
    monthly: "/month",
    annual: "/year",
  };
  return labels[freq];
};

export default function IncomeScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const periods = ["weekly", "monthly", "annual"];

  const totalMonthlyGross = INCOME_SOURCES.reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const totalMonthlyTax = INCOME_SOURCES.reduce(
    (sum, s) => sum + s.taxWithheld,
    0,
  );
  const totalMonthlyNet = totalMonthlyGross - totalMonthlyTax;
  const effectiveTaxRate = (
    (totalMonthlyTax / totalMonthlyGross) *
    100
  ).toFixed(1);
  const maxIncome = Math.max(...INCOME_HISTORY.map((h) => h.gross));

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
          <Text style={styles.title}>Income</Text>
          <TouchableOpacity>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gross</Text>
              <Text style={styles.summaryValue}>
                ${totalMonthlyGross.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Taxes</Text>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                -${totalMonthlyTax.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
                ${totalMonthlyNet.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.taxRateRow}>
            <Text style={styles.taxRateLabel}>Effective Tax Rate</Text>
            <Text style={styles.taxRateValue}>{effectiveTaxRate}%</Text>
          </View>
        </Card>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.periodChipActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Income Trend Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>6-Month Trend</Text>
          <View style={styles.chartContainer}>
            {INCOME_HISTORY.map((month) => (
              <View key={month.month} style={styles.chartColumn}>
                <View style={styles.barGroup}>
                  <View
                    style={[
                      styles.grossBar,
                      { height: (month.gross / maxIncome) * 70 },
                    ]}
                  />
                  <View
                    style={[
                      styles.netBar,
                      { height: (month.net / maxIncome) * 70 },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{month.month}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <Text style={styles.legendText}>Gross</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
              />
              <Text style={styles.legendText}>Net</Text>
            </View>
          </View>
        </Card>

        {/* Income Sources */}
        <Text style={styles.sectionTitle}>Income Sources</Text>
        {INCOME_SOURCES.map((source) => {
          const color = getSourceColor(source.type);
          const percent = ((source.amount / totalMonthlyGross) * 100).toFixed(
            0,
          );
          return (
            <Card key={source.id} style={styles.sourceCard}>
              <View style={styles.sourceRow}>
                <View
                  style={[styles.sourceIcon, { backgroundColor: `${color}15` }]}
                >
                  <Ionicons
                    name={getSourceIcon(source.type)}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceType}>
                    {source.type} • {percent}% of income
                  </Text>
                </View>
                <View style={styles.sourceValues}>
                  <Text style={styles.sourceAmount}>
                    ${source.amount.toLocaleString()}
                    {getFrequencyLabel(source.frequency)}
                  </Text>
                  {source.taxWithheld > 0 && (
                    <Text style={styles.sourceTax}>
                      -${source.taxWithheld} tax
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          );
        })}

        {/* Tax Estimate */}
        <Card style={styles.taxCard}>
          <View style={styles.taxHeader}>
            <Ionicons
              name="calculator"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.taxTitle}>Annual Tax Estimate</Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Estimated Annual Income</Text>
            <Text style={styles.taxValue}>
              ${(totalMonthlyGross * 12).toLocaleString()}
            </Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={styles.taxLabel}>Estimated Federal Tax</Text>
            <Text style={styles.taxValue}>
              ${(totalMonthlyTax * 12).toLocaleString()}
            </Text>
          </View>
          <View
            style={[
              styles.taxRow,
              {
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingTop: 8,
              },
            ]}
          >
            <Text style={[styles.taxLabel, { fontWeight: "600" }]}>
              Estimated Take-Home
            </Text>
            <Text
              style={[styles.taxValue, { color: "#22C55E", fontWeight: "600" }]}
            >
              ${(totalMonthlyNet * 12).toLocaleString()}
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
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  taxRateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  taxRateLabel: { fontSize: 12, color: theme.colors.textSecondary },
  taxRateValue: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  periodSelector: { flexDirection: "row", marginBottom: theme.spacing.lg },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  periodTextActive: { color: "#fff" },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 90,
  },
  chartColumn: { alignItems: "center" },
  barGroup: { flexDirection: "row", alignItems: "flex-end" },
  grossBar: {
    width: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 2,
  },
  netBar: { width: 12, backgroundColor: "#22C55E", borderRadius: 2 },
  chartLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sourceCard: { marginBottom: theme.spacing.sm },
  sourceRow: { flexDirection: "row", alignItems: "center" },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  sourceType: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sourceValues: { alignItems: "flex-end" },
  sourceAmount: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  sourceTax: { fontSize: 10, color: "#EF4444", marginTop: 2 },
  taxCard: { marginTop: theme.spacing.md },
  taxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  taxTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 8,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  taxLabel: { fontSize: 13, color: theme.colors.textSecondary },
  taxValue: { fontSize: 13, color: theme.colors.text },
});
