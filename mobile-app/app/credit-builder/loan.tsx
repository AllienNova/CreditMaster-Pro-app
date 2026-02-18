/**
 * Fynvita Credit Builder Loans Screen
 * AI-powered matching, detailed comparisons, and step-by-step guidance
 * Features loan comparison, ROI calculations, and application guidance
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { LineChart } from "../../src/components/charts";

// Types
interface CreditBuilderLoan {
  id: string;
  provider: string;
  name: string;
  loanAmount: number;
  monthlyPayment: number;
  term: number;
  apr: number;
  requirements: {
    minCreditScore?: number;
    employmentRequired: boolean;
    bankAccountRequired: boolean;
  };
  benefits: string[];
  reporting: string[];
  fees: {
    application?: number;
    monthly?: number;
    closing?: number;
  };
  recommended: boolean;
  aiReasoning: string;
  rating: number;
  website?: string;
}

// Mock loan data
const CREDIT_BUILDER_LOANS: CreditBuilderLoan[] = [
  {
    id: "cbl-1",
    provider: "Self",
    name: "Credit Builder Account",
    loanAmount: 1000,
    monthlyPayment: 48,
    term: 24,
    apr: 15.92,
    requirements: {
      employmentRequired: false,
      bankAccountRequired: true,
    },
    benefits: [
      "No credit check required",
      "Reports to all 3 bureaus",
      "Build savings while building credit",
      "Average 49-point increase",
    ],
    reporting: ["Experian", "Equifax", "TransUnion"],
    fees: {
      application: 0,
      monthly: 0,
      closing: 0,
    },
    recommended: true,
    aiReasoning:
      "Recommended for beginners with no credit history. No credit check makes approval virtually guaranteed, and reporting to all 3 bureaus maximizes impact.",
    rating: 4.8,
    website: "https://self.inc",
  },
  {
    id: "cbl-2",
    provider: "MoneyLion",
    name: "Credit Builder Plus",
    loanAmount: 1000,
    monthlyPayment: 19.99,
    term: 12,
    apr: 5.99,
    requirements: {
      employmentRequired: true,
      bankAccountRequired: true,
    },
    benefits: [
      "Low APR",
      "Fast credit building",
      "Managed investment account",
      "Cash advances available",
    ],
    reporting: ["Experian", "Equifax", "TransUnion"],
    fees: {
      monthly: 19.99,
    },
    recommended: false,
    aiReasoning:
      "Best for employed individuals seeking fast results. Lower APR saves money, but requires employment verification.",
    rating: 4.3,
    website: "https://moneylion.com",
  },
  {
    id: "cbl-3",
    provider: "Kikoff",
    name: "Credit Account",
    loanAmount: 500,
    monthlyPayment: 5,
    term: 12,
    apr: 0,
    requirements: {
      minCreditScore: 300,
      employmentRequired: false,
      bankAccountRequired: true,
    },
    benefits: [
      "0% APR",
      "Lowest monthly payment",
      "Reports to all 3 bureaus",
      "No credit check",
    ],
    reporting: ["Experian", "Equifax", "TransUnion"],
    fees: {
      application: 0,
      monthly: 0,
    },
    recommended: true,
    aiReasoning:
      "0% APR makes this the most affordable option. Perfect for those on tight budgets who want to build credit slowly.",
    rating: 4.7,
    website: "https://kikoff.com",
  },
  {
    id: "cbl-4",
    provider: "Chime",
    name: "Credit Builder",
    loanAmount: 200,
    monthlyPayment: 0,
    term: 0,
    apr: 0,
    requirements: {
      employmentRequired: false,
      bankAccountRequired: true,
    },
    benefits: [
      "No credit check",
      "No fees whatsoever",
      "No minimum security deposit",
      "Automatic payment reporting",
    ],
    reporting: ["Experian", "Equifax", "TransUnion"],
    fees: {
      application: 0,
      monthly: 0,
    },
    recommended: true,
    aiReasoning:
      "Zero-cost credit building through their secured card. Great for those who already use Chime banking.",
    rating: 4.6,
    website: "https://chime.com",
  },
];

// Credit impact projection data
const CREDIT_IMPACT_DATA = [
  { value: 580, label: "Start" },
  { value: 595, label: "3 mo" },
  { value: 615, label: "6 mo" },
  { value: 640, label: "9 mo" },
  { value: 670, label: "12 mo" },
];

// How it works steps
const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Apply",
    description: "Choose a loan amount and submit your application online",
    icon: "document-text",
  },
  {
    step: 2,
    title: "Get Approved",
    description: "Most approvals happen instantly, even with no credit",
    icon: "checkmark-circle",
  },
  {
    step: 3,
    title: "Make Payments",
    description:
      "Your payments are held in a savings account and reported to bureaus",
    icon: "calendar",
  },
  {
    step: 4,
    title: "Build Credit",
    description:
      "After completing payments, receive your savings plus interest",
    icon: "trending-up",
  },
];

export default function CreditBuilderLoanScreen() {
  const [loans, setLoans] = useState<CreditBuilderLoan[]>(CREDIT_BUILDER_LOANS);
  const [loading, setLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<CreditBuilderLoan | null>(
    null,
  );
  const [compareLoans, setCompareLoans] = useState<CreditBuilderLoan[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleCompare = (loan: CreditBuilderLoan) => {
    if (compareLoans.find((l) => l.id === loan.id)) {
      setCompareLoans(compareLoans.filter((l) => l.id !== loan.id));
    } else if (compareLoans.length < 3) {
      setCompareLoans([...compareLoans, loan]);
    }
  };

  const calculateTotalCost = (loan: CreditBuilderLoan) => {
    const totalPayments = loan.monthlyPayment * loan.term;
    const applicationFee = loan.fees.application || 0;
    const closingFee = loan.fees.closing || 0;
    return totalPayments + applicationFee + closingFee;
  };

  const calculateTotalInterest = (loan: CreditBuilderLoan) => {
    return Math.max(0, calculateTotalCost(loan) - loan.loanAmount);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#F59E0B" />);
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#F59E0B" />,
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#F59E0B"
        />,
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Loading credit builder loans...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Credit Builder Loans</Text>
          {compareLoans.length > 0 ? (
            <TouchableOpacity onPress={() => setShowComparison(true)}>
              <View style={styles.compareBadge}>
                <Text style={styles.compareBadgeText}>
                  {compareLoans.length}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.infoTitle}>All 3 Bureaus</Text>
              <Text style={styles.infoSubtext}>Maximum impact</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="wallet" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>Build Savings</Text>
              <Text style={styles.infoSubtext}>Get money back</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="trending-up" size={24} color="#8B5CF6" />
              <Text style={styles.infoTitle}>+49 Points</Text>
              <Text style={styles.infoSubtext}>Average increase</Text>
            </View>
          </View>
        </Card>

        {/* AI Recommendation Banner */}
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>AI Recommendation</Text>
              <Text style={styles.aiText}>
                Based on your credit profile, we recommend starting with a{" "}
                <Text style={styles.aiBold}>no credit check</Text> option that
                reports to all 3 bureaus.
              </Text>
            </View>
          </View>
        </Card>

        {/* Credit Impact Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Typical Credit Impact</Text>
          <LineChart
            data={CREDIT_IMPACT_DATA}
            height={140}
            color={theme.colors.success}
            showDots
            showLabels
            minValue={560}
            maxValue={700}
          />
          <Text style={styles.chartNote}>
            Based on 12 months of on-time payments with a credit builder loan
          </Text>
        </Card>

        {/* Loan Cards */}
        <Text style={styles.sectionTitle}>Available Loans</Text>
        {loans.map((loan) => (
          <TouchableOpacity
            key={loan.id}
            onPress={() => setSelectedLoan(loan)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.loanCard,
                loan.recommended && styles.loanCardRecommended,
                compareLoans.find((l) => l.id === loan.id) &&
                  styles.loanCardCompare,
              ]}
            >
              {/* Recommended Badge */}
              {loan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.recommendedText}>AI Recommended</Text>
                </View>
              )}

              {/* Loan Header */}
              <View style={styles.loanHeader}>
                <View style={styles.loanProviderInfo}>
                  <Text style={styles.loanProvider}>{loan.provider}</Text>
                  <Text style={styles.loanName}>{loan.name}</Text>
                  <View style={styles.ratingRow}>
                    {renderStars(loan.rating)}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleCompare(loan);
                  }}
                  style={[
                    styles.compareButton,
                    compareLoans.find((l) => l.id === loan.id) &&
                      styles.compareButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.compareButtonText,
                      compareLoans.find((l) => l.id === loan.id) &&
                        styles.compareButtonTextActive,
                    ]}
                  >
                    {compareLoans.find((l) => l.id === loan.id)
                      ? "Added"
                      : "Compare"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* AI Reasoning */}
              {loan.aiReasoning && (
                <View style={styles.reasoningBox}>
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.reasoningText}>{loan.aiReasoning}</Text>
                </View>
              )}

              {/* Loan Stats */}
              <View style={styles.loanStats}>
                <View style={styles.loanStat}>
                  <Text style={styles.loanStatValue}>
                    ${loan.loanAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.loanStatLabel}>Loan Amount</Text>
                </View>
                <View style={styles.loanStat}>
                  <Text style={styles.loanStatValue}>
                    ${loan.monthlyPayment > 0 ? loan.monthlyPayment : "Varies"}
                  </Text>
                  <Text style={styles.loanStatLabel}>Monthly</Text>
                </View>
                <View style={styles.loanStat}>
                  <Text style={styles.loanStatValue}>
                    {loan.term > 0 ? `${loan.term} mo` : "Flexible"}
                  </Text>
                  <Text style={styles.loanStatLabel}>Term</Text>
                </View>
                <View style={styles.loanStat}>
                  <Text
                    style={[
                      styles.loanStatValue,
                      loan.apr === 0 && styles.freeText,
                    ]}
                  >
                    {loan.apr}%
                  </Text>
                  <Text style={styles.loanStatLabel}>APR</Text>
                </View>
              </View>

              {/* Benefits Preview */}
              <View style={styles.benefitsPreview}>
                {loan.benefits.slice(0, 2).map((benefit, idx) => (
                  <View key={idx} style={styles.benefitRow}>
                    <Ionicons name="checkmark" size={14} color="#22C55E" />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>

              {/* Bureau Reporting */}
              <View style={styles.bureauRow}>
                <Text style={styles.bureauLabel}>Reports to:</Text>
                <View style={styles.bureauTags}>
                  {loan.reporting.map((bureau, idx) => (
                    <View key={idx} style={styles.bureauTag}>
                      <Text style={styles.bureauTagText}>{bureau}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* View Details Button */}
              <View style={styles.viewDetailsRow}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* How It Works */}
        <Card style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>How Credit Builder Loans Work</Text>
          {HOW_IT_WORKS.map((step, idx) => (
            <View
              key={step.step}
              style={[
                styles.stepRow,
                idx < HOW_IT_WORKS.length - 1 && styles.stepRowBorder,
              ]}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              <Ionicons
                name={step.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={theme.colors.primary}
              />
            </View>
          ))}
        </Card>

        {/* Tips Card */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Success</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Set up autopay to never miss a payment
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              After 6-12 months, you may qualify for unsecured credit
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Credit builder loans work best alongside responsible card use
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Your payments build a savings fund you get back at the end
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Loan Detail Modal */}
      <Modal visible={selectedLoan !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalProvider}>
                  {selectedLoan?.provider}
                </Text>
                <Text style={styles.modalName}>{selectedLoan?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLoan(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Stats Grid */}
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>
                    ${selectedLoan?.loanAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.modalStatLabel}>Loan Amount</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>
                    ${selectedLoan?.monthlyPayment}
                  </Text>
                  <Text style={styles.modalStatLabel}>Monthly Payment</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>
                    {selectedLoan?.term} mo
                  </Text>
                  <Text style={styles.modalStatLabel}>Term</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>
                    {selectedLoan?.apr}%
                  </Text>
                  <Text style={styles.modalStatLabel}>APR</Text>
                </View>
              </View>

              {/* Cost Breakdown */}
              {selectedLoan && (
                <Card style={styles.costCard}>
                  <Text style={styles.costTitle}>Cost Breakdown</Text>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total Payments</Text>
                    <Text style={styles.costValue}>
                      $
                      {(
                        selectedLoan.monthlyPayment * selectedLoan.term
                      ).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total Interest</Text>
                    <Text style={styles.costValue}>
                      ${calculateTotalInterest(selectedLoan).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>You Get Back</Text>
                    <Text style={[styles.costValue, styles.positiveValue]}>
                      ${selectedLoan.loanAmount.toLocaleString()}
                    </Text>
                  </View>
                </Card>
              )}

              {/* Requirements */}
              <Text style={styles.modalSectionTitle}>Requirements</Text>
              <View style={styles.requirementsList}>
                {selectedLoan?.requirements.minCreditScore && (
                  <View style={styles.requirementRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22C55E"
                    />
                    <Text style={styles.requirementText}>
                      Min Credit Score:{" "}
                      {selectedLoan.requirements.minCreditScore}
                    </Text>
                  </View>
                )}
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={
                      selectedLoan?.requirements.employmentRequired
                        ? "alert-circle"
                        : "checkmark-circle"
                    }
                    size={18}
                    color={
                      selectedLoan?.requirements.employmentRequired
                        ? "#F59E0B"
                        : "#22C55E"
                    }
                  />
                  <Text style={styles.requirementText}>
                    {selectedLoan?.requirements.employmentRequired
                      ? "Employment Required"
                      : "No Employment Required"}
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={styles.requirementText}>
                    Bank Account Required
                  </Text>
                </View>
              </View>

              {/* Benefits */}
              <Text style={styles.modalSectionTitle}>Benefits</Text>
              <View style={styles.benefitsList}>
                {selectedLoan?.benefits.map((benefit, idx) => (
                  <View key={idx} style={styles.benefitItemModal}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22C55E"
                    />
                    <Text style={styles.benefitTextModal}>{benefit}</Text>
                  </View>
                ))}
              </View>

              {/* Application Steps */}
              <Card style={styles.applicationCard}>
                <Text style={styles.applicationTitle}>How to Apply</Text>
                <View style={styles.applicationSteps}>
                  <Text style={styles.applicationStep}>
                    1. Click "Apply Now" below
                  </Text>
                  <Text style={styles.applicationStep}>
                    2. Provide basic personal information
                  </Text>
                  <Text style={styles.applicationStep}>
                    3. Link your bank account
                  </Text>
                  <Text style={styles.applicationStep}>
                    4. Choose your loan amount and term
                  </Text>
                  <Text style={styles.applicationStep}>
                    5. Get instant approval decision
                  </Text>
                </View>
              </Card>

              {/* Apply Button */}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  if (selectedLoan?.website) {
                    Linking.openURL(selectedLoan.website);
                  }
                }}
              >
                <Text style={styles.applyButtonText}>Apply Now</Text>
                <Ionicons name="open-outline" size={20} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                This will open {selectedLoan?.provider}'s secure application
                page. Fynvita may receive a commission.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comparison Modal */}
      <Modal visible={showComparison} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compare Loans</Text>
              <TouchableOpacity onPress={() => setShowComparison(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.comparisonTable}>
                {compareLoans.map((loan) => (
                  <View key={loan.id} style={styles.comparisonColumn}>
                    <Text style={styles.comparisonProvider}>
                      {loan.provider}
                    </Text>
                    <Text style={styles.comparisonName}>{loan.name}</Text>

                    <View style={styles.comparisonDivider} />

                    <Text style={styles.comparisonLabel}>Loan Amount</Text>
                    <Text style={styles.comparisonValue}>
                      ${loan.loanAmount.toLocaleString()}
                    </Text>

                    <Text style={styles.comparisonLabel}>Monthly Payment</Text>
                    <Text style={styles.comparisonValue}>
                      ${loan.monthlyPayment}
                    </Text>

                    <Text style={styles.comparisonLabel}>Term</Text>
                    <Text style={styles.comparisonValue}>
                      {loan.term} months
                    </Text>

                    <Text style={styles.comparisonLabel}>APR</Text>
                    <Text style={styles.comparisonValue}>{loan.apr}%</Text>

                    <Text style={styles.comparisonLabel}>Total Interest</Text>
                    <Text style={styles.comparisonValue}>
                      ${calculateTotalInterest(loan).toLocaleString()}
                    </Text>

                    <Text style={styles.comparisonLabel}>Total Cost</Text>
                    <Text style={styles.comparisonValue}>
                      ${calculateTotalCost(loan).toLocaleString()}
                    </Text>

                    <TouchableOpacity
                      style={styles.comparisonSelect}
                      onPress={() => {
                        setShowComparison(false);
                        setSelectedLoan(loan);
                      }}
                    >
                      <Text style={styles.comparisonSelectText}>Select</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  compareBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  compareBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  infoBanner: { marginBottom: theme.spacing.md },
  infoRow: { flexDirection: "row", justifyContent: "space-around" },
  infoItem: { alignItems: "center" },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 8,
  },
  infoSubtext: { fontSize: 12, color: theme.colors.textSecondary },
  aiCard: { marginBottom: theme.spacing.md, backgroundColor: "#FEF3C720" },
  aiHeader: { flexDirection: "row" },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aiContent: { flex: 1 },
  aiTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  aiText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  aiBold: { fontWeight: "600", color: theme.colors.text },
  chartCard: { marginBottom: theme.spacing.lg },
  chartNote: {
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
  loanCard: { marginBottom: theme.spacing.md },
  loanCardRecommended: { borderColor: theme.colors.primary, borderWidth: 2 },
  loanCardCompare: { borderColor: "#22C55E", borderWidth: 2 },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  recommendedText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  loanProviderInfo: { flex: 1 },
  loanProvider: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  loanName: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: "row", marginTop: 4 },
  compareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compareButtonActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  compareButtonText: { fontSize: 12, color: theme.colors.textSecondary },
  compareButtonTextActive: { color: "#fff" },
  reasoningBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary + "10",
    borderRadius: 8,
    padding: 10,
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  reasoningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  loanStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  loanStat: { alignItems: "center", flex: 1 },
  loanStatValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  loanStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  freeText: { color: "#22C55E" },
  benefitsPreview: { marginTop: theme.spacing.md },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  benefitText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  bureauRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bureauLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  bureauTags: { flexDirection: "row", gap: 6 },
  bureauTag: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bureauTagText: { fontSize: 11, color: "#3B82F6", fontWeight: "500" },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewDetailsText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  howItWorksCard: { marginTop: theme.spacing.md },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  stepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: { color: "#fff", fontWeight: "600" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tipsCard: { marginTop: theme.spacing.lg },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  modalProvider: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  modalName: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 4 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  modalScroll: {},
  modalStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modalStatItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 12,
  },
  modalStatValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  modalStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  costCard: { marginTop: theme.spacing.lg },
  costTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  costLabel: { fontSize: 14, color: theme.colors.textSecondary },
  costValue: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  positiveValue: { color: "#22C55E" },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: 12,
  },
  requirementsList: {},
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: { fontSize: 14, color: theme.colors.text, marginLeft: 10 },
  benefitsList: {},
  benefitItemModal: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  benefitTextModal: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  applicationCard: { marginTop: theme.spacing.lg, backgroundColor: "#EFF6FF" },
  applicationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  applicationSteps: {},
  applicationStep: { fontSize: 14, color: theme.colors.text, marginBottom: 6 },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: theme.spacing.lg,
    gap: 8,
  },
  applyButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  // Comparison styles
  comparisonTable: { flexDirection: "row", paddingVertical: theme.spacing.md },
  comparisonColumn: {
    width: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  comparisonProvider: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  comparisonName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  comparisonLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  comparisonValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  comparisonSelect: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  comparisonSelectText: { color: "#fff", fontWeight: "600" },
});
