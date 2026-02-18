import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  lightTheme as theme,
  colors,
  getScoreColor,
  getScoreLabel,
} from "../../src/constants/theme";
import type { Document } from "../../src/types";

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setDocument({
        id: id || "1",
        user_id: "1",
        name: "Experian_Report_Nov2024.pdf",
        type: "credit_report",
        file_url: "",
        file_size: 2456789,
        status: "analyzed",
        uploaded_at: "2024-11-15T10:00:00Z",
        analysis_result: {
          bureau: "Experian",
          score: 678,
          accounts_count: 12,
          disputable_items: 3,
          recommendations: [
            "Dispute the late payment on Capital One account",
            "Request removal of ABC Collections account",
            "Challenge the unauthorized hard inquiry from XYZ Lender",
          ],
        },
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Document not found</Text>
      </View>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const bureauColor =
    colors.bureaus[
      (document.analysis_result?.bureau?.toLowerCase() ||
        "experian") as keyof typeof colors.bureaus
    ];

  return (
    <ScrollView style={styles.container}>
      {/* Document Info */}
      <View style={styles.infoCard}>
        <View style={styles.docIcon}>
          <Ionicons name="document-text" size={40} color={bureauColor} />
        </View>
        <Text style={styles.docName}>{document.name}</Text>
        <Text style={styles.docMeta}>
          {formatFileSize(document.file_size)} • Uploaded{" "}
          {new Date(document.uploaded_at).toLocaleDateString()}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                document.status === "analyzed" ? "#DCFCE7" : "#FEF3C7",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  document.status === "analyzed"
                    ? theme.colors.success
                    : theme.colors.warning,
              },
            ]}
          >
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Score Card */}
      {document.analysis_result?.score && (
        <View style={styles.scoreCard}>
          <Text style={styles.sectionTitle}>Credit Score</Text>
          <View style={styles.scoreContent}>
            <Text
              style={[
                styles.scoreValue,
                { color: getScoreColor(document.analysis_result.score) },
              ]}
            >
              {document.analysis_result.score}
            </Text>
            <Text style={styles.scoreLabel}>
              {getScoreLabel(document.analysis_result.score)}
            </Text>
            <Text style={[styles.bureauName, { color: bureauColor }]}>
              {document.analysis_result.bureau}
            </Text>
          </View>
        </View>
      )}

      {/* Analysis Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {document.analysis_result?.accounts_count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Accounts</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryValue, { color: theme.colors.warning }]}
              >
                {document.analysis_result?.disputable_items || 0}
              </Text>
              <Text style={styles.summaryLabel}>Disputable Items</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recommendations */}
      {document.analysis_result?.recommendations &&
        document.analysis_result.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
            <View style={styles.recommendationsCard}>
              {document.analysis_result.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recIcon}>
                    <Ionicons
                      name="bulb"
                      size={20}
                      color={theme.colors.warning}
                    />
                  </View>
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/dispute/wizard" as never)}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Create Dispute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Ionicons name="download" size={20} color={theme.colors.primary} />
          <Text style={styles.secondaryButtonText}>Download Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => {}}>
          <Ionicons name="trash" size={20} color={theme.colors.error} />
          <Text style={styles.deleteButtonText}>Delete Document</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: theme.colors.error },
  infoCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  docIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  docName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  scoreCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  scoreContent: { alignItems: "center" },
  scoreValue: { fontSize: 56, fontWeight: "700" },
  scoreLabel: { fontSize: 16, color: theme.colors.textSecondary },
  bureauName: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  section: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  summaryRow: { flexDirection: "row" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  summaryDivider: { width: 1, backgroundColor: theme.colors.border },
  recommendationsCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  recText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  actionsContainer: { paddingHorizontal: theme.spacing.md },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});
