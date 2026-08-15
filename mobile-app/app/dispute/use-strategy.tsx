import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { disputesAPI, DisputeStrategy } from "../../services/api";

const VARIABLE_LABELS: Record<string, string> = {
  DISPUTE_DETAILS: "Describe the disputed item",
  PREVIOUS_RESPONSES: "What responses have you received?",
  ESCALATION_LEVEL: "Current escalation level (1-3)",
  BUREAU_NAME: "Credit Bureau Name",
  CREDITOR_NAME: "Creditor/Furnisher Name",
  ACCOUNT_NUMBER: "Account Number",
  DISPUTE_DATE: "Original Dispute Date",
  VERIFICATION_DETAILS: "Verification method used",
  DEBT_AMOUNT: "Debt Amount",
  COLLECTOR_NAME: "Collection Agency Name",
  CONTACT_DATE: "Date of First Contact",
};

export default function UseStrategyScreen() {
  const router = useRouter();
  const { strategyId, strategyName } = useLocalSearchParams<{
    strategyId: string;
    strategyName: string;
  }>();
  const [strategy, setStrategy] = useState<DisputeStrategy | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    letter: string;
    nextSteps: string[];
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Define required variables based on strategy
  const getRequiredVariables = (id: string): string[] => {
    switch (id) {
      case "escalation_tactics":
        return [
          "DISPUTE_DETAILS",
          "PREVIOUS_RESPONSES",
          "ESCALATION_LEVEL",
          "BUREAU_NAME",
        ];
      case "mov_challenge":
        return [
          "DISPUTE_DETAILS",
          "BUREAU_NAME",
          "CREDITOR_NAME",
          "DISPUTE_DATE",
        ];
      case "furnisher_direct":
        return ["DISPUTE_DETAILS", "CREDITOR_NAME", "ACCOUNT_NUMBER"];
      case "debt_validation":
        return [
          "COLLECTOR_NAME",
          "DEBT_AMOUNT",
          "CONTACT_DATE",
          "ACCOUNT_NUMBER",
        ];
      case "hybrid_goodwill":
        return ["CREDITOR_NAME", "DISPUTE_DETAILS", "ACCOUNT_NUMBER"];
      default:
        return ["DISPUTE_DETAILS", "CREDITOR_NAME"];
    }
  };

  useEffect(() => {
    fetchStrategy();
  }, [strategyId]);

  const fetchStrategy = async () => {
    setLoading(true);
    // try/finally — a rejection here left the screen spinning forever.
    try {
      const { data } = await disputesAPI.getStrategy(strategyId || "");
      if (data?.strategy) {
        setStrategy(data.strategy);
        const requiredVars = getRequiredVariables(strategyId || "");
        const initial: Record<string, string> = {};
        requiredVars.forEach((v) => {
          initial[v] = "";
        });
        setVariables(initial);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLetter = async () => {
    const emptyFields = Object.entries(variables).filter(([_, v]) => !v.trim());
    if (emptyFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    setGenerating(true);
    const { data, error } = await disputesAPI.generateFromStrategy(
      strategyId || "",
      variables,
    );

    if (error) {
      Alert.alert("Error", error);
    } else if (data) {
      setResult({ letter: data.letter, nextSteps: data.nextSteps || [] });
    }
    setGenerating(false);
  };

  const handleSave = () => {
    Alert.alert(
      "Strategy Applied",
      "Your dispute has been created with this strategy!",
      [
        {
          text: "View Disputes",
          onPress: () => router.replace("/(tabs)/disputes" as never),
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={lightTheme.colors.primary} />
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setResult(null)}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={lightTheme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Strategy Result</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.resultContent}>
          {/* Steps Progress */}
          {strategy?.steps && (
            <View style={styles.stepsProgress}>
              <Text style={styles.progressTitle}>Strategy Progress</Text>
              {strategy.steps.map((step, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.progressStep,
                    currentStep >= i && styles.progressStepActive,
                  ]}
                  onPress={() => setCurrentStep(i)}
                >
                  <View
                    style={[
                      styles.progressDot,
                      currentStep >= i && styles.progressDotActive,
                    ]}
                  >
                    {currentStep > i ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.progressDotText}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={styles.progressInfo}>
                    <Text
                      style={[
                        styles.progressStepTitle,
                        currentStep >= i && styles.progressStepTitleActive,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.progressStepDesc}>
                      {step.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Generated Letter */}
          <View style={styles.letterSection}>
            <Text style={styles.sectionTitle}>
              📄 Generated Letter for Step {currentStep + 1}
            </Text>
            <View style={styles.letterBox}>
              <Text style={styles.letterText}>{result.letter}</Text>
            </View>
          </View>

          {/* Next Steps */}
          {result.nextSteps && result.nextSteps.length > 0 && (
            <View style={styles.nextStepsSection}>
              <Text style={styles.sectionTitle}>🎯 Next Steps</Text>
              {result.nextSteps.map((step, i) => (
                <View key={i} style={styles.nextStepItem}>
                  <View style={styles.nextStepNumber}>
                    <Text style={styles.nextStepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.nextStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Save & Track Progress</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const requiredVariables = getRequiredVariables(strategyId || "");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {strategyName || "Apply Strategy"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {strategy && (
          <>
            <View style={styles.strategyInfo}>
              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: "#16A34A20" }]}>
                  <Text style={[styles.badgeText, { color: "#16A34A" }]}>
                    {strategy.successRate}% success
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={lightTheme.colors.textSecondary}
                  />
                  <Text style={styles.badgeText}>{strategy.timeline}</Text>
                </View>
              </View>
              <Text style={styles.strategyDesc}>{strategy.description}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚖️ Legal Basis</Text>
              {strategy.legalBasis.map((law, i) => (
                <Text key={i} style={styles.legalItem}>
                  • {law}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Provide Details</Text>
              {requiredVariables.map((varName) => (
                <View key={varName} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {VARIABLE_LABELS[varName] || varName}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      varName === "DISPUTE_DETAILS" ||
                      varName === "PREVIOUS_RESPONSES"
                        ? styles.textArea
                        : null,
                    ]}
                    placeholder={`Enter ${(VARIABLE_LABELS[varName] || varName).toLowerCase()}`}
                    value={variables[varName] || ""}
                    onChangeText={(text) =>
                      setVariables((prev) => ({ ...prev, [varName]: text }))
                    }
                    placeholderTextColor={lightTheme.colors.textSecondary}
                    multiline={
                      varName === "DISPUTE_DETAILS" ||
                      varName === "PREVIOUS_RESPONSES"
                    }
                    numberOfLines={
                      varName === "DISPUTE_DETAILS" ||
                      varName === "PREVIOUS_RESPONSES"
                        ? 4
                        : 1
                    }
                  />
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, generating && styles.buttonDisabled]}
          onPress={handleGenerateLetter}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="flash" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.actionButtonText}>
            {generating ? "Generating..." : "Apply Strategy"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  centered: { justifyContent: "center", alignItems: "center" },
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
    flex: 1,
    marginHorizontal: 16,
  },
  content: { flex: 1, padding: 16 },
  strategyInfo: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: lightTheme.colors.background,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: { fontSize: 12, color: lightTheme.colors.textSecondary },
  strategyDesc: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 12,
  },
  legalItem: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginBottom: 6,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: lightTheme.colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: lightTheme.colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  footer: {
    padding: 16,
    backgroundColor: lightTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTheme.colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  buttonDisabled: { opacity: 0.6 },
  resultContent: { flex: 1, padding: 16 },
  stepsProgress: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 16,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    opacity: 0.6,
  },
  progressStepActive: { opacity: 1 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: lightTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  progressDotActive: { backgroundColor: lightTheme.colors.primary },
  progressDotText: {
    color: lightTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  progressInfo: { flex: 1 },
  progressStepTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: lightTheme.colors.textSecondary,
    marginBottom: 4,
  },
  progressStepTitleActive: { color: lightTheme.colors.text },
  progressStepDesc: { fontSize: 13, color: lightTheme.colors.textSecondary },
  letterSection: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  letterBox: {
    backgroundColor: lightTheme.colors.background,
    borderRadius: 8,
    padding: 12,
  },
  letterText: {
    fontSize: 13,
    color: lightTheme.colors.text,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  nextStepsSection: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  nextStepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  nextStepNumberText: {
    color: lightTheme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: lightTheme.colors.text,
    lineHeight: 20,
  },
});
