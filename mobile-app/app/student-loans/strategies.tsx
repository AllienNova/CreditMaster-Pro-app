/**
 * AI Repayment Strategies Screen
 * Shows AI-generated repayment strategies based on user's financial situation
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import {
  useStudentLoanStore,
  selectStudentLoans,
  selectRepaymentStrategies,
  selectSelectedStrategy,
  selectFinancialSituation,
  selectStudentLoanLoading,
  selectStudentLoanError,
  FinancialSituation,
  AIStrategyRecommendation,
} from "../../src/store";

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Filing status options
const filingStatusOptions: {
  value: FinancialSituation["filingStatus"];
  label: string;
}[] = [
  { value: "single", label: "Single" },
  { value: "married_filing_jointly", label: "Married Filing Jointly" },
  { value: "married_filing_separately", label: "Married Filing Separately" },
  { value: "head_of_household", label: "Head of Household" },
];

// Employment type options
const employmentOptions: {
  value: FinancialSituation["employmentType"];
  label: string;
  description: string;
}[] = [
  {
    value: "public_service",
    label: "Public Service",
    description: "Government or 501(c)(3) nonprofit",
  },
  {
    value: "nonprofit",
    label: "Nonprofit",
    description: "Other nonprofit organizations",
  },
  {
    value: "private_sector",
    label: "Private Sector",
    description: "For-profit companies",
  },
  {
    value: "self_employed",
    label: "Self-Employed",
    description: "Business owner or contractor",
  },
];

// Strategy type icons
const strategyIcons: Record<string, string> = {
  standard: "calculator",
  idr: "trending-down",
  avalanche: "snow",
  snowball: "ellipse",
  pslf: "shield-checkmark",
  refinance: "swap-horizontal",
};

// Strategy type colors
const strategyColors: Record<string, string> = {
  standard: theme.colors.textSecondary,
  idr: theme.colors.primary,
  avalanche: "#3b82f6",
  snowball: theme.colors.success,
  pslf: theme.colors.warning,
  refinance: theme.colors.secondary || "#8b5cf6",
};

export default function StrategiesScreen() {
  const router = useRouter();

  // Store state
  const loans = useStudentLoanStore(selectStudentLoans);
  const strategies = useStudentLoanStore(selectRepaymentStrategies);
  const selectedStrategy = useStudentLoanStore(selectSelectedStrategy);
  const savedSituation = useStudentLoanStore(selectFinancialSituation);
  const isLoading = useStudentLoanStore(selectStudentLoanLoading);
  const error = useStudentLoanStore(selectStudentLoanError);

  // Store actions
  const generateStrategies = useStudentLoanStore(
    (state) => state.generateStrategies,
  );
  const selectStrategyAction = useStudentLoanStore(
    (state) => state.selectStrategy,
  );
  const clearError = useStudentLoanStore((state) => state.clearError);

  // Local state
  const [showInputForm, setShowInputForm] = useState(
    !savedSituation && strategies.length === 0,
  );
  const [showFilingModal, setShowFilingModal] = useState(false);
  const [showEmploymentModal, setShowEmploymentModal] = useState(false);
  const [financialData, setFinancialData] = useState<
    Partial<FinancialSituation>
  >(
    savedSituation || {
      filingStatus: "single",
      employmentType: "private_sector",
      familySize: 1,
    },
  );

  // Update financial data
  const updateField = (field: keyof FinancialSituation, value: unknown) => {
    setFinancialData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate strategies
  const handleGenerate = useCallback(async () => {
    if (!financialData.annualIncome || !financialData.state) {
      return;
    }

    await generateStrategies(financialData as FinancialSituation);
    setShowInputForm(false);
  }, [financialData, generateStrategies]);

  // Select a strategy
  const handleSelectStrategy = (strategy: AIStrategyRecommendation) => {
    selectStrategyAction(strategy);
  };

  // If no loans, show message
  if (loans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="school-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Loans Found</Text>
          <Text style={styles.emptyText}>
            Add your student loans first to get AI-powered repayment strategies.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/student-loans/add")}
          >
            <Text style={styles.addButtonText}>Add Your First Loan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {/* Error Banner */}
          {error && (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
              <Ionicons
                name="alert-circle"
                size={20}
                color={theme.colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Ionicons name="close" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          )}

          {/* Header */}
          <ScreenHeader title="AI Repayment Strategies" />
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Get personalized strategies based on your financial situation
            </Text>
          </View>

          {/* Input Form */}
          {showInputForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Your Financial Situation</Text>

              {/* Annual Income */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Annual Income (AGI)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputPrefix}>$</Text>
                  <TextInput
                    style={styles.inputWithPrefix}
                    value={financialData.annualIncome?.toString()}
                    onChangeText={(text) =>
                      updateField("annualIncome", parseInt(text) || 0)
                    }
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Filing Status */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Filing Status</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowFilingModal(true)}
                >
                  <Text style={styles.selectorText}>
                    {filingStatusOptions.find(
                      (o) => o.value === financialData.filingStatus,
                    )?.label || "Select"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Family Size */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Family Size</Text>
                <TextInput
                  style={styles.input}
                  value={financialData.familySize?.toString()}
                  onChangeText={(text) =>
                    updateField("familySize", parseInt(text) || 1)
                  }
                  placeholder="1"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              {/* State */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  value={financialData.state}
                  onChangeText={(text) =>
                    updateField("state", text.toUpperCase())
                  }
                  placeholder="e.g., CA, NY, TX"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>

              {/* Employment Type */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Employment Type</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowEmploymentModal(true)}
                >
                  <Text style={styles.selectorText}>
                    {employmentOptions.find(
                      (o) => o.value === financialData.employmentType,
                    )?.label || "Select"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Years of Service (for PSLF) */}
              {(financialData.employmentType === "public_service" ||
                financialData.employmentType === "nonprofit") && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Years in Public Service</Text>
                  <TextInput
                    style={styles.input}
                    value={financialData.yearsOfService?.toString()}
                    onChangeText={(text) =>
                      updateField("yearsOfService", parseInt(text) || 0)
                    }
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              {/* Generate Button */}
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (!financialData.annualIncome || !financialData.state) &&
                    styles.generateButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={
                  !financialData.annualIncome ||
                  !financialData.state ||
                  isLoading
                }
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>
                      Generate AI Strategies
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Update Button */}
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => setShowInputForm(true)}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.updateButtonText}>
                  Update Financial Info
                </Text>
              </TouchableOpacity>

              {/* Loading State */}
              {isLoading && strategies.length === 0 && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>
                    Analyzing your options...
                  </Text>
                </View>
              )}

              {/* Strategies List */}
              {strategies.map((strategy, index) => (
                <TouchableOpacity
                  key={strategy.id}
                  style={[
                    styles.strategyCard,
                    selectedStrategy?.id === strategy.id &&
                      styles.strategyCardSelected,
                    strategy.recommended && styles.strategyCardRecommended,
                  ]}
                  onPress={() => handleSelectStrategy(strategy)}
                >
                  {strategy.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}

                  <View style={styles.strategyHeader}>
                    <View
                      style={[
                        styles.strategyIcon,
                        {
                          backgroundColor: strategyColors[strategy.type] + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={strategyIcons[strategy.type] as any}
                        size={24}
                        color={strategyColors[strategy.type]}
                      />
                    </View>
                    <View style={styles.strategyInfo}>
                      <Text style={styles.strategyName}>{strategy.name}</Text>
                      <Text style={styles.strategyType}>
                        {strategy.type.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(strategy.confidence * 100)}%
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.strategyDescription}>
                    {strategy.description}
                  </Text>

                  <View style={styles.strategyStats}>
                    <View style={styles.strategyStat}>
                      <Text style={styles.statLabel}>Monthly</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(strategy.monthlyPayment)}
                      </Text>
                    </View>
                    <View style={styles.strategyStat}>
                      <Text style={styles.statLabel}>Total Paid</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(strategy.totalPayments)}
                      </Text>
                    </View>
                    <View style={styles.strategyStat}>
                      <Text style={styles.statLabel}>Total Interest</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(strategy.totalInterest)}
                      </Text>
                    </View>
                    <View style={styles.strategyStat}>
                      <Text style={styles.statLabel}>Payoff Time</Text>
                      <Text style={styles.statValue}>
                        {Math.floor(strategy.payoffMonths / 12)}y{" "}
                        {strategy.payoffMonths % 12}m
                      </Text>
                    </View>
                  </View>

                  {strategy.forgiveness && strategy.forgiveness > 0 && (
                    <View style={styles.forgivenessRow}>
                      <Ionicons
                        name="gift"
                        size={16}
                        color={theme.colors.success}
                      />
                      <Text style={styles.forgivenessText}>
                        Potential Forgiveness:{" "}
                        {formatCurrency(strategy.forgiveness)}
                      </Text>
                    </View>
                  )}

                  {strategy.savings && strategy.savings > 0 && (
                    <View style={styles.savingsRow}>
                      <Ionicons
                        name="cash"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.savingsText}>
                        Savings vs Standard: {formatCurrency(strategy.savings)}
                      </Text>
                    </View>
                  )}

                  {/* Pros & Cons */}
                  <View style={styles.prosConsContainer}>
                    <View style={styles.prosSection}>
                      <Text style={styles.prosTitle}>Pros</Text>
                      {strategy.pros.map((pro, i) => (
                        <View key={i} style={styles.prosItem}>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={theme.colors.success}
                          />
                          <Text style={styles.prosText}>{pro}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.consSection}>
                      <Text style={styles.consTitle}>Cons</Text>
                      {strategy.cons.map((con, i) => (
                        <View key={i} style={styles.consItem}>
                          <Ionicons
                            name="close"
                            size={14}
                            color={theme.colors.error}
                          />
                          <Text style={styles.consText}>{con}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Filing Status Modal */}
      <Modal
        visible={showFilingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filing Status</Text>
              <TouchableOpacity onPress={() => setShowFilingModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {filingStatusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  financialData.filingStatus === option.value &&
                    styles.modalOptionSelected,
                ]}
                onPress={() => {
                  updateField("filingStatus", option.value);
                  setShowFilingModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {financialData.filingStatus === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Employment Type Modal */}
      <Modal
        visible={showEmploymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmploymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employment Type</Text>
              <TouchableOpacity onPress={() => setShowEmploymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {employmentOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  financialData.employmentType === option.value &&
                    styles.modalOptionSelected,
                ]}
                onPress={() => {
                  updateField("employmentType", option.value);
                  setShowEmploymentModal(false);
                }}
              >
                <View style={styles.modalOptionContent}>
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  <Text style={styles.modalOptionDesc}>
                    {option.description}
                  </Text>
                </View>
                {financialData.employmentType === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.error + "10",
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  header: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  formCard: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 20,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    padding: 14,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  inputPrefix: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  inputWithPrefix: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
    fontSize: 16,
    color: theme.colors.text,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.primary + "10",
    borderRadius: 8,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  strategyCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  strategyCardSelected: {
    borderColor: theme.colors.primary,
  },
  strategyCardRecommended: {
    borderColor: theme.colors.warning,
  },
  recommendedBadge: {
    position: "absolute",
    top: 0,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.warning,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  strategyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  strategyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  strategyInfo: {
    flex: 1,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  strategyType: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.success + "20",
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.success,
  },
  strategyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  strategyStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  strategyStat: {
    width: "50%",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  forgivenessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.success + "10",
    borderRadius: 8,
    marginBottom: 8,
  },
  forgivenessText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.success,
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.primary + "10",
    borderRadius: 8,
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  prosConsContainer: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  prosSection: {
    flex: 1,
    paddingRight: 8,
  },
  consSection: {
    flex: 1,
    paddingLeft: 8,
  },
  prosTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.success,
    marginBottom: 8,
  },
  consTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.error,
    marginBottom: 8,
  },
  prosItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 4,
  },
  consItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 4,
  },
  prosText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.text,
    lineHeight: 16,
  },
  consText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.text,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.primary + "10",
  },
  modalOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  modalOptionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
