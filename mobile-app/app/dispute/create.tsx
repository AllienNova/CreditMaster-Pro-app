import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { useDisputeStore } from "../../src/store/disputeStore";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type { DisputableItem } from "../../src/services/api/creditRepair";

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

// The screen's local item = the real disputable item plus a `selected` flag that
// is UI-only state (never asserted by the API).
interface DisputeItem extends DisputableItem {
  selected: boolean;
}

// Render an honest balance: a real amount as a grouped dollar figure (matching
// the sibling credit-builder screens' `$${n.toLocaleString()}` convention), and
// a null balance (an inquiry, or a tradeline with no balance column) as an em
// dash — never a fabricated $0.
function formatBalance(balance: number | null): string {
  if (balance === null) return "—";
  return `$${balance.toLocaleString()}`;
}

const TOTAL_STEPS = 6;
const MAX_MESSAGE_LENGTH = 2000;

function getTemplateMessage(disputeType: string): string {
  const templates: Record<string, string> = {
    late_payment:
      "I am writing to dispute a late payment reported on my credit report. I believe this information is inaccurate. My records show that payment was made on time and I request that this item be investigated and corrected.",
    collection:
      "I am writing to dispute a collection account on my credit report. I do not recognize this debt and request validation under the Fair Debt Collection Practices Act. Please provide documentation verifying this account belongs to me.",
    inquiry:
      "I am writing to dispute a hard inquiry on my credit report. I did not authorize this credit check and request it be removed immediately per the Fair Credit Reporting Act.",
    account_error:
      "I am writing to dispute inaccurate information on my credit report. The account details reported are incorrect and I request a thorough investigation and correction of this entry.",
    identity_theft:
      "I am a victim of identity theft and this account was opened fraudulently without my knowledge or consent. I have filed an identity theft report and request immediate removal of this account from my credit report.",
    other:
      "I am writing to dispute an item on my credit report that I believe is inaccurate or incomplete. I request that you investigate this matter and correct any errors found.",
  };
  return templates[disputeType] ?? templates.other;
}

