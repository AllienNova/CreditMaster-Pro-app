/**
 * Quest Card Component for Mobile
 * Displays daily quests with progress
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../constants/theme";

type QuestType = "daily" | "weekly" | "challenge";

interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: QuestType;
  progress: number;
  target: number;
  completed: boolean;
  expiresAt?: string;
}

interface QuestCardProps {
  quest: Quest;
  onComplete?: () => void;
}

export function QuestCard({ quest, onComplete }: QuestCardProps) {
  const progressPercent = Math.min((quest.progress / quest.target) * 100, 100);
  const isComplete = quest.completed || quest.progress >= quest.target;

  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (quest.type) {
      case "daily":
        return "sunny";
      case "weekly":
        return "calendar";
      case "challenge":
        return "trophy";
      default:
        return "star";
    }
  };

  const getTypeColor = (): string => {
    switch (quest.type) {
      case "daily":
        return "#F59E0B";
      case "weekly":
        return "#3B82F6";
      case "challenge":
        return "#A855F7";
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.container, isComplete && styles.containerComplete]}>
      <View style={styles.header}>
        <View
          style={[styles.typeIcon, { backgroundColor: `${getTypeColor()}15` }]}
        >
          <Ionicons name={getTypeIcon()} size={18} color={getTypeColor()} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, isComplete && styles.titleComplete]}>
            {quest.title}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {quest.description}
          </Text>
        </View>
        <View style={styles.rewardContainer}>
          <Text style={styles.xpReward}>+{quest.xpReward}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: getTypeColor() },
            ]}
          />
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {quest.progress} / {quest.target}
          </Text>
          {quest.expiresAt && !isComplete && (
            <Text style={styles.expiresText}>
              Expires {new Date(quest.expiresAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {isComplete && !quest.completed && onComplete && (
        <TouchableOpacity
          style={[styles.claimButton, { backgroundColor: getTypeColor() }]}
          onPress={onComplete}
        >
          <Ionicons name="gift" size={16} color="#fff" />
          <Text style={styles.claimText}>Claim Reward</Text>
        </TouchableOpacity>
      )}

      {quest.completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerComplete: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  titleComplete: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rewardContainer: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  xpReward: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  xpLabel: {
    fontSize: 10,
    color: "#B45309",
  },
  progressSection: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  expiresText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  claimText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#22C55E",
  },
});

export default QuestCard;
