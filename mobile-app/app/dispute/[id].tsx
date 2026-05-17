import React, { useEffect } from "react";
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
import { lightTheme as theme, colors } from "../../src/constants/theme";
import { useDisputeStore } from "../../src/store/disputeStore";

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F3F4F6", text: "#6B7280" },
  pending: { bg: "#EDE9FE", text: "#7C3AED" },
  sent: { bg: "#DBEAFE", text: "#2563EB" },
  in_progress: { bg: "#FEF3C7", text: "#D97706" },
  under_review: { bg: "#FEF3C7", text: "#D97706" },
  resolved: { bg: "#DCFCE7", text: "#16A34A" },
  rejected: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentDispute, isLoading, error, fetchDisputeById } =
    useDisputeStore();

  useEffect(() => {
    if (id) {
      fetchDisputeById(id);
    }
  }, [id]);

  if (isLoading) {
    return (
      <View testID="loading-indicator" style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!currentDispute || error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || "Dispute not found"}
        </Text>
      </View>
    );
  }

  const dispute = currentDispute;

  const timeline = [
    {
      date: dispute.createdAt,
      title: "Dispute Created",
      description: "You created this dispute",
    },
    ...(dispute.sentAt
      ? [
          {
            date: dispute.sentAt,
            title: "Letter Sent",
            description: "Dispute letter sent to bureau",
          },
        ]
      : []),
    ...(dispute.resolvedAt
      ? [
          {
            date: dispute.resolvedAt,
            title: "Resolved",
            description: dispute.outcome
              ? `Outcome: ${dispute.outcome}`
              : "Dispute resolved",
          },
        ]
      : []),
    {
      date: dispute.updatedAt,
      title: "Last Updated",
      description: "Most recent activity",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text
            style={[
              styles.bureau,
              {
                color:
                  colors.bureaus[dispute.bureau as keyof typeof colors.bureaus],
              },
            ]}
          >
            {dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[dispute.status]?.bg },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: statusColors[dispute.status]?.text },
              ]}
            >
              {dispute.status.replace("_", " ")}
            </Text>
          </View>
        </View>
        <Text style={styles.itemType}>{dispute.itemType}</Text>
        <Text style={styles.creditorName}>{dispute.creditorName}</Text>
      </View>

      {/* Dispute Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispute Reason</Text>
        <View style={styles.card}>
          <Text style={styles.reasonText}>{dispute.disputeReason}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.card}>
          {timeline.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View
                  style={[
                    styles.dot,
                    index === timeline.length - 1 && styles.dotActive,
                  ]}
                />
                {index < timeline.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineDesc}>{item.description}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {dispute.status === "draft" && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => {}}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Send Dispute</Text>
          </TouchableOpacity>
        )}
        {dispute.letterContent && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push(`/dispute/${dispute.id}`)}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.secondaryButtonText}>View Letter</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Ionicons name="attach" size={20} color={theme.colors.primary} />
          <Text style={styles.secondaryButtonText}>Add Documents</Text>
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
  headerCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  bureau: { fontSize: 14, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  itemType: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  creditorName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  section: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  reasonText: { fontSize: 14, color: theme.colors.text, lineHeight: 22 },
  timelineItem: { flexDirection: "row", marginBottom: theme.spacing.md },
  timelineDot: { alignItems: "center", marginRight: theme.spacing.md },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  dotActive: { backgroundColor: theme.colors.primary },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  timelineContent: { flex: 1, paddingBottom: theme.spacing.md },
  timelineTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  timelineDesc: { fontSize: 13, color: theme.colors.textSecondary },
  timelineDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
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
});
