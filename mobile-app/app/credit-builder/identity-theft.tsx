/**
 * Fynvita Identity Theft Recovery Center
 * Complete step-by-step recovery plan for identity theft victims
 * Features phased recovery steps, fraudulent account tracking, documents, and emergency contacts
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { ProgressBar } from "../../src/components/ProgressBar";

// Types
interface RecoveryStep {
  id: string;
  category: "immediate" | "short_term" | "long_term" | "ongoing";
  title: string;
  description: string;
  completed: boolean;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: string;
  resources: string[];
  substeps?: string[];
}

interface FraudulentAccount {
  id: string;
  type: "credit_card" | "loan" | "utility" | "government" | "medical" | "other";
  creditor: string;
  accountNumber: string;
  amountOwed: number;
  status: "reported" | "disputed" | "investigating" | "resolved" | "closed";
}

interface Contact {
  organization: string;
  phone: string;
  website: string;
  purpose: string;
  hours: string;
}

// Important contacts data
const IMPORTANT_CONTACTS: Contact[] = [
  {
    organization: "Federal Trade Commission (FTC)",
    phone: "1-877-438-4338",
    website: "https://www.identitytheft.gov",
    purpose: "Report identity theft & get recovery plan",
    hours: "24/7",
  },
  {
    organization: "Experian Fraud Alert",
    phone: "1-888-397-3742",
    website: "https://www.experian.com/fraud",
    purpose: "Place fraud alert on credit report",
    hours: "24/7",
  },
  {
    organization: "Equifax Fraud Alert",
    phone: "1-800-525-6285",
    website:
      "https://www.equifax.com/personal/credit-report-services/credit-fraud-alerts/",
    purpose: "Place fraud alert on credit report",
    hours: "24/7",
  },
  {
    organization: "TransUnion Fraud Alert",
    phone: "1-800-680-7289",
    website: "https://www.transunion.com/fraud-victim-resource-center",
    purpose: "Place fraud alert on credit report",
    hours: "24/7",
  },
  {
    organization: "Social Security Administration",
    phone: "1-800-772-1213",
    website: "https://www.ssa.gov/number-card/report-stolen-number",
    purpose: "Report SSN misuse",
    hours: "Mon-Fri 8am-7pm",
  },
  {
    organization: "IRS Identity Protection",
    phone: "1-800-908-4490",
    website: "https://www.irs.gov/identity-theft-fraud-scams",
    purpose: "Report tax-related identity theft",
    hours: "Mon-Fri 7am-7pm",
  },
];

// Initial recovery steps data
const INITIAL_RECOVERY_STEPS: RecoveryStep[] = [
  // Immediate Actions (within 24 hours)
  {
    id: "place_fraud_alert",
    category: "immediate",
    title: "Place Fraud Alert on Credit Reports",
    description:
      "Contact one credit bureau to place a fraud alert. They will notify the other two.",
    completed: false,
    priority: "critical",
    estimatedTime: "15 minutes",
    resources: [
      "Experian: 1-888-397-3742",
      "Equifax: 1-800-525-6285",
      "TransUnion: 1-800-680-7289",
    ],
    substeps: [
      "Call any ONE of the three bureaus",
      "Request a fraud alert be placed",
      "They will automatically notify the other two bureaus",
      "Alert lasts 1 year, can be extended to 7 years with police report",
    ],
  },
  {
    id: "report_ftc",
    category: "immediate",
    title: "Report to FTC at IdentityTheft.gov",
    description:
      "File an official identity theft report with the Federal Trade Commission.",
    completed: false,
    priority: "critical",
    estimatedTime: "30 minutes",
    resources: [
      "Website: https://www.identitytheft.gov",
      "Phone: 1-877-438-4338",
    ],
    substeps: [
      "Go to IdentityTheft.gov",
      "Answer questions about what happened",
      "Get your Identity Theft Report",
      "Print and save your report (you'll need it)",
    ],
  },
  {
    id: "file_police_report",
    category: "immediate",
    title: "File Police Report",
    description: "Report the identity theft to your local police department.",
    completed: false,
    priority: "critical",
    estimatedTime: "1-2 hours",
    resources: [
      "Local police non-emergency number",
      "FTC Identity Theft Report (bring with you)",
    ],
    substeps: [
      "Call your local police department",
      "Ask to file an identity theft report",
      "Bring your FTC report and proof of identity",
      "Get a copy of the police report",
    ],
  },
  {
    id: "notify_creditors",
    category: "immediate",
    title: "Contact Fraud Departments",
    description: "Call fraud departments of affected companies immediately.",
    completed: false,
    priority: "critical",
    estimatedTime: "2-4 hours",
    resources: [
      "List of fraudulent accounts",
      "Account numbers",
      "FTC report number",
    ],
    substeps: [
      "Make a list of all affected accounts",
      "Call each company's fraud department",
      "Request accounts be closed or frozen",
      "Get confirmation numbers",
    ],
  },
  // Short-term Actions (within 1 week)
  {
    id: "freeze_credit",
    category: "short_term",
    title: "Freeze Credit at All Bureaus",
    description:
      "Place a security freeze at all three credit bureaus to prevent new accounts.",
    completed: false,
    priority: "high",
    estimatedTime: "30 minutes",
    resources: ["Experian freeze", "Equifax freeze", "TransUnion freeze"],
    substeps: [
      "Visit each bureau's freeze page",
      "Create an account and verify identity",
      "Place the freeze",
      "Save your PIN/passwords",
    ],
  },
  {
    id: "dispute_fraudulent",
    category: "short_term",
    title: "Dispute Fraudulent Accounts",
    description:
      "File disputes with credit bureaus for all fraudulent accounts.",
    completed: false,
    priority: "high",
    estimatedTime: "2-3 hours",
    resources: [
      "FTC report",
      "Police report",
      "Dispute forms from each bureau",
    ],
    substeps: [
      "Get your credit reports from all three bureaus",
      "Identify all fraudulent accounts",
      "File online disputes with evidence",
      "Keep copies of all correspondence",
    ],
  },
  {
    id: "change_credentials",
    category: "short_term",
    title: "Change All Passwords & PINs",
    description: "Update security credentials for all online accounts.",
    completed: false,
    priority: "high",
    estimatedTime: "3-5 hours",
    resources: ["Password manager", "Two-factor authentication apps"],
    substeps: [
      "Change passwords for all financial accounts",
      "Enable two-factor authentication everywhere",
      "Change security questions",
      "Update email passwords first",
    ],
  },
  {
    id: "request_reports",
    category: "short_term",
    title: "Request Extended Fraud Alert",
    description:
      "With police report, extend fraud alert from 1 year to 7 years.",
    completed: false,
    priority: "medium",
    estimatedTime: "20 minutes",
    resources: ["Police report number", "Credit bureau phone numbers"],
  },
  // Long-term Actions (within 1 month)
  {
    id: "monitor_credit",
    category: "long_term",
    title: "Set Up Credit Monitoring",
    description:
      "Enroll in credit monitoring service to watch for new fraudulent activity.",
    completed: false,
    priority: "high",
    estimatedTime: "30 minutes",
    resources: ["Fynvita monitoring", "Free bureau monitoring services"],
  },
  {
    id: "review_mail",
    category: "long_term",
    title: "Review All Mail & Statements",
    description:
      "Check all mail for signs of identity theft for next 6-12 months.",
    completed: false,
    priority: "medium",
    estimatedTime: "Ongoing",
    resources: [],
  },
  {
    id: "close_unauthorized",
    category: "long_term",
    title: "Close Unauthorized Accounts",
    description: "Work with creditors to close all fraudulent accounts.",
    completed: false,
    priority: "high",
    estimatedTime: "2-4 weeks",
    resources: ["FTC report", "Police report", "Dispute confirmation numbers"],
  },
  {
    id: "check_public_records",
    category: "long_term",
    title: "Check Public Records",
    description: "Verify no fraudulent activity in court records, DMV, etc.",
    completed: false,
    priority: "medium",
    estimatedTime: "2-3 hours",
    resources: ["Local courthouse", "DMV", "Secretary of State"],
  },
  // Ongoing Actions
  {
    id: "monitor_ongoing",
    category: "ongoing",
    title: "Maintain Vigilant Monitoring",
    description:
      "Continue monitoring credit reports and accounts indefinitely.",
    completed: false,
    priority: "high",
    estimatedTime: "Ongoing",
    resources: ["Credit monitoring alerts", "Bank alerts", "Email alerts"],
  },
  {
    id: "annual_review",
    category: "ongoing",
    title: "Annual Credit Report Review",
    description: "Pull and review all three credit reports annually.",
    completed: false,
    priority: "medium",
    estimatedTime: "1 hour/year",
    resources: ["AnnualCreditReport.com"],
  },
  {
    id: "tax_pin",
    category: "ongoing",
    title: "Get IRS Identity Protection PIN",
    description: "Request IP PIN from IRS to prevent tax fraud.",
    completed: false,
    priority: "medium",
    estimatedTime: "15 minutes",
    resources: ["IRS.gov/IPPIN"],
  },
];

export default function IdentityTheftRecoveryScreen() {
  const [recoverySteps, setRecoverySteps] = useState<RecoveryStep[]>(
    INITIAL_RECOVERY_STEPS,
  );
  const [fraudulentAccounts, setFraudulentAccounts] = useState<
    FraudulentAccount[]
  >([]);
  const [selectedStep, setSelectedStep] = useState<RecoveryStep | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newAccount, setNewAccount] = useState({
    creditor: "",
    accountNumber: "",
    amountOwed: "",
    type: "credit_card" as FraudulentAccount["type"],
  });

  const getProgressByCategory = (category: string) => {
    const categorySteps = recoverySteps.filter((s) => s.category === category);
    const completed = categorySteps.filter((s) => s.completed).length;
    return {
      total: categorySteps.length,
      completed,
      percentage:
        categorySteps.length > 0
          ? Math.round((completed / categorySteps.length) * 100)
          : 0,
    };
  };

  const getOverallProgress = () => {
    const completed = recoverySteps.filter((s) => s.completed).length;
    return {
      total: recoverySteps.length,
      completed,
      percentage: Math.round((completed / recoverySteps.length) * 100),
    };
  };

  const toggleStepCompletion = (stepId: string) => {
    setRecoverySteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step,
      ),
    );
  };

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  const startRecovery = () => {
    Alert.alert(
      "Start Recovery Process",
      "This will guide you through the identity theft recovery steps. Have you experienced identity theft?",
      [
        { text: "No, Cancel", style: "cancel" },
        { text: "Yes, Start", onPress: () => setIsRecoveryMode(true) },
      ],
    );
  };

  const addFraudulentAccount = () => {
    if (!newAccount.creditor || !newAccount.amountOwed) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    const account: FraudulentAccount = {
      id: Date.now().toString(),
      type: newAccount.type,
      creditor: newAccount.creditor,
      accountNumber: newAccount.accountNumber,
      amountOwed: parseFloat(newAccount.amountOwed) || 0,
      status: "reported",
    };
    setFraudulentAccounts((prev) => [...prev, account]);
    setNewAccount({
      creditor: "",
      accountNumber: "",
      amountOwed: "",
      type: "credit_card",
    });
    setShowAddAccount(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "immediate":
        return "#EF4444";
      case "short_term":
        return "#F59E0B";
      case "long_term":
        return "#FBBF24";
      case "ongoing":
        return "#3B82F6";
      default:
        return theme.colors.primary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
      case "closed":
        return "#22C55E";
      case "investigating":
        return "#F59E0B";
      case "disputed":
        return "#3B82F6";
      default:
        return "#EF4444";
    }
  };

  const overallProgress = getOverallProgress();
  const immediateProgress = getProgressByCategory("immediate");
  const shortTermProgress = getProgressByCategory("short_term");
  const longTermProgress = getProgressByCategory("long_term");
  const ongoingProgress = getProgressByCategory("ongoing");

  const renderStepsByCategory = (
    category: RecoveryStep["category"],
    title: string,
    icon: string,
  ) => {
    const steps = recoverySteps.filter((step) => step.category === category);
    const progress = getProgressByCategory(category);
    const color = getCategoryColor(category);

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View
            style={[styles.categoryIcon, { backgroundColor: color + "20" }]}
          >
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={color}
            />
          </View>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryTitle}>{title}</Text>
            <Text style={styles.categoryProgress}>
              {progress.completed}/{progress.total} completed
            </Text>
          </View>
          <Text style={[styles.categoryPercentage, { color }]}>
            {progress.percentage}%
          </Text>
        </View>
        {steps.map((step) => (
          <TouchableOpacity
            key={step.id}
            onPress={() => setSelectedStep(step)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.stepCard,
                step.completed && styles.stepCardCompleted,
              ]}
            >
              <View style={styles.stepRow}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleStepCompletion(step.id);
                  }}
                  style={[
                    styles.checkbox,
                    step.completed && styles.checkboxChecked,
                  ]}
                >
                  {step.completed && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.completed && styles.stepTitleCompleted,
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepDescription} numberOfLines={2}>
                    {step.description}
                  </Text>
                  <View style={styles.stepMeta}>
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.stepTime}>{step.estimatedTime}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(step.priority) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: getPriorityColor(step.priority) },
                    ]}
                  >
                    {step.priority}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
          <Text style={styles.title}>Identity Protection</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Emergency Alert Banner */}
        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={28} color="#fff" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>If You're a Victim</Text>
              <Text style={styles.emergencySubtitle}>
                The first 24-48 hours are critical
              </Text>
            </View>
          </View>
          <View style={styles.emergencyActions}>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => openUrl("https://www.identitytheft.gov")}
            >
              <Text style={styles.emergencyButtonText}>Report to FTC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emergencyButtonOutline}
              onPress={() => Linking.openURL("tel:1-877-438-4338")}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.emergencyButtonOutlineText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Progress Overview */}
        {isRecoveryMode && (
          <Card style={styles.progressCard}>
            <Text style={styles.progressTitle}>Recovery Progress</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentage}>
                  {overallProgress.percentage}%
                </Text>
              </View>
              <View style={styles.progressDetails}>
                <Text style={styles.progressSteps}>
                  {overallProgress.completed} of {overallProgress.total} steps
                  completed
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${overallProgress.percentage}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            {/* Category Progress */}
            <View style={styles.categoryProgressGrid}>
              <View style={styles.categoryProgressItem}>
                <View
                  style={[styles.categoryDot, { backgroundColor: "#EF4444" }]}
                />
                <Text style={styles.categoryProgressLabel}>Immediate</Text>
                <Text style={styles.categoryProgressValue}>
                  {immediateProgress.percentage}%
                </Text>
              </View>
              <View style={styles.categoryProgressItem}>
                <View
                  style={[styles.categoryDot, { backgroundColor: "#F59E0B" }]}
                />
                <Text style={styles.categoryProgressLabel}>Short-term</Text>
                <Text style={styles.categoryProgressValue}>
                  {shortTermProgress.percentage}%
                </Text>
              </View>
              <View style={styles.categoryProgressItem}>
                <View
                  style={[styles.categoryDot, { backgroundColor: "#FBBF24" }]}
                />
                <Text style={styles.categoryProgressLabel}>Long-term</Text>
                <Text style={styles.categoryProgressValue}>
                  {longTermProgress.percentage}%
                </Text>
              </View>
              <View style={styles.categoryProgressItem}>
                <View
                  style={[styles.categoryDot, { backgroundColor: "#3B82F6" }]}
                />
                <Text style={styles.categoryProgressLabel}>Ongoing</Text>
                <Text style={styles.categoryProgressValue}>
                  {ongoingProgress.percentage}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Start Recovery or Show Steps */}
        {!isRecoveryMode ? (
          <>
            <Card style={styles.infoCard}>
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={theme.colors.primary}
              />
              <Text style={styles.infoTitle}>
                Identity Theft Recovery Center
              </Text>
              <Text style={styles.infoText}>
                If you've been a victim of identity theft, we'll guide you
                through the recovery process step by step with a comprehensive
                action plan.
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={startRecovery}
              >
                <Text style={styles.startButtonText}>
                  Start Recovery Process
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </Card>

            {/* Important Contacts Quick Access */}
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            {IMPORTANT_CONTACTS.slice(0, 4).map((contact, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              >
                <Card style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons
                        name="call"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>
                        {contact.organization}
                      </Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Recovery Steps by Category */}
            {renderStepsByCategory(
              "immediate",
              "Immediate Actions (24 Hours)",
              "alert-circle",
            )}
            {renderStepsByCategory(
              "short_term",
              "Short-term Actions (1 Week)",
              "flash",
            )}
            {renderStepsByCategory(
              "long_term",
              "Long-term Actions (1 Month)",
              "calendar",
            )}
            {renderStepsByCategory("ongoing", "Ongoing Actions", "repeat")}

            {/* Fraudulent Accounts Tracker */}
            <View style={styles.accountsSection}>
              <View style={styles.accountsHeader}>
                <Text style={styles.sectionTitle}>Fraudulent Accounts</Text>
                <TouchableOpacity onPress={() => setShowAddAccount(true)}>
                  <Ionicons
                    name="add-circle"
                    size={28}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
              {fraudulentAccounts.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons
                    name="document-text-outline"
                    size={32}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.emptyText}>
                    No fraudulent accounts tracked yet
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Tap + to add accounts you need to dispute
                  </Text>
                </Card>
              ) : (
                fraudulentAccounts.map((account) => (
                  <Card key={account.id} style={styles.accountCard}>
                    <View style={styles.accountRow}>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountCreditor}>
                          {account.creditor}
                        </Text>
                        <Text style={styles.accountType}>
                          {account.type.replace("_", " ")} - $
                          {account.amountOwed.toLocaleString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getStatusColor(account.status) + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(account.status) },
                          ]}
                        >
                          {account.status}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* Important Contacts */}
            <Text style={styles.sectionTitle}>Important Contacts</Text>
            {IMPORTANT_CONTACTS.map((contact, idx) => (
              <Card key={idx} style={styles.contactCardFull}>
                <Text style={styles.contactNameFull}>
                  {contact.organization}
                </Text>
                <Text style={styles.contactPurpose}>{contact.purpose}</Text>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactAction}
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  >
                    <Ionicons
                      name="call"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.contactActionText}>
                      {contact.phone}
                    </Text>
                  </TouchableOpacity>
                  {contact.website !== "N/A" && (
                    <TouchableOpacity
                      style={styles.contactAction}
                      onPress={() => openUrl(contact.website)}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.contactActionText}>Website</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.contactHours}>Hours: {contact.hours}</Text>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Step Detail Modal */}
      <Modal visible={selectedStep !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedStep?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedStep(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalDescription}>
                {selectedStep?.description}
              </Text>

              <View style={styles.modalMeta}>
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>Estimated Time</Text>
                  <Text style={styles.modalMetaValue}>
                    {selectedStep?.estimatedTime}
                  </Text>
                </View>
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>Priority</Text>
                  <Text
                    style={[
                      styles.modalMetaValue,
                      {
                        color: getPriorityColor(
                          selectedStep?.priority || "low",
                        ),
                      },
                    ]}
                  >
                    {selectedStep?.priority}
                  </Text>
                </View>
              </View>

              {selectedStep?.substeps && selectedStep.substeps.length > 0 && (
                <View style={styles.substepsSection}>
                  <Text style={styles.substepsTitle}>
                    Step-by-Step Instructions
                  </Text>
                  {selectedStep.substeps.map((substep, idx) => (
                    <View key={idx} style={styles.substepRow}>
                      <Text style={styles.substepNumber}>{idx + 1}.</Text>
                      <Text style={styles.substepText}>{substep}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedStep?.resources && selectedStep.resources.length > 0 && (
                <View style={styles.resourcesSection}>
                  <Text style={styles.resourcesTitle}>Resources</Text>
                  {selectedStep.resources.map((resource, idx) => (
                    <View key={idx} style={styles.resourceRow}>
                      <Ionicons
                        name="link"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.resourceText}>{resource}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.markCompleteButton,
                  selectedStep?.completed && styles.markIncompleteButton,
                ]}
                onPress={() => {
                  if (selectedStep) {
                    toggleStepCompletion(selectedStep.id);
                    setSelectedStep(null);
                  }
                }}
              >
                <Text style={styles.markCompleteButtonText}>
                  Mark as {selectedStep?.completed ? "Incomplete" : "Complete"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Account Modal */}
      <Modal visible={showAddAccount} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Fraudulent Account</Text>
              <TouchableOpacity onPress={() => setShowAddAccount(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Creditor Name *</Text>
              <TextInput
                style={styles.input}
                value={newAccount.creditor}
                onChangeText={(text) =>
                  setNewAccount((prev) => ({ ...prev, creditor: text }))
                }
                placeholder="e.g., ABC Collections"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Account Number (Last 4)</Text>
              <TextInput
                style={styles.input}
                value={newAccount.accountNumber}
                onChangeText={(text) =>
                  setNewAccount((prev) => ({ ...prev, accountNumber: text }))
                }
                placeholder="XXXX"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={4}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Amount Owed *</Text>
              <TextInput
                style={styles.input}
                value={newAccount.amountOwed}
                onChangeText={(text) =>
                  setNewAccount((prev) => ({ ...prev, amountOwed: text }))
                }
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.addAccountButton}
              onPress={addFraudulentAccount}
            >
              <Text style={styles.addAccountButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  emergencyCard: {
    backgroundColor: "#EF4444",
    marginBottom: theme.spacing.lg,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  emergencyContent: { marginLeft: 12, flex: 1 },
  emergencyTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  emergencySubtitle: { fontSize: 14, color: "#fff", opacity: 0.9 },
  emergencyActions: { flexDirection: "row", gap: 12 },
  emergencyButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  emergencyButtonText: { color: "#EF4444", fontWeight: "600" },
  emergencyButtonOutline: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  emergencyButtonOutlineText: { color: "#fff", fontWeight: "600" },
  progressCard: { marginBottom: theme.spacing.lg },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  progressRow: { flexDirection: "row", alignItems: "center" },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  progressDetails: { flex: 1 },
  progressSteps: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  categoryProgressGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  categoryProgressItem: { alignItems: "center", flex: 1 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  categoryProgressLabel: { fontSize: 11, color: theme.colors.textSecondary },
  categoryProgressValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  infoCard: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingVertical: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  startButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  categorySection: { marginBottom: theme.spacing.lg },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryTitleContainer: { flex: 1 },
  categoryTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  categoryProgress: { fontSize: 12, color: theme.colors.textSecondary },
  categoryPercentage: { fontSize: 16, fontWeight: "700" },
  stepCard: { marginBottom: theme.spacing.sm },
  stepCardCompleted: {
    backgroundColor: "#22C55E10",
    borderColor: "#22C55E",
    borderWidth: 1,
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  stepTitleCompleted: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stepMeta: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  stepTime: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  contactCard: { marginBottom: theme.spacing.sm },
  contactRow: { flexDirection: "row", alignItems: "center" },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  contactPhone: { fontSize: 13, color: theme.colors.primary },
  contactCardFull: { marginBottom: theme.spacing.sm },
  contactNameFull: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  contactPurpose: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: "row",
    marginTop: theme.spacing.sm,
    gap: 16,
  },
  contactAction: { flexDirection: "row", alignItems: "center" },
  contactActionText: {
    fontSize: 13,
    color: theme.colors.primary,
    marginLeft: 6,
  },
  contactHours: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  accountsSection: { marginTop: theme.spacing.md },
  accountsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  emptyCard: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  emptySubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountInfo: { flex: 1 },
  accountCreditor: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  accountType: { fontSize: 13, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  modalScroll: { maxHeight: 500 },
  modalDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  modalMeta: {
    flexDirection: "row",
    marginTop: theme.spacing.lg,
    gap: 24,
  },
  modalMetaItem: {},
  modalMetaLabel: { fontSize: 12, color: theme.colors.textSecondary },
  modalMetaValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 4,
  },
  substepsSection: { marginTop: theme.spacing.lg },
  substepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  substepRow: { flexDirection: "row", marginBottom: 8 },
  substepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    width: 24,
  },
  substepText: { fontSize: 14, color: theme.colors.text, flex: 1 },
  resourcesSection: { marginTop: theme.spacing.lg },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  resourceRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  resourceText: { fontSize: 14, color: theme.colors.text, marginLeft: 8 },
  markCompleteButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: theme.spacing.xl,
  },
  markIncompleteButton: { backgroundColor: theme.colors.textSecondary },
  markCompleteButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  formGroup: { marginBottom: theme.spacing.md },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addAccountButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  addAccountButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
