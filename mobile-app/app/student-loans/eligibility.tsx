/**
 * Federal Program Eligibility Screen
 * Check eligibility for PSLF, IDR plans, and other federal programs
 */

import React, { useState, useCallback } from "react";
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
  selectEligibilityResults,
  selectFinancialSituation,
  selectStudentLoanLoading,
  selectStudentLoanError,
  selectPSLFEligibleLoans,
  selectIDREligibleLoans,
  FinancialSituation,
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

// Program info
const programInfo = {
  pslf: {
    name: "Public Service Loan Forgiveness (PSLF)",
    description:
      "Forgives remaining balance after 120 qualifying payments while working full-time for eligible employers.",
    requirements: [
      "Work full-time for a qualifying employer (government or 501(c)(3) nonprofit)",
      "Have Direct Loans or consolidate into Direct Loans",
      "Make 120 qualifying payments under an IDR plan",
      "Be on an income-driven repayment plan",
    ],
  },
  save: {
    name: "SAVE (Saving on a Valuable Education)",
    description:
      "Newest IDR plan with lowest payments based on discretionary income.",
    requirements: [
      "Have federal student loans",
      "Complete income certification annually",
      "Payments are 5-10% of discretionary income",
      "Interest subsidy to prevent balance growth",
    ],
  },
  idr: {
    name: "Income-Driven Repayment (IDR)",
    description:
      "Multiple plans that cap payments at a percentage of discretionary income.",
    requirements: [
      "Have eligible federal student loans",
      "Recertify income annually",
      "Balance forgiven after 20-25 years",
      "Available plans: SAVE, PAYE, IBR, ICR",
    ],
  },
  consolidation: {
    name: "Direct Consolidation",
    description:
      "Combine multiple federal loans into one loan with a weighted average interest rate.",
    requirements: [
      "Have multiple federal student loans",
      "Simplifies repayment with single payment",
      "May extend repayment term",
      "Required for some programs like PSLF",
    ],
  },
};

