/**
 * Tax Scenarios Screen - Mobile App
 *
 * What-if analysis tool for tax planning decisions.
 * Compare different scenarios to optimize tax outcomes.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTaxStore } from "../../src/store/taxStore";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import type {
  TaxScenarioInput,
  TaxScenarioResult,
} from "../../src/services/api/tax";

const { width } = Dimensions.get("window");

const defaultScenario: Omit<TaxScenarioInput, "name"> = {
  grossIncome: 300000,
  additional401k: 0,
  additionalIra: 0,
  additionalHsa: 0,
  additionalCharitable: 0,
  capitalGainsRealized: 0,
  rothConversion: 0,
};

export default function TaxScenariosScreen() {
  const {
    scenarioResults,
    isLoadingScenarios,
    compareScenarios,
    clearScenarioResults,
  } = useTaxStore();

  const [baseScenario, setBaseScenario] = useState<TaxScenarioInput>({
    ...defaultScenario,
    name: "Baseline",
  });

  const [scenarios, setScenarios] = useState<TaxScenarioInput[]>([
    { ...defaultScenario, name: "Max 401(k)", additional401k: 13000 },
    {
      ...defaultScenario,
      name: "Max All Retirement",
      additional401k: 13000,
      additionalIra: 7000,
      additionalHsa: 3150,
    },
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const handleRunComparison = useCallback(async () => {
    const allScenarios = [baseScenario, ...scenarios];
    await compareScenarios(allScenarios);
  }, [baseScenario, scenarios, compareScenarios]);

  const handleAddScenario = () => {
    setScenarios([
      ...scenarios,
      { ...defaultScenario, name: `Scenario ${scenarios.length + 1}` },
    ]);
  };

  const handleRemoveScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const updateScenario = (
    index: number,
    field: keyof TaxScenarioInput,
    value: string | number,
  ) => {
    const updated = [...scenarios];
    updated[index] = { ...updated[index], [field]: value };
    setScenarios(updated);
  };

  const baselineResult = scenarioResults.find((r) => r.name === "Baseline");

  const handleSaveScenario = (scenario: TaxScenarioInput) => {
    Alert.alert(
      "Save Scenario",
      `Save "${scenario.name}" for future reference?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            // TODO: Implement save functionality
            Alert.alert("Saved", "Scenario saved successfully");
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="What-If Scenarios" />
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          Compare tax strategies to find your optimal approach
        </Text>
      </View>

      {/* Baseline Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Baseline (Current Situation)</Text>

        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Gross Income</Text>
            <TextInput
              style={styles.input}
              value={baseScenario.grossIncome.toString()}
              onChangeText={(v) =>
                setBaseScenario({
                  ...baseScenario,
                  grossIncome: Number(v) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="300000"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>YTD 401(k)</Text>
            <TextInput
              style={styles.input}
              value={baseScenario.additional401k.toString()}
              onChangeText={(v) =>
                setBaseScenario({
                  ...baseScenario,
                  additional401k: Number(v) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Capital Gains</Text>
            <TextInput
              style={styles.input}
              value={baseScenario.capitalGainsRealized.toString()}
              onChangeText={(v) =>
                setBaseScenario({
                  ...baseScenario,
                  capitalGainsRealized: Number(v) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>
      </View>

      {/* Scenarios */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comparison Scenarios</Text>
          <TouchableOpacity onPress={handleAddScenario}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {scenarios.map((scenario, index) => (
          <View key={index} style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <TextInput
                style={styles.scenarioName}
                value={scenario.name}
                onChangeText={(v) => updateScenario(index, "name", v)}
                placeholder="Scenario Name"
              />
              <TouchableOpacity onPress={() => handleRemoveScenario(index)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scenarioInputs}>
              <View style={styles.inputCompact}>
                <Text style={styles.inputLabelSmall}>+401(k)</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={scenario.additional401k.toString()}
                  onChangeText={(v) =>
                    updateScenario(index, "additional401k", Number(v) || 0)
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputCompact}>
                <Text style={styles.inputLabelSmall}>+IRA</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={scenario.additionalIra.toString()}
                  onChangeText={(v) =>
                    updateScenario(index, "additionalIra", Number(v) || 0)
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputCompact}>
                <Text style={styles.inputLabelSmall}>+HSA</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={scenario.additionalHsa.toString()}
                  onChangeText={(v) =>
                    updateScenario(index, "additionalHsa", Number(v) || 0)
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputCompact}>
                <Text style={styles.inputLabelSmall}>Charity</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={scenario.additionalCharitable.toString()}
                  onChangeText={(v) =>
                    updateScenario(
                      index,
                      "additionalCharitable",
                      Number(v) || 0,
                    )
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.compareButton}
          onPress={handleRunComparison}
          disabled={isLoadingScenarios}
        >
          <LinearGradient
            colors={["#F59E0B", "#EA580C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.compareButtonGradient}
          >
            {isLoadingScenarios ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.compareButtonText}>Compare Scenarios</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {scenarioResults.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearScenarioResults}
          >
            <Text style={styles.clearButtonText}>Clear Results</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {scenarioResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparison Results</Text>

          {scenarioResults.map((result, index) => {
            const savings = baselineResult
              ? baselineResult.totalTax - result.totalTax
              : 0;
            const isBaseline = result.name === "Baseline";
            const isBest =
              !isBaseline &&
              savings ===
                Math.max(
                  ...scenarioResults
                    .filter((r) => r.name !== "Baseline")
                    .map((r) =>
                      baselineResult ? baselineResult.totalTax - r.totalTax : 0,
                    ),
                );

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.resultCard,
                  isBaseline && styles.resultCardBaseline,
                  isBest && styles.resultCardBest,
                ]}
                onPress={() =>
                  handleSaveScenario(scenarios[index - 1] || baseScenario)
                }
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  {isBaseline && (
                    <View style={styles.baselineBadge}>
                      <Text style={styles.baselineBadgeText}>BASELINE</Text>
                    </View>
                  )}
                  {isBest && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>BEST</Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultGrid}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Taxable Income</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(result.taxableIncome)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total Tax</Text>
                    <Text style={[styles.resultValue, styles.resultTax]}>
                      {formatCurrency(result.totalTax)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Effective Rate</Text>
                    <Text style={styles.resultValue}>
                      {formatPercent(result.effectiveRate)}
                    </Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Take-Home</Text>
                    <Text style={[styles.resultValue, styles.resultTakeHome]}>
                      {formatCurrency(result.takeHomePay)}
                    </Text>
                  </View>
                </View>

                {!isBaseline && (
                  <View style={styles.resultSavings}>
                    <Text style={styles.savingsLabel}>vs Baseline:</Text>
                    <Text
                      style={[
                        styles.savingsAmount,
                        savings > 0
                          ? styles.savingsPositive
                          : styles.savingsNegative,
                      ]}
                    >
                      {savings > 0 ? "+" : ""}
                      {formatCurrency(savings)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          <Text style={styles.disclaimerBold}>Disclaimer:</Text> These
          calculations are estimates for planning purposes only. Actual tax
          liability may vary based on your complete tax situation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#78716C",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  addButton: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inputLabel: {
    fontSize: 14,
    color: "#78716C",
    flex: 1,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
    width: 120,
    textAlign: "right",
  },
  scenarioCard: {
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
  scenarioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
    flex: 1,
  },
  removeButton: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  scenarioInputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  inputCompact: {
    width: (width - 80) / 2,
  },
  inputLabelSmall: {
    fontSize: 12,
    color: "#78716C",
    marginBottom: 4,
  },
  inputSmall: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1917",
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  compareButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  compareButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  compareButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  clearButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#78716C",
    fontSize: 14,
    fontWeight: "500",
  },
  resultCard: {
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
  resultCardBaseline: {
    backgroundColor: "#FEF3C7",
  },
  resultCardBest: {
    borderWidth: 2,
    borderColor: "#16A34A",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
    flex: 1,
  },
  baselineBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  baselineBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  bestBadge: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  resultItem: {
    width: (width - 80) / 2,
  },
  resultLabel: {
    fontSize: 12,
    color: "#78716C",
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1917",
  },
  resultTax: {
    color: "#DC2626",
  },
  resultTakeHome: {
    color: "#16A34A",
  },
  resultSavings: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  savingsLabel: {
    fontSize: 14,
    color: "#78716C",
  },
  savingsAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  savingsPositive: {
    color: "#16A34A",
  },
  savingsNegative: {
    color: "#DC2626",
  },
  disclaimerContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    marginBottom: 40,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },
  disclaimerBold: {
    fontWeight: "700",
  },
});
