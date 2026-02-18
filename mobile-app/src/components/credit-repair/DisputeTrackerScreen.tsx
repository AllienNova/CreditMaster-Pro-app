/**
 * Dispute Tracker Screen (Mobile)
 *
 * Mobile-optimized dispute tracking with swipe actions,
 * progress indicators, and AI recommendations.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import { lightTheme as theme } from "../../constants/theme";

// ============================================================================
// TYPES
// ============================================================================

export interface Dispute {
  id: string;
  itemType: "account" | "inquiry" | "collection" | "public_record";
  creditorName: string;
  accountNumber?: string;
  bureau: "experian" | "equifax" | "transunion";
  status: "draft" | "pending" | "in_review" | "resolved" | "rejected";
  reason: string;
  submittedDate?: Date;
  estimatedImpact: number;
  confidenceScore: number;
}

export interface DisputeStats {
  total: number;
  pending: number;
  resolved: number;
  successRate: number;
  estimatedScoreGain: number;
}

export interface DisputeTrackerScreenProps {
  disputes: Dispute[];
  stats: DisputeStats;
  currentScore?: number;
  onDisputePress?: (id: string) => void;
  onCreateDispute?: () => void;
  onSendDispute?: (id: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get("window");

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "#6B7280", bg: "#6B728020" },
  pending: { label: "Pending", color: "#F59E0B", bg: "#F59E0B20" },
  in_review: { label: "In Review", color: "#3B82F6", bg: "#3B82F620" },
  resolved: { label: "Resolved", color: "#10B981", bg: "#10B98120" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "#EF444420" },
};

const BUREAU_CONFIG = {
  experian: { color: "#1a4480", label: "Experian" },
  equifax: { color: "#c41230", label: "Equifax" },
  transunion: { color: "#00a3e0", label: "TransUnion" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DisputeTrackerScreen({
  disputes,
  stats,
  currentScore,
  onDisputePress,
  onCreateDispute,
  onSendDispute,
}: DisputeTrackerScreenProps) {
  const [filter, setFilter] = useState<"all" | Dispute["status"]>("all");

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    if (filter === "all") return disputes;
    return disputes.filter((d) => d.status === filter);
  }, [disputes, filter]);

  // Group by status for summary
  const statusCounts = useMemo(
    () => ({
      draft: disputes.filter((d) => d.status === "draft").length,
      pending: disputes.filter((d) => d.status === "pending").length,
      in_review: disputes.filter((d) => d.status === "in_review").length,
      resolved: disputes.filter((d) => d.status === "resolved").length,
    }),
    [disputes],
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.scoreCard}>
          {currentScore && (
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{currentScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          )}
          <View style={styles.statsColumn}>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Disputes</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statValue, { color: "#10B981" }]}>
                +{stats.estimatedScoreGain}
              </Text>
              <Text style={styles.statLabel}>Est. Score Gain</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsContainer}
        >
          <TouchableOpacity
            style={[styles.pill, filter === "all" && styles.pillActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.pillText,
                filter === "all" && styles.pillTextActive,
              ]}
            >
              All ({disputes.length})
            </Text>
          </TouchableOpacity>
          {(["draft", "pending", "in_review", "resolved"] as const).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.pill,
                  filter === status && styles.pillActive,
                  { borderColor: STATUS_CONFIG[status].color },
                ]}
                onPress={() => setFilter(status)}
              >
                <View
                  style={[
                    styles.pillDot,
                    { backgroundColor: STATUS_CONFIG[status].color },
                  ]}
                />
                <Text
                  style={[
                    styles.pillText,
                    filter === status && styles.pillTextActive,
                  ]}
                >
                  {STATUS_CONFIG[status].label} ({statusCounts[status]})
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>

      {/* Success Rate Banner */}
      {stats.successRate > 0 && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>
            🎯 {stats.successRate.toFixed(0)}% Success Rate • {stats.resolved}{" "}
            disputes resolved
          </Text>
        </View>
      )}

      {/* Dispute List */}
      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DisputeCard
            dispute={item}
            onPress={() => onDisputePress?.(item.id)}
            onSend={() => onSendDispute?.(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No disputes yet</Text>
            <Text style={styles.emptySubtitle}>
              Start improving your credit by disputing inaccurate items
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateDispute}
            >
              <Text style={styles.createButtonText}>Create Dispute</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      {disputes.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={onCreateDispute}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// DISPUTE CARD
// ============================================================================

interface DisputeCardProps {
  dispute: Dispute;
  onPress: () => void;
  onSend: () => void;
}

function DisputeCard({ dispute, onPress, onSend }: DisputeCardProps) {
  const statusConfig = STATUS_CONFIG[dispute.status];
  const bureauConfig = BUREAU_CONFIG[dispute.bureau];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Bureau indicator */}
      <View
        style={[
          styles.bureauIndicator,
          { backgroundColor: bureauConfig.color },
        ]}
      />

      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.creditorName}>{dispute.creditorName}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
            >
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.itemType}>
            {dispute.itemType.replace("_", " ")} • {bureauConfig.label}
          </Text>
        </View>

        {/* Reason */}
        <Text style={styles.reason} numberOfLines={2}>
          {dispute.reason}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.impactContainer}>
            <Text style={styles.impactLabel}>Est. Impact</Text>
            <Text style={styles.impactValue}>
              +{dispute.estimatedImpact} pts
            </Text>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${dispute.confidenceScore * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>
              {(dispute.confidenceScore * 100).toFixed(0)}%
            </Text>
          </View>

          {dispute.status === "draft" && (
            <TouchableOpacity style={styles.sendButton} onPress={onSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        {dispute.submittedDate && (
          <Text style={styles.timeline}>
            Submitted {formatDate(dispute.submittedDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  scoreLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  statsColumn: {
    flex: 1,
  },
  statRow: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pillsContainer: {
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pillTextActive: {
    color: "#fff",
  },
  successBanner: {
    backgroundColor: "#10B98120",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  successText: {
    fontSize: 13,
    color: "#10B981",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  bureauIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creditorName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reason: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  impactContainer: {
    marginRight: 16,
  },
  impactLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  confidenceContainer: {
    flex: 1,
  },
  confidenceLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  timeline: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "300",
  },
});

export default DisputeTrackerScreen;
