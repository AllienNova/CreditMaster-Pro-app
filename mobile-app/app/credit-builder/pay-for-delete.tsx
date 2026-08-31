/**
 * Fynvita Pay-for-Delete Screen
 * Negotiate collection removal
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

/*
 * A `Collection` interface and MOCK_COLLECTIONS lived here: invented debts in
 * the user's own name — "ABC Collections, originally Medical Center, $1,250,
 * opened 2023-06-15". The screen then offered to compute a settlement against
 * them, at 40% of a balance nobody owed.
 *
 * There is NO SOURCE for a user's collection accounts. They come from a parsed
 * credit report, and that data sits in `credit_reports.reportData`, typed
 * `Record<string, unknown>` (src/lib/credit-repair/db-legacy.ts:27) — an
 * untyped JSONB blob with no contract to read. The only `tradelines` table in
 * the schema is the MARKETPLACE one (tradelines for sale), not the caller's
 * accounts.
 *
 * So the list is gone and the screen says what is missing. The STEPS guide and
 * the negotiation tips below stay: those are product content about how
 * pay-for-delete works, not claims about this user.
 */

export default function PayForDeleteScreen() {
  /*
   * The settlement calculator lived inside the collection-selection block and
   * went with it: `selectedCollection`, `offerAmount` and a suggested offer of
   * 40% of the selected balance. There is nothing to select and no balance to
   * take a percentage of, and a calculator seeded from an invented debt is how
   * this screen produced a settlement figure for a debt nobody owed.
   *
   * It comes back with the collections, not before.
   */

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

        {/* A "Your Collections" list lived here, rendering MOCK_COLLECTIONS
            and letting the user pick one to settle. */}
        <Text style={styles.sectionTitle}>Your Collections</Text>
        <Card style={styles.collectionCard}>
          <Text style={styles.stateText}>
            We cannot list your collection accounts yet. They come from a
            parsed credit report, and that parsing is not available — so
            nothing here would be yours.
          </Text>
        </Card>

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
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
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
