/**
 * Fynvita Credit Age Screen
 * Manage account age for credit score
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
import { Card } from "../../src/components/Card";

interface Account {
  id: string;
  name: string;
  type: string;
  openDate: string;
  ageYears: number;
  ageMonths: number;
  status: "open" | "closed";
}

const MOCK_ACCOUNTS: Account[] = [
  {
    id: "1",
    name: "Chase Freedom",
    type: "Credit Card",
    openDate: "2015-03-15",
    ageYears: 9,
    ageMonths: 10,
    status: "open",
  },
  {
    id: "2",
    name: "Capital One",
    type: "Credit Card",
    openDate: "2018-07-20",
    ageYears: 6,
    ageMonths: 6,
    status: "open",
  },
  {
    id: "3",
    name: "Discover It",
    type: "Credit Card",
    openDate: "2020-01-10",
    ageYears: 5,
    ageMonths: 0,
    status: "open",
  },
  {
    id: "4",
    name: "Auto Loan",
    type: "Installment",
    openDate: "2022-06-01",
    ageYears: 2,
    ageMonths: 7,
    status: "open",
  },
  {
    id: "5",
    name: "Student Loan",
    type: "Installment",
    openDate: "2014-08-15",
    ageYears: 10,
    ageMonths: 5,
    status: "open",
  },
  {
    id: "6",
    name: "Old Card",
    type: "Credit Card",
    openDate: "2010-01-01",
    ageYears: 15,
    ageMonths: 0,
    status: "closed",
  },
];

const getAgeColor = (years: number) => {
  if (years >= 7) return "#22C55E";
  if (years >= 3) return "#84CC16";
  if (years >= 1) return "#F59E0B";
  return "#EF4444";
};

export default function CreditAgeScreen() {
  const openAccounts = MOCK_ACCOUNTS.filter((a) => a.status === "open");
  const totalMonths = openAccounts.reduce(
    (sum, a) => sum + (a.ageYears * 12 + a.ageMonths),
    0,
  );
  const avgMonths = Math.round(totalMonths / openAccounts.length);
  const avgYears = Math.floor(avgMonths / 12);
  const avgRemMonths = avgMonths % 12;
  const oldestAccount = MOCK_ACCOUNTS.reduce(
    (oldest, a) => (a.ageYears > oldest.ageYears ? a : oldest),
    MOCK_ACCOUNTS[0],
  );
  const newestAccount = openAccounts.reduce(
    (newest, a) => (a.ageYears < newest.ageYears ? a : newest),
    openAccounts[0],
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
          <Text style={styles.title}>Credit Age</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Average Age Card */}
        <Card style={styles.avgCard}>
          <View style={styles.avgCircle}>
            <Text style={[styles.avgValue, { color: getAgeColor(avgYears) }]}>
              {avgYears}y {avgRemMonths}m
            </Text>
            <Text style={styles.avgLabel}>Average Age</Text>
          </View>
          <View style={styles.ageBar}>
            <View
              style={[
                styles.ageFill,
                {
                  width: `${Math.min((avgYears / 10) * 100, 100)}%`,
                  backgroundColor: getAgeColor(avgYears),
                },
              ]}
            />
          </View>
          <View style={styles.ageLegend}>
            <Text style={styles.legendText}>0 years</Text>
            <Text style={styles.legendIdeal}>7+ years ideal</Text>
            <Text style={styles.legendText}>10+ years</Text>
          </View>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="time" size={24} color="#22C55E" />
            <Text style={styles.statValue}>{oldestAccount.ageYears}y</Text>
            <Text style={styles.statLabel}>Oldest Account</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="add-circle" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{newestAccount.ageYears}y</Text>
            <Text style={styles.statLabel}>Newest Account</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="layers" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{openAccounts.length}</Text>
            <Text style={styles.statLabel}>Open Accounts</Text>
          </Card>
        </View>

        {/* Impact Info */}
        <Card style={styles.impactCard}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.impactText}>
            Credit age accounts for 15% of your score. Longer history = better
            score.
          </Text>
        </Card>

        {/* Accounts List */}
        <Text style={styles.sectionTitle}>Your Accounts</Text>
        {MOCK_ACCOUNTS.map((account) => (
          <Card
            key={account.id}
            style={[
              styles.accountCard,
              account.status === "closed" && styles.closedCard,
            ]}
          >
            <View style={styles.accountRow}>
              <View
                style={[
                  styles.accountIcon,
                  { backgroundColor: `${getAgeColor(account.ageYears)}20` },
                ]}
              >
                <Ionicons
                  name={
                    account.type === "Credit Card" ? "card" : "document-text"
                  }
                  size={20}
                  color={getAgeColor(account.ageYears)}
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>
                  {account.type} • Opened{" "}
                  {new Date(account.openDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.accountRight}>
                <Text
                  style={[
                    styles.accountAge,
                    { color: getAgeColor(account.ageYears) },
                  ]}
                >
                  {account.ageYears}y {account.ageMonths}m
                </Text>
                {account.status === "closed" && (
                  <Text style={styles.closedBadge}>Closed</Text>
                )}
              </View>
            </View>
          </Card>
        ))}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to Improve Credit Age</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Keep your oldest accounts open</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Avoid opening many new accounts at once
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Become an authorized user on old accounts
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Use old cards occasionally to keep them active
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
  avgCard: { alignItems: "center", marginBottom: theme.spacing.md },
  avgCircle: { alignItems: "center", marginBottom: theme.spacing.md },
  avgValue: { fontSize: 40, fontWeight: "700" },
  avgLabel: { fontSize: 14, color: theme.colors.textSecondary },
  ageBar: {
    width: "100%",
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
  },
  ageFill: { height: "100%", borderRadius: 6 },
  ageLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  legendIdeal: { fontSize: 12, color: "#22C55E", fontWeight: "500" },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    backgroundColor: `${theme.colors.primary}10`,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  accountCard: { marginBottom: theme.spacing.sm },
  closedCard: { opacity: 0.6 },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  accountType: { fontSize: 12, color: theme.colors.textSecondary },
  accountRight: { alignItems: "flex-end" },
  accountAge: { fontSize: 16, fontWeight: "600" },
  closedBadge: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});
