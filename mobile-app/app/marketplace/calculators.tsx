/**
 * Fynvita Financial Calculators Marketplace Screen
 * Various financial calculators with inline functionality
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import Slider from "@react-native-community/slider";

type CalculatorType = "loan" | "debt" | "utilization" | "mortgage" | "savings";

interface CalculatorOption {
  id: CalculatorType;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const CALCULATOR_OPTIONS: CalculatorOption[] = [
  {
    id: "loan",
    name: "Loan Payment",
    icon: "cash",
    description: "Calculate monthly loan payments",
  },
  {
    id: "debt",
    name: "Debt Payoff",
    icon: "trending-down",
    description: "Plan your debt payoff timeline",
  },
  {
    id: "utilization",
    name: "Utilization",
    icon: "pie-chart",
    description: "Optimize credit utilization",
  },
  {
    id: "mortgage",
    name: "Mortgage",
    icon: "home",
    description: "Estimate mortgage payments",
  },
  {
    id: "savings",
    name: "Savings Goal",
    icon: "wallet",
    description: "Plan your savings timeline",
  },
];

// Loan Payment Calculator Component
function LoanCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(7.5);
  const [term, setTerm] = useState(36);

  const monthlyRate = rate / 100 / 12;
  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, term))) /
    (Math.pow(1 + monthlyRate, term) - 1);
  const totalPaid = payment * term;
  const totalInterest = totalPaid - principal;

  return (
    <View style={styles.calculatorContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Loan Amount: ${principal.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1000}
          maximumValue={100000}
          step={1000}
          value={principal}
          onValueChange={setPrincipal}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Interest Rate: {rate.toFixed(1)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={30}
          step={0.1}
          value={rate}
          onValueChange={setRate}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Term: {term} months</Text>
        <Slider
          style={styles.slider}
          minimumValue={12}
          maximumValue={84}
          step={6}
          value={term}
          onValueChange={setTerm}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.resultsGrid}>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Monthly Payment</Text>
          <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
            ${payment.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Total Interest</Text>
          <Text style={[styles.resultValue, { color: "#EF4444" }]}>
            ${totalInterest.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Total Paid</Text>
          <Text style={styles.resultValue}>${totalPaid.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

// Debt Payoff Calculator Component
function DebtPayoffCalculator() {
  const [balance, setBalance] = useState(5000);
  const [rate, setRate] = useState(18);
  const [payment, setPayment] = useState(200);

  const monthlyRate = rate / 100 / 12;
  let months = 0;
  let totalInterest = 0;
  let remaining = balance;

  while (remaining > 0 && months < 600) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    remaining = remaining + interest - payment;
    months++;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return (
    <View style={styles.calculatorContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Current Balance: ${balance.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={500}
          maximumValue={50000}
          step={500}
          value={balance}
          onValueChange={setBalance}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>APR: {rate.toFixed(1)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={30}
          step={0.5}
          value={rate}
          onValueChange={setRate}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Monthly Payment: ${payment}</Text>
        <Slider
          style={styles.slider}
          minimumValue={50}
          maximumValue={2000}
          step={25}
          value={payment}
          onValueChange={setPayment}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.resultsRow}>
        <View style={[styles.resultItem, { flex: 1 }]}>
          <Text style={styles.resultLabel}>Payoff Time</Text>
          <Text style={[styles.resultValue, { color: "#22C55E" }]}>
            {years}y {remainingMonths}m
          </Text>
        </View>
        <View style={[styles.resultItem, { flex: 1 }]}>
          <Text style={styles.resultLabel}>Total Interest</Text>
          <Text style={[styles.resultValue, { color: "#EF4444" }]}>
            ${totalInterest.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Credit Utilization Calculator Component
function UtilizationCalculator() {
  const [limit, setLimit] = useState(10000);
  const [balance, setBalance] = useState(3000);

  const utilization = (balance / limit) * 100;
  const optimal = limit * 0.3;
  const excellent = limit * 0.1;

  const getUtilizationColor = () => {
    if (utilization <= 10) return "#22C55E";
    if (utilization <= 30) return "#F59E0B";
    return "#EF4444";
  };

  const getUtilizationStatus = () => {
    if (utilization <= 10) return "Excellent";
    if (utilization <= 30) return "Good";
    if (utilization <= 50) return "Fair";
    return "Poor";
  };

  return (
    <View style={styles.calculatorContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Credit Limit: ${limit.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={500}
          maximumValue={50000}
          step={500}
          value={limit}
          onValueChange={setLimit}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Current Balance: ${balance.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={limit}
          step={100}
          value={balance}
          onValueChange={setBalance}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.utilizationDisplay}>
        <View style={styles.utilizationHeader}>
          <Text style={styles.utilizationLabel}>Current Utilization</Text>
          <Text
            style={[styles.utilizationValue, { color: getUtilizationColor() }]}
          >
            {utilization.toFixed(1)}% - {getUtilizationStatus()}
          </Text>
        </View>
        <View style={styles.utilizationBar}>
          <View
            style={[
              styles.utilizationFill,
              {
                width: `${Math.min(utilization, 100)}%`,
                backgroundColor: getUtilizationColor(),
              },
            ]}
          />
        </View>
        <View style={styles.utilizationMarkers}>
          <Text style={styles.markerText}>0%</Text>
          <Text style={[styles.markerText, { color: "#22C55E" }]}>10%</Text>
          <Text style={[styles.markerText, { color: "#F59E0B" }]}>30%</Text>
          <Text style={[styles.markerText, { color: "#EF4444" }]}>100%</Text>
        </View>
      </View>

      <View style={styles.utilizationTips}>
        <View style={styles.tipRow}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.tipRowText}>
            For 30% utilization: Keep balance under ${optimal.toFixed(0)}
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.tipRowText}>
            For 10% utilization: Keep balance under ${excellent.toFixed(0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Mortgage Calculator Component
function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState(300000);
  const [downPayment, setDownPayment] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(30);

  const downPaymentAmount = homePrice * (downPayment / 100);
  const loanAmount = homePrice - downPaymentAmount;
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;

  const payment =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPaid = payment * numPayments;
  const totalInterest = totalPaid - loanAmount;

  return (
    <View style={styles.calculatorContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Home Price: ${homePrice.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={100000}
          maximumValue={1000000}
          step={10000}
          value={homePrice}
          onValueChange={setHomePrice}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Down Payment: {downPayment}% (${downPaymentAmount.toLocaleString()})
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={40}
          step={1}
          value={downPayment}
          onValueChange={setDownPayment}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Interest Rate: {rate.toFixed(2)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={12}
          step={0.125}
          value={rate}
          onValueChange={setRate}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Loan Term: {term} years</Text>
        <View style={styles.termButtons}>
          {[15, 20, 30].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.termButton, term === t && styles.termButtonActive]}
              onPress={() => setTerm(t)}
            >
              <Text
                style={[
                  styles.termButtonText,
                  term === t && styles.termButtonTextActive,
                ]}
              >
                {t}yr
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.resultsGrid}>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Monthly Payment</Text>
          <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
            ${payment.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Loan Amount</Text>
          <Text style={styles.resultValue}>${loanAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Total Interest</Text>
          <Text style={[styles.resultValue, { color: "#EF4444" }]}>
            ${totalInterest.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Savings Goal Calculator Component
function SavingsCalculator() {
  const [goal, setGoal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(4);

  // Calculate months to reach goal with compound interest
  let months = 0;
  let accumulated = 0;
  const monthlyRate = rate / 100 / 12;

  while (accumulated < goal && months < 600) {
    accumulated = accumulated * (1 + monthlyRate) + monthly;
    months++;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const totalContributed = monthly * months;
  const interestEarned = accumulated - totalContributed;

  return (
    <View style={styles.calculatorContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Savings Goal: ${goal.toLocaleString()}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1000}
          maximumValue={100000}
          step={1000}
          value={goal}
          onValueChange={setGoal}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Monthly Contribution: ${monthly}</Text>
        <Slider
          style={styles.slider}
          minimumValue={50}
          maximumValue={2000}
          step={50}
          value={monthly}
          onValueChange={setMonthly}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          Annual Interest Rate: {rate.toFixed(1)}%
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={0.5}
          value={rate}
          onValueChange={setRate}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
      </View>

      <View style={styles.resultsGrid}>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Time to Goal</Text>
          <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
            {years}y {remainingMonths}m
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Total Contributed</Text>
          <Text style={styles.resultValue}>
            ${totalContributed.toLocaleString()}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Interest Earned</Text>
          <Text style={[styles.resultValue, { color: "#22C55E" }]}>
            ${interestEarned.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function CalculatorsScreen() {
  const [activeCalculator, setActiveCalculator] =
    useState<CalculatorType>("loan");

  const renderCalculator = () => {
    switch (activeCalculator) {
      case "loan":
        return <LoanCalculator />;
      case "debt":
        return <DebtPayoffCalculator />;
      case "utilization":
        return <UtilizationCalculator />;
      case "mortgage":
        return <MortgageCalculator />;
      case "savings":
        return <SavingsCalculator />;
      default:
        return <LoanCalculator />;
    }
  };

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
          <Text style={styles.title}>Calculators</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Calculator Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectorScroll}
          contentContainerStyle={styles.selectorContent}
        >
          {CALCULATOR_OPTIONS.map((calc) => (
            <TouchableOpacity
              key={calc.id}
              style={[
                styles.selectorItem,
                activeCalculator === calc.id && styles.selectorItemActive,
              ]}
              onPress={() => setActiveCalculator(calc.id)}
            >
              <View
                style={[
                  styles.selectorIcon,
                  activeCalculator === calc.id && styles.selectorIconActive,
                ]}
              >
                <Ionicons
                  name={calc.icon}
                  size={20}
                  color={
                    activeCalculator === calc.id ? "#fff" : theme.colors.primary
                  }
                />
              </View>
              <Text
                style={[
                  styles.selectorText,
                  activeCalculator === calc.id && styles.selectorTextActive,
                ]}
              >
                {calc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Calculator */}
        <Card style={styles.calculatorCard}>
          <View style={styles.calculatorHeader}>
            <Ionicons
              name={
                CALCULATOR_OPTIONS.find((c) => c.id === activeCalculator)
                  ?.icon || "calculator"
              }
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.calculatorTitleContainer}>
              <Text style={styles.calculatorTitle}>
                {
                  CALCULATOR_OPTIONS.find((c) => c.id === activeCalculator)
                    ?.name
                }{" "}
                Calculator
              </Text>
              <Text style={styles.calculatorDescription}>
                {
                  CALCULATOR_OPTIONS.find((c) => c.id === activeCalculator)
                    ?.description
                }
              </Text>
            </View>
          </View>
          {renderCalculator()}
        </Card>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Related Tools</Text>
        <View style={styles.quickLinksGrid}>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push("/credit-builder/simulator" as never)}
          >
            <Ionicons
              name="speedometer"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.quickLinkText}>Score Simulator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push("/financial/budgets" as never)}
          >
            <Ionicons name="cash" size={24} color={theme.colors.primary} />
            <Text style={styles.quickLinkText}>Budget Planner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push("/financial/net-worth" as never)}
          >
            <Ionicons
              name="stats-chart"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.quickLinkText}>Net Worth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push("/marketplace/consolidation" as never)}
          >
            <Ionicons name="git-merge" size={24} color={theme.colors.primary} />
            <Text style={styles.quickLinkText}>Consolidation</Text>
          </TouchableOpacity>
        </View>

        {/* Tip Card */}
        <Card style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro Tip</Text>
            <Text style={styles.tipText}>
              Keep your credit utilization below 30% for a good score, and below
              10% for an excellent score.
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

  // Calculator Selector
  selectorScroll: { marginBottom: theme.spacing.lg },
  selectorContent: { paddingRight: theme.spacing.lg },
  selectorItem: {
    alignItems: "center",
    marginRight: theme.spacing.md,
    width: 80,
  },
  selectorItemActive: {},
  selectorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  selectorIconActive: { backgroundColor: theme.colors.primary },
  selectorText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  selectorTextActive: { color: theme.colors.primary, fontWeight: "600" },

  // Calculator Card
  calculatorCard: { marginBottom: theme.spacing.lg },
  calculatorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  calculatorTitleContainer: { marginLeft: 12, flex: 1 },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  calculatorDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  calculatorContent: {},

  // Input Groups
  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },

  // Results
  resultsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: `${theme.colors.primary}08`,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: `${theme.colors.primary}08`,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  resultItem: { alignItems: "center" },
  resultLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  resultValue: { fontSize: 16, fontWeight: "700", color: theme.colors.text },

  // Utilization specific
  utilizationDisplay: { marginTop: theme.spacing.sm },
  utilizationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  utilizationLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text,
  },
  utilizationValue: { fontSize: 14, fontWeight: "700" },
  utilizationBar: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  utilizationFill: { height: "100%", borderRadius: 6 },
  utilizationMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  markerText: { fontSize: 10, color: theme.colors.textSecondary },
  utilizationTips: {
    marginTop: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}08`,
    borderRadius: 8,
    padding: theme.spacing.sm,
  },
  tipRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  tipRowText: { fontSize: 12, color: theme.colors.text, marginLeft: 8 },

  // Term buttons
  termButtons: { flexDirection: "row", marginTop: 4 },
  termButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginRight: 8,
  },
  termButtonActive: { backgroundColor: theme.colors.primary },
  termButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  termButtonTextActive: { color: "#fff" },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  // Quick Links
  quickLinksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  quickLinkCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    margin: "1%",
    alignItems: "center",
    flexDirection: "row",
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text,
    marginLeft: 10,
  },

  // Tip Card
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
  },
  tipContent: { flex: 1, marginLeft: 12 },
  tipTitle: { fontSize: 14, fontWeight: "600", color: "#92400E" },
  tipText: { fontSize: 12, color: "#92400E", marginTop: 4, lineHeight: 18 },
});
