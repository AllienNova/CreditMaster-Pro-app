/**
 * Add Student Loan Screen
 * Form to add a new student loan to the portfolio
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import {
  useStudentLoanStore,
  CreateLoanInput,
  LoanType,
  LoanStatus,
} from "../../src/store";

// Loan type options
const loanTypeOptions: {
  value: LoanType;
  label: string;
  description: string;
}[] = [
  {
    value: "federal_direct_subsidized",
    label: "Direct Subsidized",
    description: "Federal loan where government pays interest while in school",
  },
  {
    value: "federal_direct_unsubsidized",
    label: "Direct Unsubsidized",
    description: "Federal loan where interest accrues from disbursement",
  },
  {
    value: "federal_plus_parent",
    label: "Parent PLUS",
    description: "Federal loan for parents of dependent students",
  },
  {
    value: "federal_plus_grad",
    label: "Grad PLUS",
    description: "Federal loan for graduate/professional students",
  },
  {
    value: "federal_perkins",
    label: "Perkins",
    description: "Federal loan with fixed 5% interest (discontinued)",
  },
  {
    value: "private",
    label: "Private",
    description: "Non-federal loan from bank or private lender",
  },
  {
    value: "consolidated",
    label: "Consolidated",
    description: "Combined federal loans into single loan",
  },
];

// Status options
const statusOptions: { value: LoanStatus; label: string }[] = [
  { value: "in_repayment", label: "In Repayment" },
  { value: "in_grace", label: "Grace Period" },
  { value: "deferment", label: "Deferment" },
  { value: "forbearance", label: "Forbearance" },
  { value: "default", label: "Default" },
  { value: "paid_in_full", label: "Paid in Full" },
];

// Common servicers
const servicerSuggestions = [
  "Nelnet",
  "Great Lakes",
  "FedLoan Servicing",
  "MOHELA",
  "Navient",
  "Aidvantage",
  "ECSI",
  "EdFinancial",
  "OSLA",
  "SoFi",
  "Earnest",
  "CommonBond",
  "Other",
];

export default function AddLoanScreen() {
  const router = useRouter();

  // Store actions
  const addLoan = useStudentLoanStore((state) => state.addLoan);
  const isAddingLoan = useStudentLoanStore((state) => state.isAddingLoan);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateLoanInput>>({
    loanType: "federal_direct_unsubsidized",
    status: "in_repayment",
  });

  // Modal states
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showServicerModal, setShowServicerModal] = useState(false);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form field
  const updateField = (field: keyof CreateLoanInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.loanType) {
      newErrors.loanType = "Loan type is required";
    }
    if (!formData.servicer?.trim()) {
      newErrors.servicer = "Servicer is required";
    }
    if (!formData.originalPrincipal || formData.originalPrincipal <= 0) {
      newErrors.originalPrincipal = "Original principal is required";
    }
    if (!formData.currentBalance || formData.currentBalance < 0) {
      newErrors.currentBalance = "Current balance is required";
    }
    if (formData.interestRate === undefined || formData.interestRate < 0) {
      newErrors.interestRate = "Interest rate is required";
    }
    if (!formData.monthlyPayment || formData.monthlyPayment < 0) {
      newErrors.monthlyPayment = "Monthly payment is required";
    }
    if (!formData.originationDate) {
      newErrors.originationDate = "Origination date is required";
    }
    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields");
      return;
    }

    const result = await addLoan(formData as CreateLoanInput);
    if (result) {
      Alert.alert("Success", "Loan added successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", "Failed to add loan. Please try again.");
    }
  }, [formData, addLoan, router]);

  // Get current loan type label
  const currentTypeLabel =
    loanTypeOptions.find((o) => o.value === formData.loanType)?.label ||
    "Select Type";
  const currentStatusLabel =
    statusOptions.find((o) => o.value === formData.status)?.label ||
    "Select Status";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Student Loan",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isAddingLoan}
              style={styles.headerButton}
            >
              {isAddingLoan ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
          >
            {/* Loan Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loan Type</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  !!errors.loanType && styles.selectorError,
                ]}
                onPress={() => setShowTypeModal(true)}
              >
                <Text style={styles.selectorText}>{currentTypeLabel}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {errors.loanType && (
                <Text style={styles.errorText}>{errors.loanType}</Text>
              )}
            </View>

            {/* Servicer */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loan Servicer</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  !!errors.servicer && styles.selectorError,
                ]}
                onPress={() => setShowServicerModal(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !formData.servicer && styles.placeholder,
                  ]}
                >
                  {formData.servicer || "Select or enter servicer"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {errors.servicer && (
                <Text style={styles.errorText}>{errors.servicer}</Text>
              )}
            </View>

            {/* Account Number (Optional) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.accountNumber}
                onChangeText={(text) => updateField("accountNumber", text)}
                placeholder="Enter account number"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Original Principal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Original Principal</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !!errors.originalPrincipal && styles.inputError,
                ]}
              >
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.inputWithPrefix}
                  value={formData.originalPrincipal?.toString()}
                  onChangeText={(text) =>
                    updateField("originalPrincipal", parseFloat(text) || 0)
                  }
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.originalPrincipal && (
                <Text style={styles.errorText}>{errors.originalPrincipal}</Text>
              )}
            </View>

            {/* Current Balance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Balance</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !!errors.currentBalance && styles.inputError,
                ]}
              >
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.inputWithPrefix}
                  value={formData.currentBalance?.toString()}
                  onChangeText={(text) =>
                    updateField("currentBalance", parseFloat(text) || 0)
                  }
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.currentBalance && (
                <Text style={styles.errorText}>{errors.currentBalance}</Text>
              )}
            </View>

            {/* Interest Rate */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interest Rate</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !!errors.interestRate && styles.inputError,
                ]}
              >
                <TextInput
                  style={styles.inputWithSuffix}
                  value={formData.interestRate?.toString()}
                  onChangeText={(text) =>
                    updateField("interestRate", parseFloat(text) || 0)
                  }
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
              {errors.interestRate && (
                <Text style={styles.errorText}>{errors.interestRate}</Text>
              )}
            </View>

            {/* Monthly Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Payment</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !!errors.monthlyPayment && styles.inputError,
                ]}
              >
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={styles.inputWithPrefix}
                  value={formData.monthlyPayment?.toString()}
                  onChangeText={(text) =>
                    updateField("monthlyPayment", parseFloat(text) || 0)
                  }
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.monthlyPayment && (
                <Text style={styles.errorText}>{errors.monthlyPayment}</Text>
              )}
            </View>

            {/* Origination Date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Origination Date</Text>
              <TextInput
                style={[
                  styles.input,
                  !!errors.originationDate && styles.inputError,
                ]}
                value={formData.originationDate}
                onChangeText={(text) => updateField("originationDate", text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
              />
              {errors.originationDate && (
                <Text style={styles.errorText}>{errors.originationDate}</Text>
              )}
            </View>

            {/* Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loan Status</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  !!errors.status && styles.selectorError,
                ]}
                onPress={() => setShowStatusModal(true)}
              >
                <Text style={styles.selectorText}>{currentStatusLabel}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {errors.status && (
                <Text style={styles.errorText}>{errors.status}</Text>
              )}
            </View>

            {/* Repayment Plan (Optional) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Repayment Plan (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.repaymentPlan}
                onChangeText={(text) => updateField("repaymentPlan", text)}
                placeholder="e.g., Standard, IDR, SAVE"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isAddingLoan && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isAddingLoan}
            >
              {isAddingLoan ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Loan</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Bottom Spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Loan Type Modal */}
        <Modal
          visible={showTypeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Loan Type</Text>
                <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {loanTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      formData.loanType === option.value &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      updateField("loanType", option.value);
                      setShowTypeModal(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionText}>{option.label}</Text>
                      <Text style={styles.modalOptionDesc}>
                        {option.description}
                      </Text>
                    </View>
                    {formData.loanType === option.value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Status Modal */}
        <Modal
          visible={showStatusModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Status</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    formData.status === option.value &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    updateField("status", option.value);
                    setShowStatusModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {formData.status === option.value && (
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

        {/* Servicer Modal */}
        <Modal
          visible={showServicerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowServicerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Servicer</Text>
                <TouchableOpacity onPress={() => setShowServicerModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.servicerInput}
                value={formData.servicer}
                onChangeText={(text) => updateField("servicer", text)}
                placeholder="Enter custom servicer name..."
                placeholderTextColor={theme.colors.textSecondary}
              />
              <ScrollView>
                {servicerSuggestions.map((servicer) => (
                  <TouchableOpacity
                    key={servicer}
                    style={[
                      styles.modalOption,
                      formData.servicer === servicer &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      updateField(
                        "servicer",
                        servicer === "Other" ? "" : servicer,
                      );
                      if (servicer !== "Other") {
                        setShowServicerModal(false);
                      }
                    }}
                  >
                    <Text style={styles.modalOptionText}>{servicer}</Text>
                    {formData.servicer === servicer && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowServicerModal(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
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
  headerButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectorError: {
    borderColor: theme.colors.error,
  },
  selectorText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholder: {
    color: theme.colors.textSecondary,
  },
  input: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputPrefix: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  inputSuffix: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  inputWithPrefix: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputWithSuffix: {
    flex: 1,
    padding: 16,
    paddingRight: 0,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
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
  servicerInput: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalDoneButton: {
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
