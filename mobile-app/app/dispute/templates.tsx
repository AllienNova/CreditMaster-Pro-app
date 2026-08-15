import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { disputesAPI, DisputeTemplate } from "../../services/api";
import { toArray } from "../../src/store/toArray";

// Local template data (fallback when API unavailable)
const LOCAL_TEMPLATES: DisputeTemplate[] = [
  {
    id: "unauthorized_hard_inquiry",
    name: "Unauthorized Hard Inquiry",
    category: "inquiries",
    scenario:
      "A hard inquiry appears on your credit report that you did not authorize",
    successRate: 62,
    tone: "assertive",
    letterText: "",
    requiredDocuments: [
      "Credit report showing the inquiry",
      "Identity verification",
    ],
    placeholders: ["YOUR_NAME", "CREDITOR_NAME", "INQUIRY_DATE"],
    bestPractices: [
      "Send within 30 days of discovery",
      "Include copy of credit report",
    ],
    whenToUse: [
      "Unknown company made inquiry",
      "Never applied for credit with this lender",
    ],
    whenNotToUse: [
      "You authorized the inquiry but forgot",
      "Pre-qualification inquiry",
    ],
  },
  {
    id: "obsolete_debt",
    name: "Obsolete Debt Removal",
    category: "collections",
    scenario: "A debt older than 7 years still appears on your credit report",
    successRate: 78,
    tone: "legal",
    letterText: "",
    requiredDocuments: [
      "Credit report showing the account",
      "Proof of account age",
    ],
    placeholders: ["YOUR_NAME", "ACCOUNT_NAME", "ORIGINAL_DATE"],
    bestPractices: [
      "Calculate exact date of first delinquency",
      "Cite FCRA Section 605",
    ],
    whenToUse: ["Debt is older than 7 years", "Account should have aged off"],
    whenNotToUse: [
      "Debt is within reporting period",
      "Recent re-aging occurred",
    ],
  },
  {
    id: "mixed_credit_file",
    name: "Mixed Credit File",
    category: "identity",
    scenario: "Accounts belonging to someone else appear on your credit report",
    successRate: 71,
    tone: "assertive",
    letterText: "",
    requiredDocuments: ["Credit report", "Government ID", "Proof of SSN"],
    placeholders: ["YOUR_NAME", "YOUR_SSN_LAST_4", "WRONG_ACCOUNT"],
    bestPractices: [
      "Include complete identity verification",
      "List all incorrect accounts",
    ],
    whenToUse: [
      "Someone else's accounts on your report",
      "Similar name/SSN confusion",
    ],
    whenNotToUse: [
      "Accounts are yours but disputed",
      "Joint account confusion",
    ],
  },
  {
    id: "paid_collection_reporting",
    name: "Paid Collection Still Reporting",
    category: "collections",
    scenario: "A collection account shows as unpaid after you've paid it",
    successRate: 74,
    tone: "assertive",
    letterText: "",
    requiredDocuments: [
      "Payment confirmation",
      "Credit report",
      "Settlement letter",
    ],
    placeholders: [
      "YOUR_NAME",
      "COLLECTION_AGENCY",
      "PAYMENT_DATE",
      "AMOUNT_PAID",
    ],
    bestPractices: [
      "Include proof of payment",
      "Reference original settlement terms",
    ],
    whenToUse: [
      "Collection paid but still shows open",
      "Balance shows incorrect amount",
    ],
    whenNotToUse: ["Payment is still processing", "Partial payment made"],
  },
  {
    id: "inaccurate_payment_history",
    name: "Inaccurate Payment History",
    category: "accounts",
    scenario: "Late payments are reported incorrectly on your account",
    successRate: 58,
    tone: "assertive",
    letterText: "",
    requiredDocuments: [
      "Bank statements",
      "Payment confirmations",
      "Credit report",
    ],
    placeholders: [
      "YOUR_NAME",
      "CREDITOR_NAME",
      "ACCOUNT_NUMBER",
      "INCORRECT_MONTH",
    ],
    bestPractices: ["Provide bank statements showing on-time payments"],
    whenToUse: [
      "Payment was made on time but reported late",
      "Wrong month marked late",
    ],
    whenNotToUse: ["Payment was actually late", "Grace period confusion"],
  },
  {
    id: "medical_debt_under_500",
    name: "Medical Debt Under $500",
    category: "medical",
    scenario: "Medical collection under $500 per new FCRA rules",
    successRate: 85,
    tone: "legal",
    letterText: "",
    requiredDocuments: ["Credit report", "Medical billing statement"],
    placeholders: [
      "YOUR_NAME",
      "MEDICAL_PROVIDER",
      "COLLECTION_AGENCY",
      "AMOUNT",
    ],
    bestPractices: [
      "Cite new FCRA medical debt rules",
      "Verify amount is under $500",
    ],
    whenToUse: [
      "Medical debt under $500",
      "Debt went to collections after April 2023",
    ],
    whenNotToUse: [
      "Medical debt over $500",
      "Debt reported before rule change",
    ],
  },
  {
    id: "student_loan_rehabilitation",
    name: "Student Loan Rehabilitation",
    category: "student_loans",
    scenario: "Completed loan rehabilitation but default still showing",
    successRate: 82,
    tone: "formal",
    letterText: "",
    requiredDocuments: [
      "Rehabilitation completion letter",
      "Servicer confirmation",
    ],
    placeholders: ["YOUR_NAME", "LOAN_SERVICER", "REHABILITATION_DATE"],
    bestPractices: [
      "Include official rehabilitation certificate",
      "Request complete removal",
    ],
    whenToUse: [
      "Completed 9 qualifying payments",
      "Have rehabilitation completion letter",
    ],
    whenNotToUse: [
      "Still in rehabilitation program",
      "Consolidation not rehabilitation",
    ],
  },
  {
    id: "bankruptcy_discharge",
    name: "Bankruptcy Discharge Verification",
    category: "bankruptcy",
    scenario: "Discharged debts still showing as owed post-bankruptcy",
    successRate: 76,
    tone: "legal",
    letterText: "",
    requiredDocuments: ["Bankruptcy discharge papers", "Schedule of debts"],
    placeholders: [
      "YOUR_NAME",
      "CASE_NUMBER",
      "DISCHARGE_DATE",
      "CREDITOR_NAME",
    ],
    bestPractices: [
      "Include certified copy of discharge",
      "Reference specific account",
    ],
    whenToUse: [
      "Debt was included in bankruptcy",
      "Account shows balance after discharge",
    ],
    whenNotToUse: ["Debt was not discharged", "Reaffirmation agreement signed"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Templates", icon: "apps-outline" },
  { id: "inquiries", label: "Inquiries", icon: "search-outline" },
  { id: "collections", label: "Collections", icon: "alert-circle-outline" },
  { id: "accounts", label: "Accounts", icon: "card-outline" },
  { id: "identity", label: "Identity", icon: "person-outline" },
  { id: "medical", label: "Medical", icon: "medical-outline" },
  { id: "student_loans", label: "Student Loans", icon: "school-outline" },
  { id: "bankruptcy", label: "Bankruptcy", icon: "document-text-outline" },
];

const getSuccessColor = (rate: number) => {
  if (rate >= 75) return "#16A34A";
  if (rate >= 60) return "#D97706";
  return "#DC2626";
};

const getToneColor = (tone: string) => {
  switch (tone) {
    case "legal":
      return "#7C3AED";
    case "assertive":
      return "#DC2626";
    case "formal":
      return "#2563EB";
    case "humble":
      return "#059669";
    default:
      return "#6B7280";
  }
};

export default function TemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] =
    useState<DisputeTemplate[]>(LOCAL_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await disputesAPI.getTemplates();
      if (data?.templates && !error) {
        setTemplates(toArray<DisputeTemplate>(data?.templates));
      }
    } catch {
      // Use local templates as fallback
    }
    setLoading(false);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory =
      selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.scenario.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: DisputeTemplate) => {
    router.push({
      pathname: "/dispute/use-template",
      params: { templateId: template.id, templateName: template.name },
    } as never);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Templates</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={lightTheme.colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={lightTheme.colors.textSecondary}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={lightTheme.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={
                selectedCategory === cat.id
                  ? "#FFFFFF"
                  : lightTheme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Templates List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.templatesList}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultsText}>
            {filteredTemplates.length} templates found
          </Text>

          {filteredTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleSelectTemplate(template)}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                <View
                  style={[
                    styles.successBadge,
                    {
                      backgroundColor:
                        getSuccessColor(template.successRate) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.successText,
                      { color: getSuccessColor(template.successRate) },
                    ]}
                  >
                    {template.successRate}% success
                  </Text>
                </View>
              </View>

              <Text style={styles.templateScenario} numberOfLines={2}>
                {template.scenario}
              </Text>

              <View style={styles.templateMeta}>
                <View
                  style={[
                    styles.toneBadge,
                    { backgroundColor: getToneColor(template.tone) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.toneText,
                      { color: getToneColor(template.tone) },
                    ]}
                  >
                    {template.tone}
                  </Text>
                </View>
                <Text style={styles.docsRequired}>
                  <Ionicons
                    name="document-attach-outline"
                    size={14}
                    color={lightTheme.colors.textSecondary}
                  />{" "}
                  {/* Per-item field, not the list itself — a template without
                      `requiredDocuments` threw "Cannot read property 'length'
                      of undefined" and took the whole screen down. Coercing the
                      list (toArray) does not help here; each ITEM's array field
                      needs the same treatment. */}
                  {template.requiredDocuments?.length ?? 0} docs required
                </Text>
              </View>

              <View style={styles.whenToUse}>
                <Text style={styles.whenToUseLabel}>Best for:</Text>
                <Text style={styles.whenToUseText} numberOfLines={1}>
                  {/* `whenToUse` is typed as a required array but a template may
                      arrive without it, and `undefined[0]` throws "Cannot
                      convert undefined value to object" — which takes the whole
                      screen down through the ErrorBoundary. Same per-ITEM array
                      field as requiredDocuments above. */}
                  {template.whenToUse?.[0] ?? "any dispute"}
                </Text>
              </View>

              <View style={styles.templateFooter}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={lightTheme.colors.primary}
                />
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: lightTheme.colors.text },
  categoriesContainer: { maxHeight: 50, paddingHorizontal: 16 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: { backgroundColor: lightTheme.colors.primary },
  categoryText: { fontSize: 13, color: lightTheme.colors.textSecondary },
  categoryTextActive: { color: "#FFFFFF", fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  templatesList: { flex: 1, padding: 16 },
  resultsText: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginBottom: 12,
  },
  templateCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  templateName: {
    fontSize: 17,
    fontWeight: "600",
    color: lightTheme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  successBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  successText: { fontSize: 12, fontWeight: "600" },
  templateScenario: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  toneBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  toneText: { fontSize: 12, fontWeight: "500", textTransform: "capitalize" },
  docsRequired: { fontSize: 13, color: lightTheme.colors.textSecondary },
  whenToUse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  whenToUseLabel: {
    fontSize: 13,
    color: lightTheme.colors.textSecondary,
    fontWeight: "500",
  },
  whenToUseText: { fontSize: 13, color: lightTheme.colors.text, flex: 1 },
  templateFooter: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -10,
  },
});
