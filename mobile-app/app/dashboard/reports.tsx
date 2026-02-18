/**
 * Fynvita Reports Dashboard Screen
 * Generate and view credit reports
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

const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    name: "Credit Analysis Report - December 2024",
    type: "analysis",
    generatedAt: "2024-12-01",
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "Dispute Progress Summary - November 2024",
    type: "disputes",
    generatedAt: "2024-11-30",
    size: "1.8 MB",
  },
  {
    id: "3",
    name: "Monthly Credit Score Report - November 2024",
    type: "score",
    generatedAt: "2024-11-15",
    size: "1.2 MB",
  },
  {
    id: "4",
    name: "Credit Improvement Plan",
    type: "plan",
    generatedAt: "2024-10-20",
    size: "3.1 MB",
  },
];

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
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (type: string, name: string) => {
    setGenerating(type);
    // Simulate report generation
    setTimeout(() => {
      const newReport: Report = {
        id: Date.now().toString(),
        name: `${name} - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        type: type as Report["type"],
        generatedAt: new Date().toISOString().split("T")[0],
        size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
      };
      setReports((prev) => [newReport, ...prev]);
      setGenerating(null);
      Alert.alert(
        "Report Generated",
        `Your ${name} has been generated successfully.`,
      );
    }, 2000);
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
});
