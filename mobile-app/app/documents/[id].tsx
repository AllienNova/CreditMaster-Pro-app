/**
 * Fynvita Document Detail Screen
 * View and manage individual document
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const MOCK_DOC = {
  id: "1",
  name: "Experian Credit Report",
  type: "report",
  size: "2.4 MB",
  date: "2024-12-01",
  status: "verified",
  description:
    "Full credit report from Experian showing all accounts, inquiries, and public records.",
  uploadedBy: "You",
  lastModified: "2024-12-01 14:32:00",
  pages: 12,
  format: "PDF",
  tags: ["Credit Report", "Experian", "December 2024"],
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [doc] = useState(MOCK_DOC);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return theme.colors.success;
      case "pending":
        return theme.colors.warning;
      case "expired":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading document...</Text>
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Document</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons
              name="trash-outline"
              size={22}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Document Preview */}
        <Card style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Ionicons
              name="document-text"
              size={48}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.docName}>{doc.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(doc.status)}15` },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(doc.status) }]}
            >
              {doc.status}
            </Text>
          </View>
        </Card>

        {/* Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{doc.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{doc.size}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Format</Text>
            <Text style={styles.detailValue}>{doc.format}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pages</Text>
            <Text style={styles.detailValue}>{doc.pages}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Uploaded</Text>
            <Text style={styles.detailValue}>{doc.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Modified</Text>
            <Text style={styles.detailValue}>{doc.lastModified}</Text>
          </View>
        </Card>

        {/* Description */}
        <Card style={styles.descCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{doc.description}</Text>
        </Card>

        {/* Tags */}
        <Card style={styles.tagsCard}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {doc.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye" size={20} color="#fff" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              Share
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              Download
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  deleteButton: { padding: theme.spacing.sm },
  previewCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  previewIcon: {
    width: 80,
    height: 80,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  docName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  detailsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  descCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  description: { fontSize: 14, color: theme.colors.text, lineHeight: 22 },
  tagsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { fontSize: 12, color: theme.colors.textSecondary },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: { fontSize: 14, fontWeight: "600", color: "#fff", marginLeft: 6 },
});
