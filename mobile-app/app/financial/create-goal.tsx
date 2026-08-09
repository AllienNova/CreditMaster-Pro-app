/**
 * Fynvita Create Goal Screen
 * Form for creating a new financial goal
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGoalStore } from "../../src/store/goalStore";
import type { GoalType } from "../../src/services/api/types";

const GOAL_CATEGORIES: {
  type: GoalType;
  label: string;
  icon: string;
}[] = [
  { type: "emergency_fund", label: "Emergency", icon: "shield-checkmark" },
  { type: "vacation", label: "Vacation", icon: "airplane" },
  { type: "home", label: "Home", icon: "home" },
  { type: "education", label: "Education", icon: "school" },
  { type: "retirement", label: "Retirement", icon: "sunny" },
  { type: "savings", label: "Savings", icon: "wallet" },
  { type: "investment", label: "Investment", icon: "trending-up" },
  { type: "debt_payoff", label: "Debt Payoff", icon: "card" },
  { type: "other", label: "Other", icon: "flag" },
];

interface FormErrors {
  name?: string;
  targetAmount?: string;
  deadline?: string;
}

export default function CreateGoalScreen() {
  const { createGoal, isCreating } = useGoalStore();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedType, setSelectedType] = useState<GoalType>("savings");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Goal name is required";
    }

    const amount = parseFloat(targetAmount);
    if (!targetAmount.trim() || isNaN(amount) || amount <= 0) {
      newErrors.targetAmount = "Enter a valid target amount greater than 0";
    }

    if (!deadline.trim()) {
      newErrors.deadline = "Deadline is required (YYYY-MM-DD)";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      newErrors.deadline = "Use format YYYY-MM-DD";
    } else {
      const parsed = new Date(deadline.trim());
      if (isNaN(parsed.getTime())) {
        newErrors.deadline = "Invalid date";
      } else if (parsed <= new Date()) {
        newErrors.deadline = "Deadline must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const success = await createGoal({
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      type: selectedType,
      deadline: deadline.trim(),
    });

    if (success) {
      router.back();
    } else {
      Alert.alert(
        "Error",
        useGoalStore.getState().error || "Failed to create goal",
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Goal</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Category Selector */}
          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {GOAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.type}
                style={[
                  styles.categoryChip,
                  selectedType === cat.type && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedType(cat.type)}
              >
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={
                    selectedType === cat.type ? "#fff" : theme.colors.text
                  }
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedType === cat.type && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Name */}
          <Card style={styles.formCard}>
            <Text style={styles.label}>Goal Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              maxLength={100}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}

            {/* Target Amount */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Target Amount ($)
            </Text>
            <TextInput
              style={[styles.input, errors.targetAmount && styles.inputError]}
              placeholder="10000"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={(text) => {
                setTargetAmount(text);
                if (errors.targetAmount)
                  setErrors((e) => ({ ...e, targetAmount: undefined }));
              }}
            />
            {errors.targetAmount && (
              <Text style={styles.errorText}>{errors.targetAmount}</Text>
            )}

            {/* Deadline */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Deadline (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.input, errors.deadline && styles.inputError]}
              placeholder="2027-01-01"
              placeholderTextColor={theme.colors.textSecondary}
              value={deadline}
              onChangeText={(text) => {
                setDeadline(text);
                if (errors.deadline)
                  setErrors((e) => ({ ...e, deadline: undefined }));
              }}
              maxLength={10}
            />
            {errors.deadline && (
              <Text style={styles.errorText}>{errors.deadline}</Text>
            )}
          </Card>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, isCreating && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Create Goal</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  categoryScroll: { marginBottom: theme.spacing.lg },
  categoryChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    minWidth: 80,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryLabel: {
    fontSize: 11,
    color: theme.colors.text,
    marginTop: 4,
    textAlign: "center",
  },
  categoryLabelActive: { color: "#fff" },
  formCard: { marginBottom: theme.spacing.lg },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});
