/**
 * Add Holding Screen
 * Form to add a new investment holding
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useInvestmentStore } from "../../src/store";
import { investmentsApi, AssetType } from "../../src/services/api/investments";

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "bond", label: "Bonds" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "option", label: "Options" },
  { value: "other", label: "Other" },
];

export default function AddHoldingScreen() {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPortfolio = useInvestmentStore((s) => s.fetchPortfolio);

  const validateForm = (): boolean => {
    if (!symbol.trim()) {
      Alert.alert("Validation Error", "Please enter a stock symbol");
      return false;
    }
    if (!shares || parseFloat(shares) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid number of shares");
      return false;
    }
    if (!costBasis || parseFloat(costBasis) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid cost basis");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await investmentsApi.createHolding({
        symbol: symbol.trim().toUpperCase(),
        name: name.trim() || symbol.trim().toUpperCase(),
        quantity: parseFloat(shares),
        purchase_price: parseFloat(costBasis),
        asset_type: assetType,
        purchase_date: purchaseDate || new Date().toISOString().split("T")[0],
      });

      // Refresh portfolio
      await fetchPortfolio();

      Alert.alert("Success", "Holding added successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add holding",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Symbol & Name */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Investment Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Symbol *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., AAPL"
                placeholderTextColor={theme.colors.textSecondary}
                value={symbol}
                onChangeText={(text) => setSymbol(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company/Asset Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Apple Inc."
                placeholderTextColor={theme.colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </Card>

          {/* Asset Type */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Asset Type</Text>
            <View style={styles.assetTypeGrid}>
              {assetTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.assetTypeButton,
                    assetType === type.value && styles.assetTypeButtonActive,
                  ]}
                  onPress={() => setAssetType(type.value)}
                >
                  <Text
                    style={[
                      styles.assetTypeText,
                      assetType === type.value && styles.assetTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Purchase Details */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Purchase Details</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Shares *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={shares}
                  onChangeText={setShares}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Cost per Share *</Text>
                <View style={styles.currencyInput}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.currencyInputField}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={costBasis}
                    onChangeText={setCostBasis}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purchase Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </View>

            {/* Total Value Preview */}
            {shares && costBasis && (
              <View style={styles.totalPreview}>
                <Text style={styles.totalLabel}>Total Investment</Text>
                <Text style={styles.totalValue}>
                  $
                  {(parseFloat(shares) * parseFloat(costBasis)).toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </Text>
              </View>
            )}
          </Card>

          {/* Notes */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this investment..."
              placeholderTextColor={theme.colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Adding..." : "Add Holding"}
            </Text>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  row: {
    flexDirection: "row",
  },
  currencyInput: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  currencyInputField: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  assetTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assetTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
  },
  assetTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  assetTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  assetTypeTextActive: {
    color: "#FFFFFF",
  },
  totalPreview: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  notesInput: {
    height: 100,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  submitButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
