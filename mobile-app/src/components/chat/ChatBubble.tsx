/**
 * Phase 6.3.2: ChatBubble Component
 * Role-based message rendering with animations and long-press actions
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { lightTheme as theme } from "../../constants/theme";

interface ChatBubbleProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedActions?: Array<{ label: string; action: string }>;
    educationalContent?: Array<{ title: string; summary: string }>;
  };
  onActionPress?: (action: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  id,
  role,
  content,
  timestamp,
  metadata,
  onActionPress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animated appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert("Message Options", "What would you like to do?", [
      {
        text: "Copy",
        onPress: async () => {
          await Clipboard.setStringAsync(content);
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        },
      },
      {
        text: "Share",
        onPress: async () => {
          try {
            const shareResult = await Share.share({
              message: content,
              title: "Shared from Fynvita",
            });
            if (shareResult.action === Share.sharedAction) {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
          } catch (error) {
            console.error("Share failed:", error);
            Alert.alert("Error", "Failed to share content");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const isUser = role === "user";
  const isSystem = role === "system";

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && !isSystem && (
        <View style={styles.avatar}>
          <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
        </View>
      )}

      <TouchableOpacity
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.bubble,
          isUser
            ? styles.userBubble
            : isSystem
              ? styles.systemBubble
              : styles.assistantBubble,
        ]}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.content,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          {content}
        </Text>

        <Text
          style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.assistantTimestamp,
          ]}
        >
          {formatTime(timestamp)}
        </Text>

        {/* Suggested Actions */}
        {metadata?.suggestedActions && metadata.suggestedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Suggested Actions:</Text>
            {metadata.suggestedActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onActionPress?.(action.action);
                }}
              >
                <Ionicons
                  name="arrow-forward-circle"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Educational Content */}
        {metadata?.educationalContent &&
          metadata.educationalContent.length > 0 && (
            <View style={styles.educationalContainer}>
              <Text style={styles.educationalTitle}>Learn More:</Text>
              {metadata.educationalContent.map((content, index) => (
                <View key={index} style={styles.educationalCard}>
                  <Text style={styles.educationalCardTitle}>
                    {content.title}
                  </Text>
                  <Text style={styles.educationalCardSummary}>
                    {content.summary}
                  </Text>
                </View>
              ))}
            </View>
          )}
      </TouchableOpacity>

      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    alignItems: "flex-end",
    paddingHorizontal: theme.spacing.sm,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.xs,
  },
  userAvatar: {
    backgroundColor: "#6B7280",
    marginRight: 0,
    marginLeft: theme.spacing.xs,
  },
  bubble: {
    maxWidth: "75%",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: "#FEF3C7",
    borderRadius: theme.borderRadius.md,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  userContent: {
    color: "#FFFFFF",
  },
  assistantContent: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: "#E0E7FF",
    textAlign: "right",
  },
  assistantTimestamp: {
    color: theme.colors.textSecondary,
  },
  actionsContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  actionsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  actionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "500",
    marginLeft: theme.spacing.xs,
  },
  educationalContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  educationalTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  educationalCard: {
    backgroundColor: "#F9FAFB",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  educationalCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  educationalCardSummary: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
