/**
 * Student Loan Detail Screen
 * Shows detailed information about a specific loan with edit/delete options
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import {
  useStudentLoanStore,
  selectSelectedLoan,
  selectStudentLoanLoading,
  UpdateLoanInput,
  LoanStatus,
} from "../../src/store";

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// Format date
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Get loan type display name
const getLoanTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    federal_direct_subsidized: "Federal Direct Subsidized",
    federal_direct_unsubsidized: "Federal Direct Unsubsidized",
    federal_plus_parent: "Parent PLUS",
    federal_plus_grad: "Grad PLUS",
    federal_perkins: "Federal Perkins",
    private: "Private",
    consolidated: "Consolidated",
  };
  return labels[type] || type;
};

// Get status display name
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    in_repayment: "In Repayment",
    in_grace: "Grace Period",
    deferment: "Deferment",
    forbearance: "Forbearance",
    default: "Default",
    cancelled: "Cancelled",
    paid_in_full: "Paid in Full",
  };
  return labels[status] || status;
};

// Get status color
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    in_repayment: theme.colors.success,
    in_grace: theme.colors.primary,
    deferment: theme.colors.warning,
    forbearance: theme.colors.warning,
    default: theme.colors.error,
    cancelled: theme.colors.textSecondary,
    paid_in_full: theme.colors.success,
  };
  return colors[status] || theme.colors.textSecondary;
};

const statusOptions: LoanStatus[] = [
  "in_repayment",
  "in_grace",
  "deferment",
  "forbearance",
  "default",
  "cancelled",
  "paid_in_full",
];

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Store state
  const loan = useStudentLoanStore(selectSelectedLoan);
  const isLoading = useStudentLoanStore(selectStudentLoanLoading);

  // Store actions
  const fetchLoan = useStudentLoanStore((state) => state.fetchLoan);
  const updateLoan = useStudentLoanStore((state) => state.updateLoan);
  const deleteLoan = useStudentLoanStore((state) => state.deleteLoan);

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editData, setEditData] = useState<UpdateLoanInput>({});

  // Fetch loan on mount
  useEffect(() => {
    if (id) {
      fetchLoan(id);
    }
  }, [id, fetchLoan]);

  // Initialize edit data when loan loads
  useEffect(() => {
    if (loan) {
      setEditData({
        currentBalance: loan.currentBalance,
        interestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        status: loan.status,
        servicer: loan.servicer,
        repaymentPlan: loan.repaymentPlan,
      });
    }
  }, [loan]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!id) return;

    const result = await updateLoan(id, editData);
    if (result) {
      setIsEditing(false);
      Alert.alert("Success", "Loan updated successfully");
    } else {
      Alert.alert("Error", "Failed to update loan");
    }
  }, [id, editData, updateLoan]);

  // Handle delete
  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Loan",
      "Are you sure you want to delete this loan? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            const success = await deleteLoan(id);
            if (success) {
              router.back();
            } else {
              Alert.alert("Error", "Failed to delete loan");
            }
          },
        },
      ],
    );
  }, [id, deleteLoan, router]);

  // Handle status change
  const handleStatusChange = (status: LoanStatus) => {
    setEditData((prev) => ({ ...prev, status }));
    setShowStatusModal(false);
  };

  if (isLoading && !loan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading loan details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Loan Not Found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: getLoanTypeLabel(loan.loanType),
          headerRight: () => (
            <View style={styles.headerButtons}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditing(false)}
                    style={styles.headerButton}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.headerButton}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.headerButton}
                  >
                    <Ionicons
                      name="pencil"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.headerButton}
                  >
                    <Ionicons
                      name="trash"
                      size={20}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView style={styles.scrollView}>
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            {isEditing ? (
              <TextInput
                style={styles.balanceInput}
                value={editData.currentBalance?.toString()}
                onChangeText={(text) =>
                  setEditData((prev) => ({
                    ...prev,
                    currentBalance: parseFloat(text) || 0,
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={styles.balanceAmount}>
                {formatCurrency(loan.currentBalance)}
              </Text>
            )}
            <View style={styles.originalBalance}>
              <Text style={styles.originalBalanceLabel}>
                Original Principal:{" "}
              </Text>
              <Text style={styles.originalBalanceValue}>
                {formatCurrency(loan.originalPrincipal)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(0, 100 - (loan.currentBalance / loan.originalPrincipal) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {(
                (1 - loan.currentBalance / loan.originalPrincipal) *
                100
              ).toFixed(1)}
              % paid off
            </Text>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            {isEditing ? (
              <TouchableOpacity
                style={styles.statusSelector}
                onPress={() => setShowStatusModal(true)}
              >
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        getStatusColor(editData.status || loan.status) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(editData.status || loan.status) },
                    ]}
                  >
                    {getStatusLabel(editData.status || loan.status)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(loan.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(loan.status) },
                  ]}
                >
                  {getStatusLabel(loan.status)}
                </Text>
              </View>
            )}
          </View>

          {/* Loan Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loan Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Loan Type</Text>
                <Text style={styles.detailValue}>
                  {getLoanTypeLabel(loan.loanType)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Servicer</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.detailInput}
                    value={editData.servicer}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, servicer: text }))
                    }
                    placeholder="Enter servicer"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.detailValue}>{loan.servicer}</Text>
                )}
              </View>
              {loan.accountNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>
                    ****{loan.accountNumber.slice(-4)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest Rate</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.detailInput}
                    value={editData.interestRate?.toString()}
                    onChangeText={(text) =>
                      setEditData((prev) => ({
                        ...prev,
                        interestRate: parseFloat(text) || 0,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.detailValue}>
                    {formatPercent(loan.interestRate)}
                  </Text>
                )}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Payment</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.detailInput}
                    value={editData.monthlyPayment?.toString()}
                    onChangeText={(text) =>
                      setEditData((prev) => ({
                        ...prev,
                        monthlyPayment: parseFloat(text) || 0,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.detailValue}>
                    {formatCurrency(loan.monthlyPayment)}
                  </Text>
                )}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Origination Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(loan.originationDate)}
                </Text>
              </View>
              {loan.repaymentPlan && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Repayment Plan</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editData.repaymentPlan}
                      onChangeText={(text) =>
                        setEditData((prev) => ({
                          ...prev,
                          repaymentPlan: text,
                        }))
                      }
                      placeholder="Enter plan"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>{loan.repaymentPlan}</Text>
                  )}
                </View>
              )}
              {loan.remainingPayments && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remaining Payments</Text>
                  <Text style={styles.detailValue}>
                    {loan.remainingPayments}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Eligibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Program Eligibility</Text>
            <View style={styles.eligibilityCard}>
              <View style={styles.eligibilityRow}>
                <View style={styles.eligibilityItem}>
                  <Ionicons
                    name={
                      loan.pslf_eligible ? "checkmark-circle" : "close-circle"
                    }
                    size={24}
                    color={
                      loan.pslf_eligible
                        ? theme.colors.success
                        : theme.colors.error
                    }
                  />
                  <View>
                    <Text style={styles.eligibilityLabel}>PSLF</Text>
                    <Text style={styles.eligibilityDesc}>
                      Public Service Loan Forgiveness
                    </Text>
                  </View>
                </View>
                <View style={styles.eligibilityItem}>
                  <Ionicons
                    name={
                      loan.idr_eligible ? "checkmark-circle" : "close-circle"
                    }
                    size={24}
                    color={
                      loan.idr_eligible
                        ? theme.colors.success
                        : theme.colors.error
                    }
                  />
                  <View>
                    <Text style={styles.eligibilityLabel}>IDR</Text>
                    <Text style={styles.eligibilityDesc}>
                      Income-Driven Repayment
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          {!isEditing && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/student-loans/strategies")}
              >
                <Ionicons name="bulb" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>
                  View Repayment Strategies
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/student-loans/eligibility")}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.actionButtonText}>
                  Check Program Eligibility
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>

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
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.modalOption,
                    editData.status === status && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(status) },
                    ]}
                  />
                  <Text style={styles.modalOptionText}>
                    {getStatusLabel(status)}
                  </Text>
                  {editData.status === status && (
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  balanceCard: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  balanceInput: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.5)",
    paddingVertical: 4,
  },
  originalBalance: {
    flexDirection: "row",
    marginTop: 12,
  },
  originalBalanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  originalBalanceValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    textAlign: "right",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  statusSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  detailInput: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    paddingVertical: 4,
    minWidth: 100,
  },
  eligibilityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  eligibilityRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  eligibilityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eligibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  eligibilityDesc: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
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
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.primary + "10",
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
