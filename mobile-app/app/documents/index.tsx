/**
 * Fynvita Documents Library Screen
 * Manage credit repair documents — backed by the real documents API
 * (documentApi.getAll / documentApi.upload). No mock data.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { documentApi } from "../../src/services/api/user";
import type { Document } from "../../src/services/api/types";
import { toArray } from "../../src/store/toArray";

const FILTER_TYPES: { key: Document["type"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit_report", label: "Reports" },
  { key: "dispute_response", label: "Responses" },
  { key: "identity", label: "Identity" },
  { key: "income", label: "Income" },
  { key: "other", label: "Other" },
];

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<Document["type"] | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      setError(null);
      const response = await documentApi.getAll();
      if (response.success && response.data) {
        setDocuments(toArray<Document>(response?.data?.documents));
      } else {
        setError(
          response.error?.message ||
            response.message ||
            "Failed to load documents",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      const asset = result.assets?.[0];
      if (result.canceled || !asset) {
        return;
      }

      setUploading(true);
      const response = await documentApi.upload(
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        },
        "other",
      );
      setUploading(false);

      if (response.success) {
        Alert.alert("Upload Complete", "Your document is being processed.");
        await loadDocuments();
      } else {
        Alert.alert(
          "Upload Failed",
          response.error?.message ||
            response.message ||
            "Failed to upload document. Please try again.",
        );
      }
    } catch {
      setUploading(false);
      Alert.alert("Error", "Failed to upload document. Please try again.");
    }
  }, [loadDocuments]);

  const getTypeIcon = (type: Document["type"]) => {
    switch (type) {
      case "credit_report":
        return "document-text";
      case "dispute_response":
        return "chatbox-ellipses";
      case "identity":
        return "card";
      case "income":
        return "cash";
      default:
        return "document";
    }
  };

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "analyzed":
        return theme.colors.success;
      case "processing":
        return theme.colors.warning;
      case "error":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocs = filter
    ? documents.filter((d) => d.type === filter)
    : documents;
  const stats = {
    total: documents.length,
    reports: documents.filter((d) => d.type === "credit_report").length,
    responses: documents.filter((d) => d.type === "dispute_response").length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View testID="loading-indicator" style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View testID="error-state" style={styles.centeredState}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.stateTitle}>Couldn't load documents</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDocuments}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
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
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>Manage your files</Text>
          </View>
          <TouchableOpacity
            testID="upload-button"
            style={styles.uploadButton}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.reports}
            </Text>
            <Text style={styles.statLabel}>Reports</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.secondary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {stats.responses}
            </Text>
            <Text style={styles.statLabel}>Responses</Text>
          </Card>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {FILTER_TYPES.map(({ key, label }) => {
            const isActive =
              filter === key || (key === "all" && filter === null);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(key === "all" ? null : key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Documents List */}
        <View style={styles.docsList}>
          {filteredDocs.length === 0 ? (
            <View testID="empty-state" style={styles.centeredState}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.stateTitle}>No documents yet</Text>
              <Text style={styles.stateSubtitle}>
                Upload your credit reports and letters to get started.
              </Text>
            </View>
          ) : (
            filteredDocs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                onPress={() => router.push(`/documents/${doc.id}`)}
              >
                <Card style={styles.docCard}>
                  <View style={styles.docIcon}>
                    <Ionicons
                      name={
                        getTypeIcon(doc.type) as keyof typeof Ionicons.glyphMap
                      }
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={styles.docMeta}>
                      {formatSize(doc.fileSize)} •{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(doc.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(doc.status) },
                      ]}
                    >
                      {doc.status}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
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
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  stateSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  uploadButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.primary,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  docsList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  docIcon: {
    width: 44,
    height: 44,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  docMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
});
