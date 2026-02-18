/**
 * Badge Card Component for Mobile
 * Displays achievement badges with rarity styling
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../constants/theme";
import type { Badge, BadgeRarity } from "../../services/api/gamification";

interface BadgeCardProps {
  badge: Badge;
  isEarned?: boolean;
  progress?: number;
  earnedDate?: string;
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
}

const rarityStyles: Record<
  BadgeRarity,
  { bg: string; border: string; text: string }
> = {
  common: { bg: "#F3F4F6", border: "#9CA3AF", text: "#6B7280" },
  uncommon: { bg: "#DCFCE7", border: "#22C55E", text: "#16A34A" },
  rare: { bg: "#DBEAFE", border: "#3B82F6", text: "#2563EB" },
  epic: { bg: "#F3E8FF", border: "#A855F7", text: "#9333EA" },
  legendary: { bg: "#FEF3C7", border: "#F59E0B", text: "#D97706" },
};

export function BadgeCard({
  badge,
  isEarned = false,
  progress = 0,
  earnedDate,
  size = "md",
  onPress,
}: BadgeCardProps) {
  const rarity = rarityStyles[badge.rarity];

  const sizeStyles = {
    sm: { container: styles.containerSm, icon: 28, name: 10, badge: 40 },
    md: { container: styles.containerMd, icon: 36, name: 12, badge: 56 },
    lg: { container: styles.containerLg, icon: 48, name: 14, badge: 72 },
  };

  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[styles.container, currentSize.container]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[
          styles.badgeCircle,
          {
            width: currentSize.badge,
            height: currentSize.badge,
            backgroundColor: isEarned ? rarity.bg : "#F3F4F6",
            borderColor: isEarned ? rarity.border : "#E5E7EB",
            opacity: isEarned ? 1 : 0.5,
          },
        ]}
      >
        <Text style={{ fontSize: currentSize.icon }}>{badge.icon}</Text>
        {!isEarned && (
          <View style={styles.lockOverlay}>
            <Ionicons
              name="lock-closed"
              size={currentSize.icon * 0.5}
              color="#9CA3AF"
            />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.badgeName,
          {
            fontSize: currentSize.name,
            color: isEarned ? theme.colors.text : "#9CA3AF",
          },
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {!isEarned && progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}

      {isEarned && earnedDate && size !== "sm" && (
        <Text style={styles.earnedDate}>
          {new Date(earnedDate).toLocaleDateString()}
        </Text>
      )}

      {size !== "sm" && (
        <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
          <Text style={[styles.rarityText, { color: rarity.text }]}>
            {badge.rarity}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerSm: {
    padding: 8,
    width: 70,
  },
  containerMd: {
    padding: 12,
    width: 100,
  },
  containerLg: {
    padding: 16,
    width: 130,
  },
  badgeCircle: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  progressContainer: {
    width: "100%",
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  earnedDate: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});

export default BadgeCard;
