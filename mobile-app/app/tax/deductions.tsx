/**
 * Deduction Tracker Screen - Mobile App
 *
 * Track and manage tax deductions with:
 * - Category-based organization
 * - Itemized vs standard deduction comparison
 * - Receipt tracking
 * - Deduction recommendations
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTaxStore } from "../../src/store/taxStore";

const { width } = Dimensions.get("window");

// Mock deduction categories
const DEDUCTION_CATEGORIES = [
  {
    id: "charitable",
    name: "Charitable Donations",
    icon: "❤️",
    description: "Cash and property donations to qualified organizations",
    maxDeductible: undefined,
    currentTotal: 5200,
    items: [
      {
        id: "1",
        name: "United Way",
        amount: 2000,
        date: "2026-03-15",
        isVerified: true,
      },
      {
        id: "2",
        name: "Red Cross",
        amount: 1500,
        date: "2026-06-20",
        isVerified: true,
      },
      {
        id: "3",
        name: "Local Food Bank",
        amount: 700,
        date: "2026-09-10",
        isVerified: false,
      },
      {
        id: "4",
        name: "Habitat for Humanity",
        amount: 1000,
        date: "2026-11-25",
        isVerified: true,
      },
    ],
  },
  {
    id: "mortgage",
    name: "Mortgage Interest",
    icon: "🏠",
    description: "Interest paid on home mortgage",
    maxDeductible: 750000, // On loans up to this amount
    currentTotal: 18500,
    items: [
      {
        id: "5",
        name: "Primary Residence Mortgage",
        amount: 18500,
        date: "2026-12-31",
        isVerified: true,
      },
    ],
  },
  {
    id: "state_local",
    name: "State & Local Taxes (SALT)",
    icon: "🏛️",
    description: "State income tax, property tax, etc.",
    maxDeductible: 10000, // SALT cap
    currentTotal: 12500,
    items: [
      {
        id: "6",
        name: "CA State Income Tax",
        amount: 8500,
        date: "2026-12-31",
        isVerified: true,
      },
      {
        id: "7",
        name: "Property Tax",
        amount: 4000,
        date: "2026-12-31",
        isVerified: true,
      },
    ],
  },
  {
    id: "medical",
    name: "Medical Expenses",
    icon: "🏥",
    description: "Unreimbursed medical expenses exceeding 7.5% of AGI",
    maxDeductible: undefined,
    currentTotal: 3200,
    items: [
      {
        id: "8",
        name: "Dental Work",
        amount: 1800,
        date: "2026-05-15",
        isVerified: true,
      },
      {
        id: "9",
        name: "Vision Care",
        amount: 800,
        date: "2026-08-20",
        isVerified: false,
      },
      {
        id: "10",
        name: "Out-of-pocket prescriptions",
        amount: 600,
        date: "2026-12-01",
        isVerified: false,
      },
    ],
  },
  {
    id: "education",
    name: "Student Loan Interest",
    icon: "🎓",
    description: "Interest paid on qualified student loans",
    maxDeductible: 2500,
    currentTotal: 2100,
    items: [
      {
        id: "11",
        name: "Federal Student Loan Interest",
        amount: 2100,
        date: "2026-12-31",
        isVerified: true,
      },
    ],
  },
  {
    id: "business",
    name: "Business Expenses",
    icon: "💼",
    description: "Unreimbursed business expenses (if applicable)",
    maxDeductible: undefined,
    currentTotal: 4800,
    items: [
      {
        id: "12",
        name: "Home Office",
        amount: 2400,
        date: "2026-12-31",
        isVerified: false,
      },
      {
        id: "13",
        name: "Professional Development",
        amount: 1200,
        date: "2026-07-15",
        isVerified: true,
      },
      {
        id: "14",
        name: "Business Travel",
        amount: 1200,
        date: "2026-10-20",
        isVerified: false,
      },
    ],
  },
];

// 2026 Standard Deduction
const STANDARD_DEDUCTION_2026 = 14600; // Single filer

export default function DeductionsScreen() {
  const {
    deductionCategories,
    deductionSummary,
    fetchDeductionCategories,
    addDeduction,
  } = useTaxStore();

  const [categories, setCategories] = useState(DEDUCTION_CATEGORIES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("charitable");
  const [newDeduction, setNewDeduction] = useState({
    name: "",
    amount: "",
    date: "",
  });

  const totalItemizedDeductions = categories.reduce(
    (sum, cat) =>
      sum + Math.min(cat.currentTotal, cat.maxDeductible || Infinity),
    0,
  );

  const saltCapped = categories.find((c) => c.id === "state_local");
  const saltOverage = saltCapped
    ? Math.max(0, saltCapped.currentTotal - (saltCapped.maxDeductible || 0))
    : 0;

  const effectiveItemized = totalItemizedDeductions - saltOverage;
  const shouldItemize = effectiveItemized > STANDARD_DEDUCTION_2026;
  const savingsFromItemizing = effectiveItemized - STANDARD_DEDUCTION_2026;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDeductionCategories();
    setIsRefreshing(false);
  }, [fetchDeductionCategories]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleAddDeduction = () => {
    if (!newDeduction.name || !newDeduction.amount) {
      Alert.alert("Error", "Please enter a description and amount");
      return;
    }

    const category = categories.find((c) => c.id === selectedCategory);
    if (!category) return;

    const newItem = {
      id: `new-${Date.now()}`,
      name: newDeduction.name,
      amount: parseFloat(newDeduction.amount) || 0,
      date: newDeduction.date || new Date().toISOString().split("T")[0],
      isVerified: false,
    };

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              items: [...cat.items, newItem],
              currentTotal: cat.currentTotal + newItem.amount,
            }
          : cat,
      ),
    );

    setShowAddModal(false);
    setNewDeduction({ name: "", amount: "", date: "" });
    Alert.alert("Success", "Deduction added");
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    Alert.alert(
      "Delete Deduction",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCategories((prev) =>
              prev.map((cat) => {
                if (cat.id !== categoryId) return cat;
                const item = cat.items.find((i) => i.id === itemId);
                return {
                  ...cat,
                  items: cat.items.filter((i) => i.id !== itemId),
                  currentTotal: cat.currentTotal - (item?.amount || 0),
                };
              }),
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={
              shouldItemize ? ["#16A34A", "#15803D"] : ["#F59E0B", "#EA580C"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>
              {shouldItemize
                ? "Itemize Your Deductions"
                : "Take Standard Deduction"}
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(
                shouldItemize ? effectiveItemized : STANDARD_DEDUCTION_2026,
              )}
            </Text>
            <Text style={styles.summarySubtext}>
              {shouldItemize
                ? `Save ${formatCurrency(savingsFromItemizing)} more by itemizing`
                : `Standard deduction saves you ${formatCurrency(STANDARD_DEDUCTION_2026 - effectiveItemized)} more`}
            </Text>
          </LinearGradient>
        </View>

        {/* Comparison */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Itemized</Text>
              <Text style={styles.comparisonValue}>
                {formatCurrency(effectiveItemized)}
              </Text>
            </View>
            <View style={styles.comparisonDivider}>
              <Text style={styles.comparisonVs}>vs</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Standard</Text>
              <Text style={styles.comparisonValue}>
                {formatCurrency(STANDARD_DEDUCTION_2026)}
              </Text>
            </View>
          </View>

          {saltOverage > 0 && (
            <View style={styles.saltWarning}>
              <Text style={styles.saltWarningIcon}>⚠️</Text>
              <Text style={styles.saltWarningText}>
                SALT cap reduces your deduction by {formatCurrency(saltOverage)}
              </Text>
            </View>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deduction Categories</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {categories.map((category) => {
            const isExpanded = expandedCategory === category.id;
            const isCapped =
              category.maxDeductible &&
              category.currentTotal > category.maxDeductible;

            return (
              <View key={category.id} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryItemCount}>
                      {category.items.length} item
                      {category.items.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text
                      style={[
                        styles.categoryAmount,
                        isCapped && styles.categoryAmountCapped,
                      ]}
                    >
                      {formatCurrency(
                        Math.min(
                          category.currentTotal,
                          category.maxDeductible || Infinity,
                        ),
                      )}
                    </Text>
                    {isCapped && <Text style={styles.cappedLabel}>CAPPED</Text>}
                  </View>
                  <Text style={styles.expandIcon}>
                    {isExpanded ? "▼" : "▶"}
                  </Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.categoryItems}>
                    {category.description && (
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    )}

                    {category.maxDeductible && (
                      <View style={styles.limitInfo}>
                        <Text style={styles.limitText}>
                          Max deductible:{" "}
                          {formatCurrency(category.maxDeductible)}
                        </Text>
                        <View style={styles.limitBar}>
                          <View
                            style={[
                              styles.limitProgress,
                              {
                                width: `${Math.min(100, (category.currentTotal / category.maxDeductible) * 100)}%`,
                                backgroundColor: isCapped
                                  ? "#DC2626"
                                  : "#16A34A",
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    {category.items.map((item) => (
                      <View key={item.id} style={styles.deductionItem}>
                        <View style={styles.itemInfo}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.isVerified ? (
                              <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>✓</Text>
                              </View>
                            ) : (
                              <View style={styles.pendingBadge}>
                                <Text style={styles.pendingText}>!</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.itemDate}>{item.date}</Text>
                        </View>
                        <Text style={styles.itemAmount}>
                          {formatCurrency(item.amount)}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteItem(category.id, item.id)}
                        >
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addItemButton}
                      onPress={() => {
                        setSelectedCategory(category.id);
                        setShowAddModal(true);
                      }}
                    >
                      <Text style={styles.addItemText}>
                        + Add to {category.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deduction Tips</Text>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Bunch Charitable Donations</Text>
              <Text style={styles.tipDescription}>
                Consider making 2 years of donations in one year to exceed the
                standard deduction threshold.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>📋</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Keep All Receipts</Text>
              <Text style={styles.tipDescription}>
                Document all expenses with receipts, bank statements, or
                acknowledgment letters.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🔍</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Review Missing Deductions</Text>
              <Text style={styles.tipDescription}>
                Check for commonly missed deductions like job search expenses,
                tax preparation fees, and educator expenses.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Deduction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Deduction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPicker}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === cat.id &&
                        styles.categoryOptionActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={styles.categoryOptionIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryOptionText,
                        selectedCategory === cat.id &&
                          styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={newDeduction.name}
                onChangeText={(v) =>
                  setNewDeduction({ ...newDeduction, name: v })
                }
                placeholder="e.g., Red Cross Donation"
              />

              <Text style={styles.inputLabel}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={newDeduction.amount}
                onChangeText={(v) =>
                  setNewDeduction({ ...newDeduction, amount: v })
                }
                placeholder="0.00"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newDeduction.date}
                onChangeText={(v) =>
                  setNewDeduction({ ...newDeduction, date: v })
                }
                placeholder={new Date().toISOString().split("T")[0]}
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddDeduction}
              >
                <Text style={styles.modalButtonText}>Add Deduction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  summaryContainer: {
    padding: 16,
  },
  summaryGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  comparisonCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  comparisonItem: {
    flex: 1,
    alignItems: "center",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#78716C",
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1917",
  },
  comparisonDivider: {
    paddingHorizontal: 16,
  },
  comparisonVs: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  saltWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  saltWarningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  saltWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },
  addButton: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
  },
  categoryItemCount: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  categoryAmountContainer: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16A34A",
  },
  categoryAmountCapped: {
    color: "#DC2626",
  },
  cappedLabel: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  categoryItems: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  categoryDescription: {
    fontSize: 13,
    color: "#78716C",
    marginBottom: 12,
    paddingTop: 12,
  },
  limitInfo: {
    marginBottom: 12,
  },
  limitText: {
    fontSize: 12,
    color: "#78716C",
    marginBottom: 6,
  },
  limitBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  limitProgress: {
    height: "100%",
    borderRadius: 3,
  },
  deductionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1917",
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  verifiedText: {
    fontSize: 10,
    color: "#16A34A",
    fontWeight: "bold",
  },
  pendingBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  pendingText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "bold",
  },
  itemDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
    marginRight: 12,
  },
  deleteButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  addItemButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  addItemText: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1917",
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: "#78716C",
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },
  modalClose: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1C1917",
  },
  categoryPicker: {
    marginBottom: 8,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryOptionActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  categoryOptionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryOptionText: {
    fontSize: 13,
    color: "#78716C",
  },
  categoryOptionTextActive: {
    color: "#92400E",
    fontWeight: "500",
  },
  modalButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
