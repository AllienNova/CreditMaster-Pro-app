/**
 * Fynvita Bills & Payments Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real recurring bills from
 * GET /api/financial/bills (withPermission "financial:read") via billsApi.getBills,
 * adapted web -> mobile by mapWebBill (BillItem: merchant / amount / dueDate /
 * category / isAutoPay). Fetch on mount with honest inline loading / error+retry /
 * empty states and pull-to-refresh.
 *
 * The former hardcoded MOCK_BILLS array and its silent catch-fallback were removed:
 * on a failed fetch the screen shows an honest error + retry, never fabricated bills.
 * A per-bill "paid" status and the hardcoded calendar dots ([8,10,12,15,20]) were
 * also removed. Whether a bill is PAID is payment history (BillPayment.isLate in
 * src/lib/financial/types/bill.types.ts), which no HTTP route exposes — it has no
 * honest source, so it is omitted rather than invented. The only per-bill status
 * shown is derived from the real nextDueDate (upcoming / due_soon / overdue), and the
 * calendar dots are derived from real due dates.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { billsApi } from "../../src/services/api/financial";
import type { BillItem } from "../../src/services/api/financial";
import { toArray } from "../../src/store/toArray";

// Status derived from the real nextDueDate. There is intentionally no "paid":
// payment history is not exposed over HTTP, so it has no honest source.
type DerivedStatus = "upcoming" | "due_soon" | "overdue";

// Ionicons keyed by the real BillCategory enum (snake_case) from
// src/lib/financial/types/bill.types.ts. An unknown/empty category falls back to a
// neutral receipt icon — this maps a real value to a glyph, it never invents data.
const CATEGORY_ICONS: Record<string, string> = {
  utilities: "flash",
  rent: "home",
  mortgage: "home",
  insurance: "shield",
  subscription: "card",
  loan: "cash",
  credit_card: "card",
  phone: "phone-portrait",
  internet: "wifi",
  streaming: "tv",
  other: "receipt",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface DisplayBill {
  id: string;
  merchant: string;
  amount: number;
  dueLabel: string;
  dueDate: Date | null;
  category: string;
  autoPay: boolean;
  status: DerivedStatus;
  icon: string;
}

// dueDate arrives as an ISO string (or "" when the record has no due date).
// Returns null for a missing/unparseable value rather than an Invalid Date.
function parseDueDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntilDue(due: Date | null, now: number): number | null {
  if (!due) return null;
  return Math.ceil((due.getTime() - now) / MS_PER_DAY);
}

function statusFor(daysUntil: number | null): DerivedStatus {
  if (daysUntil === null) return "upcoming";
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 3) return "due_soon";
  return "upcoming";
}

function formatDueLabel(due: Date | null): string {
  if (!due) return "No due date";
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// category is a snake_case enum (credit_card, ...); show it with spaces. This only
// reformats the real value — it never invents one.
function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

function toDisplayBill(b: BillItem, now: number): DisplayBill {
  const dueDate = parseDueDate(b.dueDate);
  return {
    id: b.id,
    merchant: b.merchant,
    amount: b.amount,
    dueLabel: formatDueLabel(dueDate),
    dueDate,
    category: b.category,
    autoPay: b.isAutoPay,
    status: statusFor(daysUntilDue(dueDate, now)),
    icon: CATEGORY_ICONS[b.category] ?? "receipt",
  };
}

export default function BillsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<BillItem[]>([]);
  const filters = ["all", "upcoming", "due_soon", "overdue"];

  const fetchBills = useCallback(async () => {
    const res = await billsApi.getBills();
    if (res.success && res.data) {
      setBills(toArray<BillItem>(res?.data?.bills));
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load bills.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchBills();
    } finally {
      setLoading(false);
    }
  }, [fetchBills]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  // Derived once per fetch (bills change). `now` is captured at compute time so the
  // status buckets are stable within a render pass.
  const displayBills = useMemo<DisplayBill[]>(() => {
    const now = Date.now();
    return bills.map((b) => toDisplayBill(b, now));
  }, [bills]);

  // Calendar dots come from the real due dates that fall inside the 14-day window,
  // not a hardcoded set of days.
  const calendarDays = useMemo(() => {
    const dueKeys = new Set(
      displayBills
        .map((b) => b.dueDate)
        .filter((d): d is Date => d !== null)
        .map((d) => d.toDateString()),
    );
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return {
        day: date.getDate(),
        weekday: WEEKDAYS[date.getDay()],
        hasBill: dueKeys.has(date.toDateString()),
      };
    });
  }, [displayBills]);

  const filteredBills =
    selectedFilter === "all"
      ? displayBills
      : displayBills.filter((b) => b.status === selectedFilter);

  // Summary — all computed from real bills. No "paid" state exists, so every active
  // recurring bill counts toward Total Due.
  const totalDue = displayBills.reduce((sum, b) => sum + b.amount, 0);
  const dueSoon = displayBills.filter((b) => b.status === "due_soon").length;
  const autoPayCount = displayBills.filter((b) => b.autoPay).length;

  const getStatusColor = (status: DerivedStatus) => {
    switch (status) {
      case "due_soon":
        return "#F59E0B";
      case "overdue":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: DerivedStatus) => {
    switch (status) {
      case "due_soon":
        return "Due Soon";
      case "overdue":
        return "Overdue";
      default:
        return "Upcoming";
    }
  };

  if (loading && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-bills-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-bills-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => router.push("/financial/bills" as Href)}
          >
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
                {autoPayCount}
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
          {calendarDays.map((day, idx) => (
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
              testID={`bills-filter-${filter}`}
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
        {filteredBills.length === 0 ? (
          <View style={styles.emptyCard} testID="financial-bills-empty">
            <Ionicons
              name="receipt-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No bills to show</Text>
            <Text style={styles.emptyText}>
              Bills you add or that Fynvita detects from your linked accounts will
              show here with their amounts and due dates.
            </Text>
          </View>
        ) : (
          filteredBills.map((bill) => (
            <Card key={bill.id} style={styles.billCard}>
              <View style={styles.billRow}>
                <View
                  style={[
                    styles.billIcon,
                    {
                      backgroundColor:
                        bill.status === "due_soon"
                          ? "#FEF3C7"
                          : bill.status === "overdue"
                            ? "#FEE2E2"
                            : "#F3F4F6",
                    },
                  ]}
                >
                  <Ionicons
                    name={bill.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={getStatusColor(bill.status)}
                  />
                </View>
                <View style={styles.billInfo}>
                  <View style={styles.billNameRow}>
                    <Text style={styles.billName}>
                      {bill.merchant || "Unnamed bill"}
                    </Text>
                    {bill.autoPay && (
                      <View style={styles.autoPayBadge}>
                        <Ionicons name="sync" size={10} color="#3B82F6" />
                        <Text style={styles.autoPayText}>Auto</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.billMeta}>
                    {bill.category
                      ? `${formatCategory(bill.category)} • ${bill.dueLabel}`
                      : bill.dueLabel}
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
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
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
  billMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  billAmountContainer: { alignItems: "flex-end" },
  billAmount: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: "600" },
  emptyCard: { alignItems: "center", padding: theme.spacing.xl },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
