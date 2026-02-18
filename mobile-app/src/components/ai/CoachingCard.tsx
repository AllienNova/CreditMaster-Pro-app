/**
 * Coaching Card Component for Mobile
 * Displays behavioral coaching sessions and tips
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../constants/theme";

type CoachingTopic =
  | "budgeting"
  | "saving"
  | "investing"
  | "debt"
  | "credit"
  | "mindset";

interface CoachingSession {
  id: string;
  topic: CoachingTopic;
  title: string;
  summary: string;
  steps?: string[];
  duration?: string;
  completed?: boolean;
}

interface CoachingCardProps {
  session: CoachingSession;
  onStart?: () => void;
  onContinue?: () => void;
  compact?: boolean;
}

const topicConfig: Record<
  CoachingTopic,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  budgeting: { icon: "calculator", color: "#3B82F6", label: "Budgeting" },
  saving: { icon: "wallet", color: "#22C55E", label: "Saving" },
  investing: { icon: "trending-up", color: "#8B5CF6", label: "Investing" },
  debt: { icon: "card", color: "#EF4444", label: "Debt Management" },
  credit: { icon: "analytics", color: "#F59E0B", label: "Credit Building" },
  mindset: { icon: "bulb", color: "#06B6D4", label: "Money Mindset" },
};

export function CoachingCard({
  session,
  onStart,
  onContinue,
  compact = false,
}: CoachingCardProps) {
  const config = topicConfig[session.topic];

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={session.completed ? onContinue : onStart}
      >
        <View
          style={[styles.compactIcon, { backgroundColor: `${config.color}15` }]}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.compactMeta}>
            {config.label} • {session.duration || "5 min"}
          </Text>
        </View>
        {session.completed ? (
          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
        ) : (
          <Ionicons name="play-circle" size={22} color={config.color} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={[styles.topicBadge, { backgroundColor: `${config.color}15` }]}
        >
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.topicLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        {session.duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.durationText}>{session.duration}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{session.title}</Text>
      <Text style={styles.summary}>{session.summary}</Text>

      {session.steps && session.steps.length > 0 && (
        <View style={styles.stepsPreview}>
          <Text style={styles.stepsTitle}>What you'll learn:</Text>
          {session.steps.slice(0, 3).map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View
                style={[styles.stepNumber, { backgroundColor: config.color }]}
              >
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText} numberOfLines={1}>
                {step}
              </Text>
            </View>
          ))}
          {session.steps.length > 3 && (
            <Text style={styles.moreSteps}>
              +{session.steps.length - 3} more steps
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: config.color }]}
        onPress={session.completed ? onContinue : onStart}
      >
        <Ionicons
          name={session.completed ? "refresh" : "play"}
          size={18}
          color="#fff"
        />
        <Text style={styles.actionButtonText}>
          {session.completed ? "Review Session" : "Start Session"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topicBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  stepsPreview: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  moreSteps: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginLeft: 30,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  compactMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default CoachingCard;
