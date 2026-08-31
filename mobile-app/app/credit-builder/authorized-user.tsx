/**
 * Fynvita Authorized User Screen
 * Piggyback on good credit
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

const BENEFITS = [
  {
    icon: "trending-up",
    title: "Inherit Credit History",
    description: "The account's full history may appear on your credit report",
  },
  {
    icon: "time",
    title: "Instant Age Boost",
    description: "Older accounts can increase your average credit age",
  },
  {
    icon: "shield-checkmark",
    title: "Low Risk",
    description: "You're not legally responsible for the debt",
  },
  {
    icon: "card",
    title: "No Credit Check",
    description: "Being added doesn't require a hard inquiry",
  },
];

const REQUIREMENTS = [
  { text: "Find someone with excellent credit (750+)", important: true },
  { text: "Account should have low utilization (<10%)", important: true },
  { text: "Account should have perfect payment history", important: true },
  { text: "Account should be at least 2+ years old", important: false },
  { text: "Issuer must report authorized users to bureaus", important: true },
];

const ISSUERS_THAT_REPORT = [
  "American Express",
  "Bank of America",
  "Barclays",
  "Capital One",
  "Chase",
  "Citi",
  "Discover",
  "US Bank",
  "Wells Fargo",
];

export default function AuthorizedUserScreen() {
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
          <Text style={styles.title}>Authorized User</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="people" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.infoTitle}>Piggyback on Good Credit</Text>
          <Text style={styles.infoText}>
            Become an authorized user on someone else's credit card to benefit
            from their positive credit history.
          </Text>
        </Card>

        {/* Potential Impact */}
        <Card style={styles.impactCard}>
          <Text style={styles.impactTitle}>Potential Score Impact</Text>
          <View style={styles.impactRow}>
            <Text style={styles.impactValue}>+20 to +50</Text>
            <Text style={styles.impactLabel}>points possible</Text>
          </View>
          <Text style={styles.impactNote}>
            Results vary based on the account's age, limit, and your current
            credit profile
          </Text>
        </Card>

        {/* Benefits */}
        <Text style={styles.sectionTitle}>Benefits</Text>
        <View style={styles.benefitsGrid}>
          {BENEFITS.map((benefit, idx) => (
            <Card key={idx} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Ionicons
                  name={benefit.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>
                {benefit.description}
              </Text>
            </Card>
          ))}
        </View>

        {/* Requirements Checklist */}
        <Text style={styles.sectionTitle}>What to Look For</Text>
        <Card style={styles.checklistCard}>
          {REQUIREMENTS.map((req, idx) => (
            <View key={idx} style={styles.checklistItem}>
              <Ionicons
                name={req.important ? "alert-circle" : "checkmark-circle"}
                size={20}
                color={req.important ? "#F59E0B" : "#22C55E"}
              />
              <Text style={styles.checklistText}>{req.text}</Text>
            </View>
          ))}
        </Card>

        {/* Issuers That Report */}
        <Text style={styles.sectionTitle}>Issuers That Report AU Status</Text>
        <Card style={styles.issuersCard}>
          <View style={styles.issuersGrid}>
            {ISSUERS_THAT_REPORT.map((issuer, idx) => (
              <View key={idx} style={styles.issuerBadge}>
                <Ionicons name="checkmark" size={14} color="#22C55E" />
                <Text style={styles.issuerText}>{issuer}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Warnings */}
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <Text style={styles.warningTitle}>Important Considerations</Text>
          </View>
          <View style={styles.warningItem}>
            <Text style={styles.warningText}>
              • If the primary holder misses payments, it affects your credit
              too
            </Text>
          </View>
          <View style={styles.warningItem}>
            <Text style={styles.warningText}>
              • High utilization on the account can hurt your score
            </Text>
          </View>
          <View style={styles.warningItem}>
            <Text style={styles.warningText}>
              • You may need to be removed if the relationship changes
            </Text>
          </View>
        </Card>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/help/guides" as never)}
        >
          <Text style={styles.actionButtonText}>Read Full Guide</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

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
  impactCard: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    backgroundColor: "#D1FAE520",
  },
  impactTitle: { fontSize: 14, color: theme.colors.textSecondary },
  impactRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  impactValue: { fontSize: 36, fontWeight: "700", color: "#22C55E" },
  impactLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  impactNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: theme.spacing.md,
  },
  benefitCard: {
    width: "48%",
    margin: "1%",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  benefitDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  checklistCard: { marginBottom: theme.spacing.md },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  issuersCard: { marginBottom: theme.spacing.md },
  issuersGrid: { flexDirection: "row", flexWrap: "wrap" },
  issuerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE520",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  issuerText: { fontSize: 12, color: theme.colors.text, marginLeft: 4 },
  warningCard: { backgroundColor: "#FEF3C720", marginBottom: theme.spacing.lg },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 8,
  },
  warningItem: { marginBottom: 6 },
  warningText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
});
