/**
 * Bill Negotiator Mobile Screen - Phase 2.6.5
 * AI-powered bill negotiation assistant with scripts and outcome tracking
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Clipboard,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width } = Dimensions.get("window");

// TypeScript Interfaces
interface Bill {
  id: string;
  provider: string;
  category: string;
  currentAmount: number;
  dueDate: string;
  frequency: "monthly" | "quarterly" | "annual";
  negotiationPotential: "high" | "medium" | "low";
  lastNegotiated?: string;
  status: "active" | "negotiating" | "completed";
}

interface NegotiationScript {
  id: string;
  billId: string;
  script: string;
  talkingPoints: string[];
  competitorPricing: CompetitorPrice[];
  estimatedSavings: number;
  confidence: number;
  generatedAt: string;
}

interface CompetitorPrice {
  provider: string;
  price: number;
  features: string[];
}

interface NegotiationOutcome {
  billId: string;
  success: boolean;
  newRate?: number;
  savingsAmount?: number;
  notes?: string;
  followUpDate?: string;
}

interface MarketAnalysis {
  category: string;
  averagePrice: number;
  yourPrice: number;
  percentAboveAverage: number;
  topCompetitors: CompetitorPrice[];
}

/**
 * BillsList Component
 * Sortable and filterable list of bills
 */
interface BillsListProps {
  bills: Bill[];
  onSelectBill: (bill: Bill) => void;
  sortBy: "potential" | "amount" | "dueDate";
  onSortChange: (sort: "potential" | "amount" | "dueDate") => void;
}

const BillsList: React.FC<BillsListProps> = ({
  bills,
  onSelectBill,
  sortBy,
  onSortChange,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getPotentialColor = (potential: string): string => {
    switch (potential) {
      case "high":
        return theme.colors.success;
      case "medium":
        return theme.colors.warning;
      case "low":
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "negotiating":
        return "time";
      default:
        return "document-text";
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    switch (sortBy) {
      case "potential":
        const potentialOrder = { high: 3, medium: 2, low: 1 };
        return (
          potentialOrder[b.negotiationPotential] -
          potentialOrder[a.negotiationPotential]
        );
      case "amount":
        return b.currentAmount - a.currentAmount;
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      default:
        return 0;
    }
  });

  return (
    <Card style={styles.billsListCard}>
      <View style={styles.listHeader}>
        <Text style={styles.cardTitle}>Your Bills</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "potential" && styles.sortButtonActive,
            ]}
            onPress={() => onSortChange("potential")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "potential" && styles.sortButtonTextActive,
              ]}
            >
              Potential
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "amount" && styles.sortButtonActive,
            ]}
            onPress={() => onSortChange("amount")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "amount" && styles.sortButtonTextActive,
              ]}
            >
              Amount
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "dueDate" && styles.sortButtonActive,
            ]}
            onPress={() => onSortChange("dueDate")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "dueDate" && styles.sortButtonTextActive,
              ]}
            >
              Due Date
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sortedBills.map((bill) => (
        <TouchableOpacity
          key={bill.id}
          style={styles.billItem}
          onPress={() => onSelectBill(bill)}
        >
          <View style={styles.billHeader}>
            <View style={styles.billTitleRow}>
              <Ionicons
                name={getStatusIcon(bill.status)}
                size={24}
                color={getPotentialColor(bill.negotiationPotential)}
              />
              <View style={styles.billInfo}>
                <Text style={styles.billProvider}>{bill.provider}</Text>
                <Text style={styles.billCategory}>{bill.category}</Text>
              </View>
            </View>
            <View style={styles.billAmountContainer}>
              <Text style={styles.billAmount}>
                {formatCurrency(bill.currentAmount)}
              </Text>
              <Text style={styles.billFrequency}>/{bill.frequency}</Text>
            </View>
          </View>

          <View style={styles.billMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>
                Due {formatDate(bill.dueDate)}
              </Text>
            </View>
            <View
              style={[
                styles.potentialBadge,
                {
                  backgroundColor:
                    getPotentialColor(bill.negotiationPotential) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.potentialText,
                  { color: getPotentialColor(bill.negotiationPotential) },
                ]}
              >
                {bill.negotiationPotential.toUpperCase()} potential
              </Text>
            </View>
          </View>

          <View style={styles.billAction}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.billActionText}>Start Negotiation</Text>
          </View>
        </TouchableOpacity>
      ))}
    </Card>
  );
};

/**
 * NegotiationCard Component
 * Step-by-step negotiation workflow
 */
