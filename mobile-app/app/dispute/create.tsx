import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";

const DISPUTE_TYPES = [
  { id: "late_payment", label: "Late Payment", icon: "time-outline" },
  {
    id: "collection",
    label: "Collection Account",
    icon: "alert-circle-outline",
  },
  { id: "inquiry", label: "Hard Inquiry", icon: "search-outline" },
  {
    id: "account_error",
    label: "Account Error",
    icon: "document-text-outline",
  },
  { id: "identity_theft", label: "Identity Theft", icon: "shield-outline" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

const BUREAUS = [
  { id: "experian", label: "Experian", color: "#0066CC" },
  { id: "equifax", label: "Equifax", color: "#CC0000" },
  { id: "transunion", label: "TransUnion", color: "#00AA00" },
];

export default function CreateDisputeScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [disputeType, setDisputeType] = useState("");
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>([]);
  const [accountName, setAccountName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleBureau = (bureauId: string) => {
    setSelectedBureaus((prev) =>
      prev.includes(bureauId)
        ? prev.filter((b) => b !== bureauId)
        : [...prev, bureauId],
    );
  };

  const handleNext = () => {
    if (step === 1 && !disputeType) {
      Alert.alert("Required", "Please select a dispute type");
      return;
    }
    if (step === 2 && selectedBureaus.length === 0) {
      Alert.alert("Required", "Please select at least one bureau");
      return;
    }
    if (step === 3 && !accountName.trim()) {
      Alert.alert("Required", "Please enter the account name");
      return;
    }
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    Alert.alert("Success", "Your dispute has been submitted!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of dispute?</Text>
      <Text style={styles.stepDescription}>
        Select the type of item you want to dispute
      </Text>
      {DISPUTE_TYPES.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.optionCard,
            disputeType === type.id && styles.optionCardSelected,
          ]}
          onPress={() => setDisputeType(type.id)}
        >
          <Ionicons
            name={type.icon as any}
            size={24}
            color={
              disputeType === type.id
                ? lightTheme.colors.primary
                : lightTheme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.optionLabel,
              disputeType === type.id && styles.optionLabelSelected,
            ]}
          >
            {type.label}
          </Text>
          {disputeType === type.id && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={lightTheme.colors.primary}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Which bureaus?</Text>
      <Text style={styles.stepDescription}>
        Select the bureaus reporting this item
      </Text>
      {BUREAUS.map((bureau) => (
        <TouchableOpacity
          key={bureau.id}
          style={[
            styles.optionCard,
            selectedBureaus.includes(bureau.id) && {
              borderColor: bureau.color,
            },
          ]}
          onPress={() => toggleBureau(bureau.id)}
        >
          <View style={[styles.bureauDot, { backgroundColor: bureau.color }]} />
          <Text style={styles.optionLabel}>{bureau.label}</Text>
          {selectedBureaus.includes(bureau.id) && (
            <Ionicons name="checkmark-circle" size={24} color={bureau.color} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Account Details</Text>
      <Text style={styles.stepDescription}>Enter the account information</Text>
      <TextInput
        style={styles.input}
        placeholder="Account/Creditor Name"
        value={accountName}
        onChangeText={setAccountName}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the issue..."
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Type:</Text>
        <Text style={styles.reviewValue}>
          {DISPUTE_TYPES.find((t) => t.id === disputeType)?.label}
        </Text>
        <Text style={styles.reviewLabel}>Bureaus:</Text>
        <Text style={styles.reviewValue}>
          {selectedBureaus
            .map((b) => BUREAUS.find((bu) => bu.id === b)?.label)
            .join(", ")}
        </Text>
        <Text style={styles.reviewLabel}>Account:</Text>
        <Text style={styles.reviewValue}>{accountName}</Text>
        {reason && (
          <>
            <Text style={styles.reviewLabel}>Reason:</Text>
            <Text style={styles.reviewValue}>{reason}</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Dispute</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressStep,
              s <= step && styles.progressStepActive,
            ]}
          />
        ))}
      </View>
      <ScrollView style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          <Text style={styles.nextButtonText}>
            {step === 4 ? (isSubmitting ? "Submitting..." : "Submit") : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
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
  progressBar: { flexDirection: "row", padding: 16, gap: 8 },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: lightTheme.colors.border,
    borderRadius: 2,
  },
  progressStepActive: { backgroundColor: lightTheme.colors.primary },
  content: { flex: 1 },
  stepContent: { padding: 16 },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 12,
  },
  optionCardSelected: { borderColor: lightTheme.colors.primary },
  optionLabel: { flex: 1, fontSize: 16, color: lightTheme.colors.text },
  optionLabelSelected: { color: lightTheme.colors.primary, fontWeight: "600" },
  bureauDot: { width: 12, height: 12, borderRadius: 6 },
  input: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  textArea: { height: 120, textAlignVertical: "top" },
  reviewCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginTop: 12,
  },
  reviewValue: {
    fontSize: 16,
    color: lightTheme.colors.text,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: lightTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  nextButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.primary,
    alignItems: "center",
  },
  nextButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  buttonDisabled: { opacity: 0.6 },
});
