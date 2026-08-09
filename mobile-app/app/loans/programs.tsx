import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

const FEDERAL_PROGRAMS = [
  {
    id: "idr",
    name: "Income-Driven Repayment",
    description:
      "Pay based on your income and family size. Remaining balance forgiven after 20-25 years.",
    eligibility: "Federal Direct Loans",
    benefits: [
      "Lower monthly payments",
      "Forgiveness after 20-25 years",
      "Multiple plan options",
    ],
    icon: "cash-outline",
    color: "#4CAF50",
  },
  {
    id: "pslf",
    name: "Public Service Loan Forgiveness",
    description:
      "Forgiveness after 120 qualifying payments while working for qualifying employers.",
    eligibility: "Federal Direct Loans + Public Service Employment",
    benefits: [
      "Complete forgiveness after 10 years",
      "Tax-free forgiveness",
      "Works with IDR plans",
    ],
    icon: "business-outline",
    color: "#2196F3",
  },
  {
    id: "fresh_start",
    name: "Fresh Start Program",
    description:
      "One-time opportunity to get defaulted loans back in good standing.",
    eligibility: "Defaulted federal student loans",
    benefits: [
      "Remove default status",
      "Restore Title IV eligibility",
      "Stop wage garnishment",
    ],
    icon: "refresh-outline",
    color: "#9C27B0",
  },
  {
    id: "save",
    name: "SAVE Plan",
    description:
      "New income-driven plan with lowest payments and fastest forgiveness.",
    eligibility: "Federal Direct Loans",
    benefits: [
      "Payments as low as $0",
      "Interest subsidy",
      "Forgiveness in 10-20 years",
    ],
    icon: "shield-checkmark-outline",
    color: "#FF9800",
  },
  {
    id: "consolidation",
    name: "Direct Consolidation",
    description:
      "Combine multiple federal loans into one with a single monthly payment.",
    eligibility: "Multiple federal student loans",
    benefits: [
      "Single monthly payment",
      "Access to more repayment plans",
      "Fixed interest rate",
    ],
    icon: "git-merge-outline",
    color: "#607D8B",
  },
];

export default function LoanProgramsScreen() {
  const router = useRouter();
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const toggleProgram = (programId: string) => {
    setExpandedProgram(expandedProgram === programId ? null : programId);
  };

  const handleLearnMore = (programId: string) => {
    const urls: Record<string, string> = {
      idr: "https://studentaid.gov/manage-loans/repayment/plans/income-driven",
      pslf: "https://studentaid.gov/manage-loans/forgiveness-cancellation/public-service",
      fresh_start:
        "https://studentaid.gov/announcements-events/default-fresh-start",
      save: "https://studentaid.gov/announcements-events/save-plan",
      consolidation: "https://studentaid.gov/manage-loans/consolidation",
    };
    openExternalUrl(urls[programId] || "https://studentaid.gov");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Federal Programs</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.intro}>
          Explore federal student loan programs that can help reduce your
          payments or provide forgiveness.
        </Text>

        {FEDERAL_PROGRAMS.map((program) => (
          <TouchableOpacity
            key={program.id}
            style={styles.programCard}
            onPress={() => toggleProgram(program.id)}
            activeOpacity={0.8}
          >
            <View style={styles.programHeader}>
              <View
                style={[
                  styles.programIcon,
                  { backgroundColor: program.color + "20" },
                ]}
              >
                <Ionicons
                  name={program.icon as any}
                  size={28}
                  color={program.color}
                />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.name}</Text>
                <Text
                  style={styles.programDescription}
                  numberOfLines={expandedProgram === program.id ? undefined : 2}
                >
                  {program.description}
                </Text>
              </View>
              <Ionicons
                name={
                  expandedProgram === program.id ? "chevron-up" : "chevron-down"
                }
                size={24}
                color={lightTheme.colors.textSecondary}
              />
            </View>

            {expandedProgram === program.id && (
              <View style={styles.programDetails}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Eligibility</Text>
                  <Text style={styles.detailValue}>{program.eligibility}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Key Benefits</Text>
                  {program.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={program.color}
                      />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.learnMoreButton,
                    { backgroundColor: program.color },
                  ]}
                  onPress={() => handleLearnMore(program.id)}
                >
                  <Text style={styles.learnMoreText}>Learn More</Text>
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.helpCard}>
          <Ionicons
            name="help-circle-outline"
            size={32}
            color={lightTheme.colors.primary}
          />
          <Text style={styles.helpTitle}>Need Help Choosing?</Text>
          <Text style={styles.helpText}>
            Our AI assistant can analyze your loans and recommend the best
            program for your situation.
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Get Personalized Advice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { flex: 1, padding: 16 },
  intro: {
    fontSize: 16,
    color: lightTheme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 24,
  },
  programCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  programHeader: { flexDirection: "row", alignItems: "flex-start" },
  programIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  programInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  programName: {
    fontSize: 16,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginBottom: 4,
  },
  programDescription: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    lineHeight: 20,
  },
  programDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  detailSection: { marginBottom: 16 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: lightTheme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  detailValue: { fontSize: 14, color: lightTheme.colors.text },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  benefitText: { fontSize: 14, color: lightTheme.colors.text },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  learnMoreText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  helpCard: {
    backgroundColor: lightTheme.colors.primary + "10",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: lightTheme.colors.text,
    marginTop: 12,
  },
  helpText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  helpButton: {
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  helpButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
