import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";

export default function LoanCalculatorScreen() {
  const router = useRouter();
  const [loanAmount, setLoanAmount] = useState("50000");
  const [interestRate, setInterestRate] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("10");
  const [income, setIncome] = useState("60000");

  const calculations = useMemo(() => {
    const principal = parseFloat(loanAmount) || 0;
    const rate = (parseFloat(interestRate) || 0) / 100 / 12;
    const months = (parseFloat(loanTerm) || 1) * 12;
    const annualIncome = parseFloat(income) || 0;

    // Standard repayment
    const standardPayment =
      rate > 0
        ? (principal * rate * Math.pow(1 + rate, months)) /
          (Math.pow(1 + rate, months) - 1)
        : principal / months;
    const standardTotal = standardPayment * months;
    const standardInterest = standardTotal - principal;

    // IDR estimate (10% of discretionary income)
    const discretionaryIncome = Math.max(0, annualIncome - 22590); // 150% of poverty line
    const idrPayment = (discretionaryIncome * 0.1) / 12;
    const idrMonths = 240; // 20 years
    const idrTotal = idrPayment * idrMonths;
    const idrForgiveness = Math.max(
      0,
      principal + principal * (parseFloat(interestRate) / 100) * 20 - idrTotal,
    );

    // SAVE plan estimate (5% of discretionary income)
    const savePayment = (discretionaryIncome * 0.05) / 12;
    const saveMonths = 240;
    const saveTotal = savePayment * saveMonths;
    const saveForgiveness = Math.max(
      0,
      principal + principal * (parseFloat(interestRate) / 100) * 20 - saveTotal,
    );

    return {
      standard: {
        payment: standardPayment,
        total: standardTotal,
        interest: standardInterest,
      },
      idr: {
        payment: idrPayment,
        total: idrTotal,
        forgiveness: idrForgiveness,
      },
      save: {
        payment: savePayment,
        total: saveTotal,
        forgiveness: saveForgiveness,
      },
    };
  }, [loanAmount, interestRate, loanTerm, income]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Calculator</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Your Loan Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loan Balance</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType="numeric"
                placeholder="50000"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Interest Rate</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="6.5"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loan Term</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={loanTerm}
                onChangeText={setLoanTerm}
                keyboardType="numeric"
                placeholder="10"
              />
              <Text style={styles.inputSuffix}>years</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Annual Income (for IDR)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={income}
                onChangeText={setIncome}
                keyboardType="numeric"
                placeholder="60000"
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Repayment Comparison</Text>

        <View style={styles.resultCard}>
          <View style={[styles.resultHeader, { backgroundColor: "#2196F3" }]}>
            <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
            <Text style={styles.resultTitle}>Standard Repayment</Text>
          </View>
          <View style={styles.resultBody}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Monthly Payment</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(calculations.standard.payment)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Interest</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(calculations.standard.interest)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Cost</Text>
              <Text style={[styles.resultValue, styles.resultTotal]}>
                {formatCurrency(calculations.standard.total)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.resultCard}>
          <View style={[styles.resultHeader, { backgroundColor: "#4CAF50" }]}>
            <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
            <Text style={styles.resultTitle}>Income-Driven (IDR)</Text>
          </View>
          <View style={styles.resultBody}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Monthly Payment</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(calculations.idr.payment)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Est. Forgiveness</Text>
              <Text style={[styles.resultValue, { color: "#4CAF50" }]}>
                {formatCurrency(calculations.idr.forgiveness)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Paid (20 yrs)</Text>
              <Text style={[styles.resultValue, styles.resultTotal]}>
                {formatCurrency(calculations.idr.total)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.resultCard, { marginBottom: 24 }]}>
          <View style={[styles.resultHeader, { backgroundColor: "#FF9800" }]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.resultTitle}>SAVE Plan</Text>
          </View>
          <View style={styles.resultBody}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Monthly Payment</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(calculations.save.payment)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Est. Forgiveness</Text>
              <Text style={[styles.resultValue, { color: "#FF9800" }]}>
                {formatCurrency(calculations.save.forgiveness)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Paid (20 yrs)</Text>
              <Text style={[styles.resultValue, styles.resultTotal]}>
                {formatCurrency(calculations.save.total)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          * These are estimates only. Actual payments may vary based on your
          specific situation.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  content: { flex: 1, padding: 16 },
  inputSection: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightTheme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  inputPrefix: {
    paddingLeft: 12,
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
  },
  inputSuffix: {
    paddingRight: 12,
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
  },
  input: { flex: 1, padding: 12, fontSize: 16, color: lightTheme.colors.text },
  resultCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  resultTitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  resultBody: { padding: 16 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resultLabel: { fontSize: 14, color: lightTheme.colors.textSecondary },
  resultValue: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  resultTotal: { fontSize: 16, color: lightTheme.colors.primary },
  disclaimer: {
    fontSize: 12,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
});
