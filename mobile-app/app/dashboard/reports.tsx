/**
 * Reports Dashboard.
 *
 * WHAT THIS SCREEN CLAIMED, AND WHAT IT DID WHEN TAPPED.
 *
 * `MOCK_REPORTS` listed documents the reader supposedly had — "Credit
 * Analysis Report - December 2024, 2.4 MB", "Dispute Progress Summary -
 * November 2024, 1.8 MB" — each with a Share button for a file that was
 * nowhere.
 *
 * `handleGenerate` was worse, because it answered an action the user took: it
 * waited 2 s on a setTimeout, invented a file with a `Math.random()` size,
 * pushed it into the list, and alerted "Your Credit Analysis has been
 * generated successfully." Nothing was generated. No request was made. A
 * passive fabrication misinforms; this one told the user their instruction had
 * succeeded.
 *
 * WHY IT IS NOT WIRED INSTEAD. There is nowhere for a generated report to
 * live, and nothing that produces one:
 *
 *   - no generated-reports table exists in any migration
 *   - `documents.type` is CHECK-constrained to 'credit_report', 'id',
 *     'proof_of_address', 'supporting_doc' (001_initial_schema.sql:41), so a
 *     generated report cannot be stored as a document either
 *   - POST /api/analytics/reports persists nothing, and is backed by
 *     AnalyticsEngine, whose getUserAnalytics returns hardcoded zeros under
 *     the comment "In production, fetch from database" (task #99)
 *
 * So generation now says it is not available. The report-type catalogue stays:
 * it describes what the feature will produce, which is true, and it is the
 * surface to wire the day there is something behind it.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Report {
  id: string;
  name: string;
  type: "analysis" | "disputes" | "score" | "plan";
  generatedAt: string;
  size: string;
}


const REPORT_TYPES = [
  {
    type: "analysis",
    name: "Credit Analysis",
    desc: "Comprehensive credit report analysis",
    icon: "analytics",
  },
  {
    type: "disputes",
    name: "Dispute Summary",
    desc: "All disputes and outcomes",
    icon: "document-text",
  },
  {
    type: "score",
    name: "Score Report",
    desc: "Detailed score breakdown",
    icon: "trending-up",
  },
  {
    type: "plan",
    name: "Improvement Plan",
    desc: "AI-generated roadmap",
    icon: "map",
  },
];

export default function ReportsScreen() {
  // Empty, and it stays empty: nothing persists a generated report. The
  // setter is kept because handleDelete still uses it and will be correct
  // the day generation is wired; it simply cannot run while the list is
  // empty. See the header note.
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  /**
   * Report generation is NOT connected, and this says so.
   *
   * What this used to do: wait 2 s on a setTimeout, invent a file with a
   * `Math.random()` size, push it into the list, and alert "Your {name} has
   * been generated successfully." Nothing was generated and no request was
   * made — the user was told a document existed, shown it in a list, and
   * offered a Share button for a file that was never anywhere.
   */
  const handleGenerate = (_type: string, name: string) => {
    Alert.alert(
      "Report generation is not available yet",
      `We cannot generate your ${name} yet. When we can, it will appear here — we would rather tell you that than show you a report we did not produce.`,
    );
  };

  const handleShare = async (report: Report) => {
    try {
      await Share.share({
        message: `Check out my ${report.name} from Fynvita`,
        title: report.name,
      });
    } catch (error) {
      if (__DEV__) console.error("Error sharing:", error);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setReports((prev) => prev.filter((r) => r.id !== id));
          },
        },
      ],
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "analysis":
        return "analytics";
      case "disputes":
        return "document-text";
      case "score":
        return "trending-up";
      case "plan":
        return "map";
      default:
        return "document";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "analysis":
        return theme.colors.primary;
      case "disputes":
        return theme.colors.warning;
      case "score":
        return theme.colors.success;
      case "plan":
        return "#8B5CF6";
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Generate New Report */}
        <Card style={styles.generateCard}>
          <Text style={styles.sectionTitle}>Generate New Report</Text>
          <View style={styles.reportTypesGrid}>
            {REPORT_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.type}
                style={[
                  styles.reportTypeCard,
                  generating === rt.type && styles.reportTypeGenerating,
                ]}
                onPress={() => handleGenerate(rt.type, rt.name)}
                disabled={generating !== null}
              >
                <View
                  style={[
                    styles.typeIconContainer,
                    { backgroundColor: getTypeColor(rt.type) + "20" },
                  ]}
                >
                  <Ionicons
                    name={rt.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={getTypeColor(rt.type)}
                  />
                </View>
                <Text style={styles.typeName}>{rt.name}</Text>
                <Text style={styles.typeDesc}>{rt.desc}</Text>
                {generating === rt.type && (
                  <View style={styles.generatingBadge}>
                    <Text style={styles.generatingText}>Generating...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Previous Reports */}
        <Card style={styles.previousCard}>
          <Text style={styles.sectionTitle}>Previous Reports</Text>
          {reports.map((report) => (
            <View key={report.id} style={styles.reportItem}>
              <View
                style={[
                  styles.reportIcon,
                  { backgroundColor: getTypeColor(report.type) + "20" },
                ]}
              >
                <Ionicons
                  name={
                    getTypeIcon(report.type) as keyof typeof Ionicons.glyphMap
                  }
                  size={20}
                  color={getTypeColor(report.type)}
                />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName} numberOfLines={1}>
                  {report.name}
                </Text>
                <Text style={styles.reportMeta}>
                  {new Date(report.generatedAt).toLocaleDateString()} •{" "}
                  {report.size}
                </Text>
              </View>
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(report)}
                >
                  <Ionicons
                    name="share-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(report.id)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {reports.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>No reports generated yet</Text>
              {/* "Not yet" on its own implies you could generate one now. */}
              <Text style={styles.emptySubtext}>
                Report generation is not available yet. When it is, the reports
                you generate will be listed here.
              </Text>
            </View>
          )}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  scrollView: { flex: 1, padding: theme.spacing.lg },

  generateCard: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  reportTypesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  reportTypeCard: {
    width: "48%",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reportTypeGenerating: { opacity: 0.7 },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  generatingBadge: {
    marginTop: 8,
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  generatingText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },

  previousCard: {},
  reportItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reportInfo: { flex: 1 },
  reportName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 2,
  },
  reportMeta: { fontSize: 12, color: theme.colors.textSecondary },
  reportActions: { flexDirection: "row", gap: 8 },
  actionButton: { padding: 8 },

  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