interface NegotiationCardProps {
  bill: Bill;
  script: NegotiationScript | null;
  onGenerateScript: () => void;
  onRecordOutcome: (outcome: NegotiationOutcome) => void;
  onClose: () => void;
}

const NegotiationCard: React.FC<NegotiationCardProps> = ({
  bill,
  script,
  onGenerateScript,
  onRecordOutcome,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [outcome, setOutcome] = useState<Partial<NegotiationOutcome>>({
    billId: bill.id,
    success: false,
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmitOutcome = () => {
    if (outcome.success && !outcome.newRate) {
      Alert.alert("Error", "Please enter the new rate");
      return;
    }

    const finalOutcome: NegotiationOutcome = {
      billId: bill.id,
      success: outcome.success || false,
      newRate: outcome.newRate,
      savingsAmount: outcome.newRate
        ? bill.currentAmount - outcome.newRate
        : undefined,
      notes: outcome.notes,
      followUpDate: outcome.followUpDate,
    };

    onRecordOutcome(finalOutcome);
    onClose();
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Negotiate {bill.provider}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                s === step && styles.stepDotActive,
                s < step && styles.stepDotCompleted,
              ]}
            >
              {s < step ? (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    s === step && styles.stepNumberActive,
                  ]}
                >
                  {s}
                </Text>
              )}
            </View>
          ))}
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Step 1: Review */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Step 1: Review Bill Details</Text>
              <Card style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Provider</Text>
                  <Text style={styles.reviewValue}>{bill.provider}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Category</Text>
                  <Text style={styles.reviewValue}>{bill.category}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Current Amount</Text>
                  <Text
                    style={[styles.reviewValue, { color: theme.colors.error }]}
                  >
                    {formatCurrency(bill.currentAmount)}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Frequency</Text>
                  <Text style={styles.reviewValue}>{bill.frequency}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Negotiation Potential</Text>
                  <Text
                    style={[
                      styles.reviewValue,
                      {
                        color:
                          bill.negotiationPotential === "high"
                            ? theme.colors.success
                            : theme.colors.warning,
                      },
                    ]}
                  >
                    {bill.negotiationPotential.toUpperCase()}
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {/* Step 2: Generate Script */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Step 2: AI Negotiation Script
              </Text>
              {!script ? (
                <View style={styles.generateContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={64}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.generateText}>
                    Generate a personalized negotiation script
                  </Text>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={onGenerateScript}
                  >
                    <Ionicons name="sparkles" size={20} color="#FFF" />
                    <Text style={styles.generateButtonText}>
                      Generate Script
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScriptViewer script={script} />
              )}
            </View>
          )}

          {/* Step 3: Negotiate */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Step 3: Make the Call</Text>
              <Card style={styles.negotiateCard}>
                <Ionicons
                  name="call-outline"
                  size={48}
                  color={theme.colors.primary}
                />
                <Text style={styles.negotiateTitle}>Ready to negotiate?</Text>
                <Text style={styles.negotiateText}>
                  Use the script from Step 2 to guide your conversation.
                  Remember to:
                </Text>
                <View style={styles.tipsList}>
                  <View style={styles.tipItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.tipText}>
                      Be polite and professional
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.tipText}>
                      Mention competitor pricing
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.tipText}>
                      Ask for retention department
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.tipText}>Be willing to walk away</Text>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Step 4: Record Outcome */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Step 4: Record Outcome</Text>
              <Card style={styles.outcomeCard}>
                <Text style={styles.outcomeLabel}>
                  Was the negotiation successful?
                </Text>
                <View style={styles.outcomeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.outcomeButton,
                      outcome.success === true && styles.outcomeButtonSuccess,
                    ]}
                    onPress={() => setOutcome({ ...outcome, success: true })}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={
                        outcome.success === true ? "#FFF" : theme.colors.success
                      }
                    />
                    <Text
                      style={[
                        styles.outcomeButtonText,
                        outcome.success === true &&
                          styles.outcomeButtonTextActive,
                      ]}
                    >
                      Success
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.outcomeButton,
                      outcome.success === false && styles.outcomeButtonFailed,
                    ]}
                    onPress={() => setOutcome({ ...outcome, success: false })}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={
                        outcome.success === false ? "#FFF" : theme.colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.outcomeButtonText,
                        outcome.success === false &&
                          styles.outcomeButtonTextActive,
                      ]}
                    >
                      Not Successful
                    </Text>
                  </TouchableOpacity>
                </View>

                {outcome.success === true && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>New Monthly Rate *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={outcome.newRate?.toString() || ""}
                        onChangeText={(text) =>
                          setOutcome({
                            ...outcome,
                            newRate: parseFloat(text) || undefined,
                          })
                        }
                        keyboardType="numeric"
                        placeholder="Enter new rate"
                        placeholderTextColor={theme.colors.textSecondary}
                      />
                    </View>

                    {outcome.newRate && (
                      <SavingsDisplay
                        currentAmount={bill.currentAmount}
                        newAmount={outcome.newRate}
                      />
                    )}
                  </>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={outcome.notes || ""}
                    onChangeText={(text) =>
                      setOutcome({ ...outcome, notes: text })
                    }
                    placeholder="Add any notes about the negotiation"
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {outcome.success === false && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Follow-up Date</Text>
                    <TextInput
                      style={styles.formInput}
                      value={outcome.followUpDate || ""}
                      onChangeText={(text) =>
                        setOutcome({ ...outcome, followUpDate: text })
                      }
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                )}
              </Card>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 4 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitOutcome}
            >
              <Text style={styles.submitButtonText}>Submit Outcome</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

