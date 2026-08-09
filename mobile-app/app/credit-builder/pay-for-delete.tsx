/**
 * Fynvita Pay-for-Delete Screen
 * Negotiate collection removal
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

const STEPS = [
  {
    step: 1,
    title: "Verify the Debt",
    description:
      "Request debt validation to confirm the debt is legitimate and accurate",
  },
  {
    step: 2,
    title: "Calculate Settlement",
    description:
      "Determine how much you can offer (typically 30-50% of balance)",
  },
  {
    step: 3,
    title: "Send PFD Letter",
    description:
      "Propose payment in exchange for complete deletion from credit reports",
  },
  {
    step: 4,
    title: "Get Written Agreement",
    description:
      "Never pay until you have written confirmation of deletion terms",
  },
  {
    step: 5,
    title: "Make Payment",
    description: "Pay via certified check or money order for documentation",
  },
  {
    step: 6,
    title: "Verify Deletion",
    description:
      "Check credit reports 30-45 days after payment to confirm removal",
  },
];

interface Collection {
  id: string;
  creditor: string;
  originalCreditor: string;
  balance: number;
  dateOpened: string;
  status: string;
}

const MOCK_COLLECTIONS: Collection[] = [
  {
    id: "1",
    creditor: "ABC Collections",
    originalCreditor: "Medical Center",
    balance: 1250,
    dateOpened: "2023-06-15",
    status: "Open",
  },
  {
    id: "2",
    creditor: "XYZ Recovery",
    originalCreditor: "Utility Company",
    balance: 450,
    dateOpened: "2023-09-20",
    status: "Open",
  },
];

export default function PayForDeleteScreen() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null,
  );
  const [offerAmount, setOfferAmount] = useState("");

  const selectedItem = MOCK_COLLECTIONS.find(
    (c) => c.id === selectedCollection,
  );
  const suggestedOffer = selectedItem
    ? Math.round(selectedItem.balance * 0.4)
    : 0;

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
          <Text style={styles.title}>Pay-for-Delete</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="trash-bin" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.infoTitle}>Negotiate Collection Removal</Text>
          <Text style={styles.infoText}>
            Pay-for-delete is a negotiation strategy where you offer to pay a
            collection account in exchange for its removal from your credit
            reports.
          </Text>
        </Card>

        {/* Warning */}
        <Card style={styles.warningCard}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Not all collectors agree to PFD. Some may refuse or only agree to
            mark as "Paid" which still shows on your report.
          </Text>
        </Card>

        {/* Process Steps */}
        <Text style={styles.sectionTitle}>The Process</Text>
        <Card style={styles.stepsCard}>
          {STEPS.map((step, idx) => (
            <View
              key={step.step}
              style={[
                styles.stepRow,
                idx < STEPS.length - 1 && styles.stepRowBorder,
              ]}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Collections List */}
        {MOCK_COLLECTIONS.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Collections</Text>
            {MOCK_COLLECTIONS.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                onPress={() =>
                  setSelectedCollection(
                    selectedCollection === collection.id ? null : collection.id,
                  )
                }
                activeOpacity={0.7}
              >
                <Card
                  style={[
                    styles.collectionCard,
                    selectedCollection === collection.id &&
                      styles.collectionCardSelected,
                  ]}
                >
                  <View style={styles.collectionRow}>
                    <View style={styles.collectionInfo}>
                      <Text style={styles.collectionCreditor}>
                        {collection.creditor}
                      </Text>
                      <Text style={styles.collectionOriginal}>
                        Original: {collection.originalCreditor}
                      </Text>
                    </View>
                    <View style={styles.collectionRight}>
                      <Text style={styles.collectionBalance}>
                        ${collection.balance.toLocaleString()}
                      </Text>
                      <Text style={styles.collectionDate}>
                        {collection.dateOpened}
                      </Text>
                    </View>
                  </View>
                  {selectedCollection === collection.id && (
                    <View style={styles.offerSection}>
                      <Text style={styles.offerLabel}>
                        Your Offer (suggested: ${suggestedOffer})
                      </Text>
                      <TextInput
                        style={styles.offerInput}
                        value={offerAmount}
                        onChangeText={setOfferAmount}
                        placeholder={`$${suggestedOffer}`}
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.generateButton}
                        onPress={() => router.push("/dispute/new")}
                      >
                        <Ionicons name="document-text" size={18} color="#fff" />
                        <Text style={styles.generateButtonText}>
                          Generate PFD Letter
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Negotiation Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Start with 30-40% of the balance</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Always get agreement in writing first
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Never give access to your bank account
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Keep copies of all correspondence
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
  infoCard: { alignItems: "center", marginBottom: theme.spacing.md },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
    backgroundColor: "#FEF3C720",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  stepsCard: { marginBottom: theme.spacing.lg },
  stepRow: { flexDirection: "row", paddingVertical: 12 },
  stepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  stepDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  collectionCard: { marginBottom: theme.spacing.sm },
  collectionCardSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  collectionRow: { flexDirection: "row", alignItems: "center" },
  collectionInfo: { flex: 1 },
  collectionCreditor: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  collectionOriginal: { fontSize: 12, color: theme.colors.textSecondary },
  collectionRight: { alignItems: "flex-end" },
  collectionBalance: { fontSize: 16, fontWeight: "600", color: "#EF4444" },
  collectionDate: { fontSize: 11, color: theme.colors.textSecondary },
  offerSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  offerLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  offerInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});
