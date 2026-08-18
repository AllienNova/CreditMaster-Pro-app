/**
 * Analytics Reports.
 *
 * THREE CLAIMS REMOVED, ALL ABOUT THINGS THE READER SUPPOSEDLY HAD OR HAD ASKED
 * FOR.
 *
 * 1. `GENERATED_REPORTS` listed files — "Credit Score Summary - Dec 2024,
 *    2.4 MB", "Dispute History - Q4 2024, 1.8 MB" — with Download and Share
 *    buttons for documents that were nowhere.
 *
 * 2. `handleGenerate` promised delivery: "Credit Score Summary will be ready in
 *    approximately 2 min", then spun a spinner for 2 s. No request was made and
 *    nothing was ever going to be ready. `handleDownload` said "Downloading
 *    ..." for a file that did not exist.
 *
 * 3. The Scheduled Reports card stated a schedule the reader never set —
 *    "Monthly Credit Summary, every 1st of the month" — written inline in JSX.
 *    That is the fabrication shape audit:screen-data cannot see at all
 *    (task #100): it is not a module constant, so no run of that gate would
 *    ever have reported it. Nothing in the schema stores a report schedule.
 *
 * WHY NONE OF IT IS WIRED INSTEAD. There is nowhere for a generated report to
 * live and nothing that produces one:
 *
 *   - no generated-reports table exists in any migration
 *   - documents.type is CHECK-constrained to 'credit_report', 'id',
 *     'proof_of_address', 'supporting_doc' (001_initial_schema.sql:41)
 *   - POST /api/analytics/reports persists nothing and is backed by
 *     AnalyticsEngine, whose getUserAnalytics returns hardcoded zeros under
 *     the comment "In production, fetch from database" (task #99)
 *
 * REPORT_TEMPLATES stays: it describes the kinds of report the feature will
 * produce, which is true, and it is the surface to wire the day there is
 * something behind it.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  estimatedTime: string;
}


const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "1",
    name: "Credit Score Summary",
    description: "Complete credit score analysis with trends",
    icon: "speedometer",
    estimatedTime: "2 min",
  },
  {
    id: "2",
    name: "Dispute History",
    description: "All disputes with outcomes and timelines",
    icon: "document-text",
    estimatedTime: "1 min",
  },
  {
    id: "3",
    name: "Financial Overview",
    description: "Assets, liabilities, and net worth analysis",
    icon: "wallet",
    estimatedTime: "3 min",
  },
  {
    id: "4",
    name: "Credit Utilization",
    description: "Detailed utilization breakdown by account",
    icon: "pie-chart",
    estimatedTime: "1 min",
  },
  {
    id: "5",
    name: "Payment History",
    description: "Complete payment history across all accounts",
    icon: "calendar",
    estimatedTime: "2 min",
  },
];




export default function AnalyticsReportsScreen() {
  /**
   * Report generation is not connected, and this says so.
   *
   * It used to promise delivery — "Credit Score Summary will be ready in
   * approximately 2 min" — and spin a spinner for 2 s. No request was made and
   * nothing was ever going to be ready. handleDownload and handleShare went
   * with it: both claimed to act on files that did not exist.
   */
  const handleGenerate = (template: ReportTemplate) => {
    Alert.alert(
      "Report generation is not available yet",
      `We cannot generate your ${template.name} yet. When we can, it will appear here — we would rather say so than promise you a file that is not coming.`,
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
          <Text style={styles.title}>Reports</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Generate New Report */}
        <Text style={styles.sectionTitle}>Generate Report</Text>
        {REPORT_TEMPLATES.map((template) => (
          <Card key={template.id} style={styles.templateCard}>
            <View style={styles.templateRow}>
              <View style={styles.templateIcon}>
                <Ionicons
                  name={template.icon}
                  size={22}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
              </View>
            </View>
            {/* No in-flight state: nothing is generated, so a spinner would
                be the same promise the old handler made. */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => handleGenerate(template)}
            >
              <Ionicons name="create" size={16} color="#fff" />
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Recent Reports */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        <Card style={styles.reportCard}>
          <Text style={styles.reportName}>No reports generated yet</Text>
          <Text style={styles.reportMeta}>
            Report generation is not available yet. When it is, the reports you
            generate will be listed here with their real size and date.
          </Text>
        </Card>

        {/* Schedule Reports */}
        {/* The card here used to state a schedule the reader never set —
            "Monthly Credit Summary, Every 1st of the month" — written inline
            in JSX, which is the fabrication shape audit:screen-data cannot
            see at all (task #100). Nothing stores a report schedule. */}
        <Text style={styles.sectionTitle}>Scheduled Reports</Text>
        <Card style={styles.scheduleCard}>
          <Text style={styles.scheduleName}>No scheduled reports</Text>
          <Text style={styles.scheduleFrequency}>
            Scheduling is not available yet, so nothing is running on a
            schedule for you.
          </Text>
        </Card>
        <TouchableOpacity style={styles.addScheduleButton}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.addScheduleText}>Schedule New Report</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  templateCard: { marginBottom: theme.spacing.sm },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  templateDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generatingButton: { backgroundColor: theme.colors.textSecondary },
  generateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
  },
  reportCard: { marginBottom: theme.spacing.sm },
  reportRow: { flexDirection: "row", alignItems: "center" },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reportInfo: { flex: 1 },
  reportName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  reportMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  reportActions: {
    flexDirection: "row",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    justifyContent: "flex-end",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  scheduleCard: { marginBottom: theme.spacing.sm },
  scheduleRow: { flexDirection: "row", alignItems: "center" },
  scheduleInfo: { flex: 1, marginLeft: 12 },
  scheduleName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  scheduleFrequency: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  addScheduleText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 8,
  },
});
