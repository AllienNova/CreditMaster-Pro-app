import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

type BillStatus = "paid" | "upcoming" | "overdue";

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STATUS_CONFIG: Record<BillStatus, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "#22C55E", bg: "#DCFCE7" },
  upcoming: { label: "Upcoming", color: "#F59E0B", bg: "#FEF3C7" },
  overdue: { label: "Overdue", color: "#EF4444", bg: "#FEE2E2" },
};

const MOCK_BILLS: Bill[] = [
  {
    id: "1",
    name: "Rent",
    amount: 1500,
    dueDate: "Mar 1",
    status: "paid",
    category: "Housing",
    icon: "home-outline",
  },
  {
    id: "2",
    name: "Electric Bill",
    amount: 125,
    dueDate: "Mar 15",
    status: "overdue",
    category: "Utilities",
    icon: "flash-outline",
  },
  {
    id: "3",
    name: "Internet",
    amount: 79.99,
    dueDate: "Mar 20",
    status: "upcoming",
    category: "Utilities",
    icon: "wifi-outline",
  },
  {
    id: "4",
    name: "Car Insurance",
    amount: 145,
    dueDate: "Mar 25",
    status: "upcoming",
    category: "Insurance",
    icon: "car-outline",
  },
  {
    id: "5",
    name: "Credit Card",
    amount: 350,
    dueDate: "Mar 28",
    status: "upcoming",
    category: "Debt",
    icon: "card-outline",
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function BillsScreen() {
  const totalBills = MOCK_BILLS.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBills = MOCK_BILLS.filter((b) => b.status === "overdue");
  const paidBills = MOCK_BILLS.filter((b) => b.status === "paid");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Tracker</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalBills)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                {paidBills.length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.error }]}>
                {overdueBills.length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Bills List */}
        {MOCK_BILLS.map((bill) => {
          const statusConfig = STATUS_CONFIG[bill.status];
          return (
            <TouchableOpacity key={bill.id} activeOpacity={0.7}>
              <Card style={styles.billCard}>
                <View style={styles.billRow}>
                  <View style={styles.billIconContainer}>
                    <Ionicons
                      name={bill.icon}
                      size={22}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.billContent}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billCategory}>
                      {bill.category} &middot; Due {bill.dueDate}
                    </Text>
                  </View>
                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>
                      {formatCurrency(bill.amount)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusConfig.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusConfig.color }]}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  billCard: {
    marginBottom: theme.spacing.sm,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  billIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  billContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  billName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  billCategory: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
  },
  billAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