/**
 * ScriptViewer Component
 * Display AI-generated script with copy functionality
 */
interface ScriptViewerProps {
  script: NegotiationScript;
}

const ScriptViewer: React.FC<ScriptViewerProps> = ({ script }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCopy = () => {
    Clipboard.setString(script.script);
    Alert.alert("Copied!", "Script copied to clipboard");
  };

  return (
    <View>
      <Card style={styles.scriptCard}>
        <View style={styles.scriptHeader}>
          <Text style={styles.scriptTitle}>Your Negotiation Script</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
            <Ionicons
              name="copy-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.scriptText}>{script.script}</Text>

        <View style={styles.scriptMeta}>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {(script.confidence * 100).toFixed(0)}% confidence
            </Text>
          </View>
          <View style={styles.savingsBadge}>
            <Ionicons name="cash" size={16} color={theme.colors.success} />
            <Text style={styles.savingsText}>
              Est. {formatCurrency(script.estimatedSavings)} savings
            </Text>
          </View>
        </View>
      </Card>

      {/* Talking Points */}
      <Card style={styles.talkingPointsCard}>
        <Text style={styles.cardTitle}>Key Talking Points</Text>
        {script.talkingPoints.map((point, index) => (
          <View key={index} style={styles.talkingPoint}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.talkingPointText}>{point}</Text>
          </View>
        ))}
      </Card>

      {/* Competitor Pricing */}
      {script.competitorPricing.length > 0 && (
        <Card style={styles.competitorCard}>
          <Text style={styles.cardTitle}>Competitor Pricing</Text>
          {script.competitorPricing.map((comp, index) => (
            <View key={index} style={styles.competitorItem}>
              <View style={styles.competitorHeader}>
                <Text style={styles.competitorName}>{comp.provider}</Text>
                <Text style={styles.competitorPrice}>
                  {formatCurrency(comp.price)}/mo
                </Text>
              </View>
              <View style={styles.competitorFeatures}>
                {comp.features.slice(0, 3).map((feature, idx) => (
                  <Text key={idx} style={styles.competitorFeature}>
                    • {feature}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
};

/**
 * SavingsDisplay Component
 * Before/after comparison
 */
interface SavingsDisplayProps {
  currentAmount: number;
  newAmount: number;
}

const SavingsDisplay: React.FC<SavingsDisplayProps> = ({
  currentAmount,
  newAmount,
}) => {
  const savings = currentAmount - newAmount;
  const savingsPercentage = ((savings / currentAmount) * 100).toFixed(1);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card style={styles.savingsCard}>
      <Text style={styles.savingsTitle}>Your Savings</Text>
      <View style={styles.savingsComparison}>
        <View style={styles.savingsColumn}>
          <Text style={styles.savingsLabel}>Before</Text>
          <Text style={[styles.savingsAmount, { color: theme.colors.error }]}>
            {formatCurrency(currentAmount)}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={24} color={theme.colors.success} />
        <View style={styles.savingsColumn}>
          <Text style={styles.savingsLabel}>After</Text>
          <Text style={[styles.savingsAmount, { color: theme.colors.success }]}>
            {formatCurrency(newAmount)}
          </Text>
        </View>
      </View>
      <View style={styles.savingsSummary}>
        <Ionicons name="trending-down" size={32} color={theme.colors.success} />
        <View style={styles.savingsSummaryText}>
          <Text style={styles.savingsSummaryAmount}>
            {formatCurrency(savings)}/month
          </Text>
          <Text style={styles.savingsSummaryPercentage}>
            {savingsPercentage}% savings
          </Text>
        </View>
      </View>
    </Card>
  );
};

/**
 * Main BillNegotiatorScreen Component
 */
export default function BillNegotiatorScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [script, setScript] = useState<NegotiationScript | null>(null);
  const [sortBy, setSortBy] = useState<"potential" | "amount" | "dueDate">(
    "potential",
  );
  const [generatingScript, setGeneratingScript] = useState(false);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/financial/bills");

      if (response.ok) {
        const data = await response.json();
        setBills(data.bills || []);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
      Alert.alert("Error", "Failed to load bills. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBills();
  }, [fetchBills]);

  const handleSelectBill = (bill: Bill) => {
    setSelectedBill(bill);
    setScript(null);
  };

  const handleGenerateScript = async () => {
    if (!selectedBill) return;

    try {
      setGeneratingScript(true);
      const response = await fetch(
        `/api/financial/bills/${selectedBill.id}/negotiate`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setScript(data.script);
      } else {
        Alert.alert("Error", "Failed to generate script. Please try again.");
      }
    } catch (error) {
      console.error("Error generating script:", error);
      Alert.alert("Error", "Failed to generate script. Please try again.");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleRecordOutcome = async (outcome: NegotiationOutcome) => {
    try {
      const response = await fetch(
        `/api/financial/bills/${outcome.billId}/outcome`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(outcome),
        },
      );

      if (response.ok) {
        Alert.alert(
          "Success!",
          outcome.success
            ? `Great! You saved ${outcome.savingsAmount ? `$${outcome.savingsAmount.toLocaleString()}` : "money"} per month!`
            : "Outcome recorded. Try again later or with a different approach.",
        );
        setSelectedBill(null);
        setScript(null);
        fetchBills();
      } else {
        Alert.alert("Error", "Failed to record outcome. Please try again.");
      }
    } catch (error) {
      console.error("Error recording outcome:", error);
      Alert.alert("Error", "Failed to record outcome. Please try again.");
    }
  };

  if (loading && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        <BillsList
          bills={bills}
          onSelectBill={handleSelectBill}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </ScrollView>

      {selectedBill && (
        <NegotiationCard
          bill={selectedBill}
          script={script}
          onGenerateScript={handleGenerateScript}
          onRecordOutcome={handleRecordOutcome}
          onClose={() => {
            setSelectedBill(null);
            setScript(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  // BillsList styles
  billsListCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  listHeader: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sortButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  sortButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  billItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  billTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  billInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  billProvider: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  billCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },
  billAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  billFrequency: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  billMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  potentialBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  potentialText: {
    fontSize: 11,
    fontWeight: "600",
  },
  billAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  billActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalBody: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  modalFooter: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  stepDotCompleted: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  stepNumberActive: {
    color: "#FFF",
  },
  // Step content
  stepContent: {
    marginBottom: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  // Review card
  reviewCard: {
    padding: theme.spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reviewLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  // Generate script
  generateContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
  },
  generateText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  // Script viewer
  scriptCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  scriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  scriptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  scriptText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  scriptMeta: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.success + "10",
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.success,
  },
  // Talking points
  talkingPointsCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  talkingPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  talkingPointText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  // Competitor pricing
  competitorCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  competitorItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  competitorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  competitorName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  competitorPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.success,
  },
  competitorFeatures: {
    marginLeft: theme.spacing.md,
  },
  competitorFeature: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Negotiate step
  negotiateCard: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  negotiateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  negotiateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  tipsList: {
    width: "100%",
    gap: theme.spacing.md,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  // Outcome step
  outcomeCard: {
    padding: theme.spacing.lg,
  },
  outcomeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  outcomeButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  outcomeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  outcomeButtonSuccess: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  outcomeButtonFailed: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  outcomeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  outcomeButtonTextActive: {
    color: "#FFF",
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  formTextArea: {
    height: 100,
    paddingTop: theme.spacing.md,
    textAlignVertical: "top",
  },
  // Savings display
  savingsCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.success + "10",
    marginBottom: theme.spacing.md,
  },
  savingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  savingsComparison: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  savingsColumn: {
    alignItems: "center",
  },
  savingsLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 20,
    fontWeight: "bold",
  },
  savingsSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.success + "30",
  },
  savingsSummaryText: {
    alignItems: "flex-start",
  },
  savingsSummaryAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.success,
  },
  savingsSummaryPercentage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  // Footer buttons
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  submitButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.success,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
