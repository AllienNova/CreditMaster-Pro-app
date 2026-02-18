import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import type { StudentLoan } from "../../src/types";

export default function LoansScreen() {
  const [loans, setLoans] = useState<StudentLoan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoans = async () => {
    setLoans([
      {
        id: "1",
        user_id: "1",
        servicer: "Nelnet",
        loan_type: "federal",
        original_balance: 45000,
        current_balance: 38500,
        interest_rate: 4.5,
        monthly_payment: 450,
        status: "current",
      },
      {
        id: "2",
        user_id: "1",
        servicer: "Great Lakes",
        loan_type: "federal",
        original_balance: 25000,
        current_balance: 22000,
        interest_rate: 5.0,
        monthly_payment: 280,
        status: "current",
      },
      {
        id: "3",
        user_id: "1",
        servicer: "Sallie Mae",
        loan_type: "private",
        original_balance: 15000,
        current_balance: 12500,
        interest_rate: 7.5,
        monthly_payment: 200,
        status: "current",
      },
    ]);
  };

  useEffect(() => {
    fetchLoans();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  };

  const totalBalance = loans.reduce((sum, l) => sum + l.current_balance, 0);
  const totalMonthly = loans.reduce((sum, l) => sum + l.monthly_payment, 0);
  const avgRate = loans.length
    ? loans.reduce((sum, l) => sum + l.interest_rate, 0) / loans.length
    : 0;

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Student Loans</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/loans/add" as never)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Balance</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalBalance)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>
              {formatCurrency(totalMonthly)}
            </Text>
            <Text style={styles.summaryItemLabel}>Monthly Payment</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{avgRate.toFixed(1)}%</Text>
            <Text style={styles.summaryItemLabel}>Avg. Interest</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{loans.length}</Text>
            <Text style={styles.summaryItemLabel}>Total Loans</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        {[
          {
            icon: "calculator",
            label: "Calculator",
            route: "/loans/calculator",
          },
          { icon: "school", label: "Programs", route: "/loans/programs" },
          {
            icon: "trending-down",
            label: "Refinance",
            route: "/loans/refinance",
          },
        ].map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionCard}
            onPress={() => router.push(action.route as never)}
          >
            <Ionicons
              name={action.icon as keyof typeof Ionicons.glyphMap}
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Federal Programs Banner */}
      <TouchableOpacity
        style={styles.programBanner}
        onPress={() => router.push("/loans/programs" as never)}
      >
        <View style={styles.programIcon}>
          <Ionicons name="ribbon" size={28} color={theme.colors.success} />
        </View>
        <View style={styles.programContent}>
          <Text style={styles.programTitle}>Federal Forgiveness Programs</Text>
          <Text style={styles.programDesc}>
            Check your eligibility for PSLF, IDR, and more
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Loans List */}
      <Text style={styles.sectionTitle}>Your Loans</Text>
      {loans.map((loan) => (
        <TouchableOpacity
          key={loan.id}
          style={styles.loanCard}
          onPress={() => router.push(`/loans/${loan.id}` as never)}
        >
          <View style={styles.loanHeader}>
            <View>
              <Text style={styles.loanServicer}>{loan.servicer}</Text>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor:
                      loan.loan_type === "federal" ? "#DBEAFE" : "#FEF3C7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        loan.loan_type === "federal" ? "#2563EB" : "#D97706",
                    },
                  ]}
                >
                  {loan.loan_type.charAt(0).toUpperCase() +
                    loan.loan_type.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.loanBalance}>
              <Text style={styles.balanceValue}>
                {formatCurrency(loan.current_balance)}
              </Text>
              <Text style={styles.balanceLabel}>Balance</Text>
            </View>
          </View>
          <View style={styles.loanDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Interest Rate</Text>
              <Text style={styles.detailValue}>{loan.interest_rate}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Monthly Payment</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(loan.monthly_payment)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      loan.status === "current"
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
              </Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((loan.original_balance - loan.current_balance) / loan.original_balance) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(
                ((loan.original_balance - loan.current_balance) /
                  loan.original_balance) *
                  100,
              )}
              % paid off
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  summaryLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginVertical: 8,
  },
  summaryRow: { flexDirection: "row", marginTop: theme.spacing.md },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryItemValue: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  summaryItemLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)" },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 4,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  actionLabel: { fontSize: 12, color: theme.colors.text, marginTop: 6 },
  programBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  programContent: { flex: 1 },
  programTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  programDesc: { fontSize: 12, color: theme.colors.textSecondary },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  loanCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  loanServicer: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  typeText: { fontSize: 11, fontWeight: "600" },
  loanBalance: { alignItems: "flex-end" },
  balanceValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  balanceLabel: { fontSize: 11, color: theme.colors.textSecondary },
  loanDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  detailItem: {},
  detailLabel: { fontSize: 11, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  progressContainer: { flexDirection: "row", alignItems: "center" },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginRight: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.success,
    borderRadius: 3,
  },
  progressText: { fontSize: 11, color: theme.colors.textSecondary },
});
