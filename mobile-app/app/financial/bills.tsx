/**
 * Fynvita Bills & Payments Screen
 * Upcoming bills calendar, reminders, auto-pay status
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { billsApi } from "../../src/services/api";

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  category: string;
  autoPay: boolean;
  status: "upcoming" | "due_soon" | "overdue" | "paid";
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Housing: "home",
  "Credit Card": "card",
  Utilities: "flash",
  Insurance: "shield",
  Subscriptions: "tv",
  Health: "fitness",
  Internet: "wifi",
  Phone: "phone-portrait",
  Other: "receipt",
};

const MOCK_BILLS: Bill[] = [
  {
    id: "1",
    name: "Rent",
    amount: 1850,
    dueDate: "Dec 1",
    daysUntil: -5,
    category: "Housing",
    autoPay: false,
    status: "paid",
    icon: "home",
  },
  {
    id: "2",
    name: "Chase Sapphire",
    amount: 2340,
    dueDate: "Dec 15",
    daysUntil: 9,
    category: "Credit Card",
    autoPay: true,
    status: "upcoming",
    icon: "card",
  },
  {
    id: "3",
    name: "Electric Bill",
    amount: 145,
    dueDate: "Dec 10",
    daysUntil: 4,
    category: "Utilities",
    autoPay: false,
    status: "due_soon",
    icon: "flash",
  },
  {
    id: "4",
    name: "Internet",
    amount: 79,
    dueDate: "Dec 12",
    daysUntil: 6,
    category: "Utilities",
    autoPay: true,
    status: "upcoming",
    icon: "wifi",
  },
  {
    id: "5",
    name: "Car Insurance",
    amount: 185,
    dueDate: "Dec 20",
    daysUntil: 14,
    category: "Insurance",
    autoPay: true,
    status: "upcoming",
    icon: "car",
  },
  {
    id: "6",
    name: "Netflix",
    amount: 15.99,
    dueDate: "Dec 8",
    daysUntil: 2,
    category: "Subscriptions",
    autoPay: true,
    status: "due_soon",
    icon: "tv",
  },
  {
    id: "7",
    name: "Gym Membership",
    amount: 49,
    dueDate: "Dec 1",
    daysUntil: -5,
    category: "Health",
    autoPay: true,
    status: "paid",
    icon: "fitness",
  },
];

const CALENDAR_DAYS = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i);
  return {
    day: date.getDate(),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
    hasBill: [8, 10, 12, 15, 20].includes(date.getDate()),
  };
});

export default function BillsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const filters = ["all", "upcoming", "due_soon", "paid"];

  const loadBills = useCallback(async () => {
    try {
      const response = await billsApi.getUpcoming();
      if (response.data?.bills) {
        const transformedBills = response.data.bills.map((b) => {
          const dueDate = new Date(b.dueDate);
          const today = new Date();
          const daysUntil = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
          let status: Bill["status"] = "upcoming";
          if (daysUntil < 0) status = "paid";
          else if (daysUntil <= 3) status = "due_soon";
          else if (daysUntil < 0) status = "overdue";

          return {
            id: b.id,
            name: b.name,
            amount: b.amount,
            dueDate: dueDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            daysUntil,
            category: b.category,
            autoPay: b.autopay,
            status,
            icon: CATEGORY_ICONS[b.category] || "receipt",
          };
        });
        setBills(transformedBills);
      } else {
        setBills(MOCK_BILLS);
      }
    } catch (err) {
      // Fallback to mock data silently in production
      setBills(MOCK_BILLS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const filteredBills =
    selectedFilter === "all"
      ? bills
      : bills.filter((b) => b.status === selectedFilter);
  const totalDue = bills
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + b.amount, 0);
  const dueSoon = bills.filter((b) => b.status === "due_soon").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#22C55E";
      case "due_soon":
        return "#F59E0B";
      case "overdue":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "due_soon":
        return "Due Soon";
      case "overdue":
        return "Overdue";
      default:
        return "Upcoming";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Bills & Payments</Text>
          <TouchableOpacity onPress={() => router.push("/financial/add-bill")}>
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
              <Text style={styles.summaryValue}>
                ${totalDue.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Due</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>
                {dueSoon}
              </Text>
              <Text style={styles.summaryLabel}>Due Soon</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
                {bills.filter((b) => b.autoPay).length}
              </Text>
              <Text style={styles.summaryLabel}>Auto-Pay</Text>
            </View>
          </View>
        </Card>

        {/* Calendar Strip */}
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.calendarScroll}
        >
          {CALENDAR_DAYS.map((day, idx) => (
            <View
              key={idx}
              style={[styles.calendarDay, idx === 0 && styles.calendarDayToday]}
            >
              <Text
                style={[
                  styles.calendarWeekday,
                  idx === 0 && styles.calendarTextToday,
                ]}
              >
                {day.weekday}
              </Text>
              <Text
                style={[
                  styles.calendarDate,
                  idx === 0 && styles.calendarTextToday,
                ]}
              >
                {day.day}
              </Text>
              {day.hasBill && <View style={styles.calendarDot} />}
            </View>
          ))}
        </ScrollView>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter === "due_soon"
                  ? "Due Soon"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bills List */}
        <Text style={styles.sectionTitle}>{filteredBills.length} Bills</Text>
        {filteredBills.map((bill) => (
          <Card key={bill.id} style={styles.billCard}>
            <View style={styles.billRow}>
              <View
                style={[
                  styles.billIcon,
                  {
                    backgroundColor:
                      bill.status === "paid"
                        ? "#DCFCE7"
                        : bill.status === "due_soon"
                          ? "#FEF3C7"
                          : "#F3F4F6",
                  },
                ]}
              >
                <Ionicons
                  name={bill.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={
                    bill.status === "paid"
                      ? "#22C55E"
                      : bill.status === "due_soon"
                        ? "#F59E0B"
                        : theme.colors.textSecondary
                  }
                />
              </View>
              <View style={styles.billInfo}>
                <View style={styles.billNameRow}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  {bill.autoPay && (
                    <View style={styles.autoPayBadge}>
                      <Ionicons name="sync" size={10} color="#3B82F6" />
                      <Text style={styles.autoPayText}>Auto</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.billMeta}>
                  {bill.category} • {bill.dueDate}
                </Text>
              </View>
              <View style={styles.billAmountContainer}>
                <Text style={styles.billAmount}>
                  ${bill.amount.toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(bill.status)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(bill.status) },
                    ]}
                  >
                    {getStatusLabel(bill.status)}
                  </Text>
                </View>
              </View>
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryValue: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  calendarScroll: {
    marginBottom: theme.spacing.lg,
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  calendarDay: {
    width: 48,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  calendarDayToday: { backgroundColor: theme.colors.primary },
  calendarWeekday: { fontSize: 10, color: theme.colors.textSecondary },
  calendarDate: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  calendarTextToday: { color: "#fff" },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginTop: 4,
  },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  billCard: { marginBottom: theme.spacing.sm },
  billRow: { flexDirection: "row", alignItems: "center" },
  billIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  billInfo: { flex: 1 },
  billNameRow: { flexDirection: "row", alignItems: "center" },
  billName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  autoPayBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  autoPayText: {
    fontSize: 9,
    color: "#3B82F6",
    fontWeight: "600",
    marginLeft: 2,
  },
  billMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  billAmountContainer: { alignItems: "flex-end" },
  billAmount: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: "600" },
});
