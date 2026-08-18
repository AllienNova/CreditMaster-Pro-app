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
// The main client. Unlike strategies, this screen's route happens to have
// NO { success, data } envelope, so the parallel client worked here by
// coincidence rather than design. Moved anyway — see SF-22.
import {
  disputeResourcesApi,
  mapWebDisputeTemplate,
} from "../../src/services/api/disputes";
import type { DisputeTemplate } from "../../src/services/api/types";
import { toArray } from "../../src/store/toArray";

// Local template data (fallback when API unavailable)
/*
 * LOCAL_TEMPLATES lived here: a second copy of the dispute-letter catalogue,
 * ~190 lines, seeded into state and used as a silent fallback.
 *
 * It is gone for the same reason as the parallel API client (SF-22): the
 * server already serves these letters from
 * src/lib/disputes/dispute-service.ts, and a divergent second copy is how the
 * two drift. This one had ALREADY drifted — it carried whenToUse,
 * whenNotToUse, tone and requiredDocuments, none of which the server sends,
 * so a successful fetch replaced rich local entries with sparser real ones
 * and the screen rendered undefined where it used to render content.
 */

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
    useState<DisputeTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await disputeResourcesApi.getTemplates();
      if (!res.success || !res.data?.templates) {
        // No silent fallback. LOCAL_TEMPLATES is real product content, but
        // showing it after a failed read tells the user the server answered.
        setError("We could not load dispute templates.");
        setLoading(false);
        return;
      }
      // Mapped, not cast. The server's template shape shares only four
      // field names with the mobile one.
      setTemplates(res.data.templates.map(mapWebDisputeTemplate));
    } catch {
      setError("We could not load dispute templates.");
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
      ) : error ? (
        // The list used to fall back to LOCAL_TEMPLATES here, so a failed read
        // showed built-in letters as though the server had answered.
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchTemplates}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
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
                {/*
                  The tone badge rendered `template.tone` — a field the server
                  does not send. DISPUTE_TEMPLATES carries
                  { description, template, variables } and nothing about the
                  letter's voice, so this showed an empty coloured pill on
                  every real template. Rendered only when a tone actually
                  arrives.
                */}
                {template.tone ? (
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
                ) : null}
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
                  {/* `whenToUse` came from the deleted LOCAL_TEMPLATES fixture;
                      the server never sends it. `scenario` — mapped from the
                      route's `description` — is the field that actually says
                      what a letter is for. */}
                  {template.scenario || "any dispute"}
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
  errorText: {
    fontSize: 14,
    color: lightTheme.colors.error,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    color: lightTheme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
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