export default function CreateDisputeScreen() {
  const router = useRouter();
  const { generateAILetter, isGeneratingLetter, createDispute, isCreating } =
    useDisputeStore();

  const [step, setStep] = useState(1);
  const [selectedBureau, setSelectedBureau] = useState("");
  const [disputeType, setDisputeType] = useState("");
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the user's real disputable items on mount. `selected` is added locally
  // as UI state — the API never asserts a selection. The former MOCK_CREDIT_ITEMS
  // array is gone; only real items ever render.
  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    const res = await creditRepairApi.getDisputableItems();
    if (res.success && res.data) {
      setItems(res.data.items.map((it) => ({ ...it, selected: false })));
      setItemsError(null);
    } else {
      setItemsError(
        res.error?.message ?? "Unable to load your disputable items.",
      );
    }
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const selectedItems = items.filter((i) => i.selected);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleNext = () => {
    if (step === 1 && !selectedBureau) {
      Alert.alert("Required", "Please select a credit bureau");
      return;
    }
    if (step === 2 && !disputeType) {
      Alert.alert("Required", "Please select a dispute type");
      return;
    }
    if (step === 3 && selectedItems.length === 0) {
      Alert.alert("Required", "Please select at least one item to dispute");
      return;
    }
    if (step === 4 && !disputeMessage.trim()) {
      Alert.alert("Required", "Please enter a dispute message");
      return;
    }

    if (step === 2 && !disputeMessage) {
      setDisputeMessage(getTemplateMessage(disputeType));
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const goToStep = (targetStep: number) => {
    if (targetStep >= 1 && targetStep <= TOTAL_STEPS) {
      setStep(targetStep);
    }
  };

  const handleAIImprove = useCallback(async () => {
    const result = await generateAILetter({
      disputeType,
      bureau: selectedBureau,
      accountInfo: {
        items: selectedItems.map((i) => i.accountName).join(", "),
        originalMessage: disputeMessage,
      },
      tone: "professional",
      includeStatutes: true,
    });
    if (result) {
      setDisputeMessage(result);
    } else {
      Alert.alert("Error", "Failed to generate AI letter. Please try again.");
    }
  }, [disputeType, selectedBureau, selectedItems, disputeMessage, generateAILetter]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const dispute = await createDispute({
      bureau: selectedBureau as "experian" | "equifax" | "transunion",
      status: "pending",
      itemType: disputeType,
      creditorName: selectedItems.map((i) => i.accountName).join(", "),
      disputeReason: disputeMessage,
      letterContent: disputeMessage,
    });
    setIsSubmitting(false);
    if (dispute) {
      Alert.alert("Success", "Your dispute has been submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", "Failed to submit dispute. Please try again.");
    }
  };

  const renderStep1Bureau = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Credit Bureau</Text>
      <Text style={styles.stepDescription}>
        Choose which bureau to send your dispute to
      </Text>
      {BUREAUS.map((bureau) => (
        <TouchableOpacity
          key={bureau.id}
          style={[
            styles.optionCard,
            selectedBureau === bureau.id && { borderColor: bureau.color },
          ]}
          onPress={() => setSelectedBureau(bureau.id)}
        >
          <View style={[styles.bureauDot, { backgroundColor: bureau.color }]} />
          <Text style={styles.optionLabel}>{bureau.label}</Text>
          {selectedBureau === bureau.id && (
            <Ionicons name="checkmark-circle" size={24} color={bureau.color} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2Type = () => (
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
            name={type.icon as keyof typeof Ionicons.glyphMap}
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

  const renderStep3Items = () => {
    if (itemsLoading) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Select Items to Dispute</Text>
          <View style={styles.itemsStateBox} testID="dispute-items-loading">
            <ActivityIndicator size="large" color={lightTheme.colors.primary} />
            <Text style={styles.itemsStateText}>
              Loading your disputable items...
            </Text>
          </View>
        </View>
      );
    }

    if (itemsError) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Select Items to Dispute</Text>
          <View style={styles.itemsStateBox} testID="dispute-items-error">
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={lightTheme.colors.textSecondary}
            />
            <Text style={styles.itemsStateText}>{itemsError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadItems}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Select Items to Dispute</Text>
          <View style={styles.itemsStateBox} testID="dispute-items-empty">
            <Ionicons
              name="checkmark-done-circle-outline"
              size={40}
              color={lightTheme.colors.textSecondary}
            />
            <Text style={styles.itemsStateTitle}>
              Nothing to dispute right now
            </Text>
            <Text style={styles.itemsStateText}>
              When your credit report has items you can dispute, they will show up
              here to select.
            </Text>
          </View>
        </View>
      );
    }

    const allSelected = items.every((i) => i.selected);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Items to Dispute</Text>
        <Text style={styles.stepDescription}>
          Choose which items from your credit report to include
        </Text>

        <TouchableOpacity
          style={[styles.selectAllRow]}
          onPress={toggleSelectAll}
        >
          <Ionicons
            name={allSelected ? "checkbox" : "square-outline"}
            size={24}
            color={
              allSelected
                ? lightTheme.colors.primary
                : lightTheme.colors.textSecondary
            }
          />
          <Text style={styles.selectAllText}>
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
          <Text style={styles.selectedCount}>
            {selectedItems.length} of {items.length} selected
          </Text>
        </TouchableOpacity>

        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.itemCard,
              item.selected && styles.itemCardSelected,
            ]}
            onPress={() => toggleItem(item.id)}
          >
            <View style={styles.itemCheckbox}>
              <Ionicons
                name={item.selected ? "checkbox" : "square-outline"}
                size={24}
                color={
                  item.selected
                    ? lightTheme.colors.primary
                    : lightTheme.colors.textSecondary
                }
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.accountName}</Text>
              <Text style={styles.itemStatus}>{item.status}</Text>
            </View>
            <Text style={styles.itemBalance}>{formatBalance(item.balance)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStep4Message = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Customize Your Message</Text>
      <Text style={styles.stepDescription}>
        Edit the dispute letter or use AI to improve it
      </Text>

      <TouchableOpacity
        style={[
          styles.aiButton,
          isGeneratingLetter && styles.buttonDisabled,
        ]}
        onPress={handleAIImprove}
        disabled={isGeneratingLetter}
      >
        {isGeneratingLetter ? (
          <ActivityIndicator size="small" color={lightTheme.colors.primary} />
        ) : (
          <Ionicons
            name="sparkles"
            size={20}
            color={lightTheme.colors.primary}
          />
        )}
        <Text style={styles.aiButtonText}>
          {isGeneratingLetter ? "Generating..." : "Use AI to improve"}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.messageInput}
        value={disputeMessage}
        onChangeText={(text) => {
          if (text.length <= MAX_MESSAGE_LENGTH) {
            setDisputeMessage(text);
          }
        }}
        placeholder="Write your dispute message..."
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>
        {disputeMessage.length}/{MAX_MESSAGE_LENGTH}
      </Text>
    </View>
  );

  const renderStep5Review = () => {
    const bureauLabel =
      BUREAUS.find((b) => b.id === selectedBureau)?.label ?? selectedBureau;
    const typeLabel =
      DISPUTE_TYPES.find((t) => t.id === disputeType)?.label ?? disputeType;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review Your Dispute</Text>
        <Text style={styles.stepDescription}>
          Confirm the details before submitting
        </Text>

        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Bureau</Text>
            <View style={styles.reviewValueRow}>
              <Text style={styles.reviewValue}>{bureauLabel}</Text>
              <TouchableOpacity onPress={() => goToStep(1)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Dispute Type</Text>
            <View style={styles.reviewValueRow}>
              <Text style={styles.reviewValue}>{typeLabel}</Text>
              <TouchableOpacity onPress={() => goToStep(2)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Items to Dispute</Text>
            <View style={styles.reviewValueRow}>
              <Text style={styles.reviewValue}>
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}
              </Text>
              <TouchableOpacity onPress={() => goToStep(3)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {selectedItems.map((item) => (
            <Text key={item.id} style={styles.reviewItemDetail}>
              {item.accountName} - {item.status}
            </Text>
          ))}

          <View style={styles.reviewDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Message</Text>
            <TouchableOpacity onPress={() => goToStep(4)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reviewMessagePreview} numberOfLines={4}>
            {disputeMessage}
          </Text>
        </View>
      </View>
    );
  };

  const renderStep6Complete = () => (
    <View style={styles.stepContent}>
      <View style={styles.completeContainer}>
        <View style={styles.completeIcon}>
          <Ionicons
            name="checkmark-circle"
            size={80}
            color={lightTheme.colors.success}
          />
        </View>
        <Text style={styles.completeTitle}>Dispute Submitted</Text>
        <Text style={styles.completeDescription}>
          Your dispute has been submitted successfully. You will be notified when
          there are updates on your dispute status.
        </Text>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.completeButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isLastStep = step === 5;
  const submitting = isSubmitting || isCreating;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Dispute</Text>
        <Text style={styles.stepIndicator}>
          {step <= 5 ? `${step} of 5` : ""}
        </Text>
      </View>

      {step <= 5 && (
        <View style={styles.progressBar}>
          {Array.from({ length: 5 }, (_, i) => i + 1).map((s) => (
            <View
              key={s}
              style={[
                styles.progressStep,
                s <= step && styles.progressStepActive,
              ]}
            />
          ))}
        </View>
      )}

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && renderStep1Bureau()}
        {step === 2 && renderStep2Type()}
        {step === 3 && renderStep3Items()}
        {step === 4 && renderStep4Message()}
        {step === 5 && renderStep5Review()}
        {step === 6 && renderStep6Complete()}
      </ScrollView>

      {step <= 5 && (
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, submitting && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={submitting}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep
                ? submitting
                  ? "Submitting..."
                  : "Submit Dispute"
                : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  stepIndicator: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    minWidth: 28,
    textAlign: "right",
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

  // Step 3 - Item Selection
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 8,
  },
  selectAllText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  selectedCount: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  itemCardSelected: { borderColor: lightTheme.colors.primary },
  itemCheckbox: { marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  itemStatus: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginTop: 2,
  },
  itemBalance: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  itemsStateBox: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 8,
  },
  itemsStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginTop: 12,
  },
  itemsStateText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: lightTheme.colors.primary,
  },
  retryButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  // Step 4 - Message Customization
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: lightTheme.colors.primary,
    marginBottom: 16,
    gap: 8,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTheme.colors.primary,
  },
  messageInput: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    color: lightTheme.colors.text,
  },
  charCount: {
    fontSize: 12,
    color: lightTheme.colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
  },

  // Step 5 - Review
  reviewCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  reviewValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reviewLabel: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
  },
  reviewValue: {
    fontSize: 16,
    color: lightTheme.colors.text,
    fontWeight: "500",
  },
  editLink: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTheme.colors.primary,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: lightTheme.colors.border,
    marginVertical: 12,
  },
  reviewItemDetail: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    paddingLeft: 8,
    paddingVertical: 2,
  },
  reviewMessagePreview: {
    fontSize: 14,
    color: lightTheme.colors.text,
    lineHeight: 20,
    marginTop: 8,
  },

  // Step 6 - Complete
  completeContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  completeIcon: {
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginBottom: 12,
  },
  completeDescription: {
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  completeButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.primary,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Footer
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