export default function EligibilityScreen() {
  const router = useRouter();

  // Store state
  const loans = useStudentLoanStore(selectStudentLoans);
  const eligibilityResults = useStudentLoanStore(selectEligibilityResults);
  const savedSituation = useStudentLoanStore(selectFinancialSituation);
  const isLoading = useStudentLoanStore(selectStudentLoanLoading);
  const error = useStudentLoanStore(selectStudentLoanError);
  const pslfLoans = useStudentLoanStore(selectPSLFEligibleLoans);
  const idrLoans = useStudentLoanStore(selectIDREligibleLoans);

  // Store actions
  const checkEligibility = useStudentLoanStore(
    (state) => state.checkEligibility,
  );
  const clearError = useStudentLoanStore((state) => state.clearError);

  // Local state
  const [showInputForm, setShowInputForm] = useState(!eligibilityResults);
  const [showEmploymentModal, setShowEmploymentModal] = useState(false);
  const [showFilingModal, setShowFilingModal] = useState(false);
  const [financialData, setFinancialData] = useState<
    Partial<FinancialSituation>
  >(
    savedSituation || {
      filingStatus: "single",
      employmentType: "private_sector",
      familySize: 1,
    },
  );

  // Update field
  const updateField = (field: keyof FinancialSituation, value: unknown) => {
    setFinancialData((prev) => ({ ...prev, [field]: value }));
  };

  // Check eligibility
  const handleCheck = useCallback(async () => {
    if (!financialData.annualIncome || !financialData.state) {
      return;
    }

    await checkEligibility(financialData as FinancialSituation);
    setShowInputForm(false);
  }, [financialData, checkEligibility]);

  // Calculate quick eligibility
  const quickEligibility = {
    pslf:
      financialData.employmentType === "public_service" && pslfLoans.length > 0,
    idr: idrLoans.length > 0,
    save: idrLoans.length > 0,
    consolidation: loans.length > 1,
  };

  // If no loans
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
            Add your student loans first to check your eligibility for federal
            programs.
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
          <ScreenHeader title="Federal Program Eligibility" />
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Check your eligibility for forgiveness and repayment programs
            </Text>
          </View>

          {/* Quick Eligibility Summary */}
          <View style={styles.quickSummary}>
            <Text style={styles.sectionTitle}>Quick Eligibility Check</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryIcon,
                    {
                      backgroundColor:
                        pslfLoans.length > 0
                          ? theme.colors.success + "20"
                          : theme.colors.error + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      pslfLoans.length > 0 ? "checkmark-circle" : "close-circle"
                    }
                    size={24}
                    color={
                      pslfLoans.length > 0
                        ? theme.colors.success
                        : theme.colors.error
                    }
                  />
                </View>
                <Text style={styles.summaryLabel}>PSLF Eligible Loans</Text>
                <Text style={styles.summaryValue}>
                  {pslfLoans.length} of {loans.length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryIcon,
                    {
                      backgroundColor:
                        idrLoans.length > 0
                          ? theme.colors.success + "20"
                          : theme.colors.error + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      idrLoans.length > 0 ? "checkmark-circle" : "close-circle"
                    }
                    size={24}
                    color={
                      idrLoans.length > 0
                        ? theme.colors.success
                        : theme.colors.error
                    }
                  />
                </View>
                <Text style={styles.summaryLabel}>IDR Eligible Loans</Text>
                <Text style={styles.summaryValue}>
                  {idrLoans.length} of {loans.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Input Form */}
          {showInputForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Your Information</Text>
              <Text style={styles.formSubtitle}>
                Provide details for accurate eligibility assessment
              </Text>

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

              {/* Years of Service */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Years at Current Employer</Text>
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

              {/* Check Button */}
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  (!financialData.annualIncome || !financialData.state) &&
                    styles.checkButtonDisabled,
                ]}
                onPress={handleCheck}
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
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.checkButtonText}>
                      Check Eligibility
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
                <Text style={styles.updateButtonText}>Update Information</Text>
              </TouchableOpacity>

              {/* Loading State */}
              {isLoading && !eligibilityResults && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>
                    Checking eligibility...
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Program Cards */}
          <View style={styles.programsSection}>
            <Text style={styles.sectionTitle}>Available Programs</Text>

            {/* PSLF */}
            <View style={styles.programCard}>
              <View style={styles.programHeader}>
                <View
                  style={[
                    styles.programIcon,
                    { backgroundColor: theme.colors.warning + "20" },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={24}
                    color={theme.colors.warning}
                  />
                </View>
                <View style={styles.programInfo}>
                  <Text style={styles.programName}>
                    {programInfo.pslf.name}
                  </Text>
                  <View
                    style={[
                      styles.eligibilityBadge,
                      {
                        backgroundColor: quickEligibility.pslf
                          ? theme.colors.success + "20"
                          : theme.colors.error + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        quickEligibility.pslf
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={14}
                      color={
                        quickEligibility.pslf
                          ? theme.colors.success
                          : theme.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.eligibilityText,
                        {
                          color: quickEligibility.pslf
                            ? theme.colors.success
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {quickEligibility.pslf
                        ? "Potentially Eligible"
                        : "Not Eligible"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.programDescription}>
                {programInfo.pslf.description}
              </Text>
              <View style={styles.requirementsList}>
                {programInfo.pslf.requirements.map((req, i) => (
                  <View key={i} style={styles.requirementItem}>
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SAVE */}
            <View style={styles.programCard}>
              <View style={styles.programHeader}>
                <View
                  style={[
                    styles.programIcon,
                    { backgroundColor: theme.colors.primary + "20" },
                  ]}
                >
                  <Ionicons
                    name="trending-down"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.programInfo}>
                  <Text style={styles.programName}>
                    {programInfo.save.name}
                  </Text>
                  <View
                    style={[
                      styles.eligibilityBadge,
                      {
                        backgroundColor: quickEligibility.save
                          ? theme.colors.success + "20"
                          : theme.colors.error + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        quickEligibility.save
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={14}
                      color={
                        quickEligibility.save
                          ? theme.colors.success
                          : theme.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.eligibilityText,
                        {
                          color: quickEligibility.save
                            ? theme.colors.success
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {quickEligibility.save
                        ? "Potentially Eligible"
                        : "Not Eligible"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.programDescription}>
                {programInfo.save.description}
              </Text>
              <View style={styles.requirementsList}>
                {programInfo.save.requirements.map((req, i) => (
                  <View key={i} style={styles.requirementItem}>
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* IDR */}
            <View style={styles.programCard}>
              <View style={styles.programHeader}>
                <View
                  style={[
                    styles.programIcon,
                    { backgroundColor: theme.colors.success + "20" },
                  ]}
                >
                  <Ionicons
                    name="calculator"
                    size={24}
                    color={theme.colors.success}
                  />
                </View>
                <View style={styles.programInfo}>
                  <Text style={styles.programName}>{programInfo.idr.name}</Text>
                  <View
                    style={[
                      styles.eligibilityBadge,
                      {
                        backgroundColor: quickEligibility.idr
                          ? theme.colors.success + "20"
                          : theme.colors.error + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        quickEligibility.idr
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={14}
                      color={
                        quickEligibility.idr
                          ? theme.colors.success
                          : theme.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.eligibilityText,
                        {
                          color: quickEligibility.idr
                            ? theme.colors.success
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {quickEligibility.idr
                        ? "Potentially Eligible"
                        : "Not Eligible"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.programDescription}>
                {programInfo.idr.description}
              </Text>
              <View style={styles.requirementsList}>
                {programInfo.idr.requirements.map((req, i) => (
                  <View key={i} style={styles.requirementItem}>
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Consolidation */}
            <View style={styles.programCard}>
              <View style={styles.programHeader}>
                <View
                  style={[
                    styles.programIcon,
                    {
                      backgroundColor:
                        theme.colors.secondary + "20" ||
                        theme.colors.primary + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name="git-merge"
                    size={24}
                    color={theme.colors.secondary || theme.colors.primary}
                  />
                </View>
                <View style={styles.programInfo}>
                  <Text style={styles.programName}>
                    {programInfo.consolidation.name}
                  </Text>
                  <View
                    style={[
                      styles.eligibilityBadge,
                      {
                        backgroundColor: quickEligibility.consolidation
                          ? theme.colors.success + "20"
                          : theme.colors.warning + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        quickEligibility.consolidation
                          ? "checkmark-circle"
                          : "information-circle"
                      }
                      size={14}
                      color={
                        quickEligibility.consolidation
                          ? theme.colors.success
                          : theme.colors.warning
                      }
                    />
                    <Text
                      style={[
                        styles.eligibilityText,
                        {
                          color: quickEligibility.consolidation
                            ? theme.colors.success
                            : theme.colors.warning,
                        },
                      ]}
                    >
                      {quickEligibility.consolidation
                        ? "Available"
                        : "Single Loan"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.programDescription}>
                {programInfo.consolidation.description}
              </Text>
              <View style={styles.requirementsList}>
                {programInfo.consolidation.requirements.map((req, i) => (
                  <View key={i} style={styles.requirementItem}>
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons
              name="information-circle"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.disclaimerText}>
              Eligibility results are estimates based on the information
              provided. Actual eligibility may vary. Consult with your loan
              servicer for official determination.
            </Text>
          </View>

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
  quickSummary: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
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
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
  checkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
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
  programsSection: {
    paddingHorizontal: 20,
  },
  programCard: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  programHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  eligibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  eligibilityText: {
    fontSize: 11,
    fontWeight: "500",
  },
  programDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  requirementsList: {
    gap: 6,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 16,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
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
