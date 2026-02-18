/**
 * Educational Tooltip Component (Mobile)
 *
 * Displays contextual help and educational content with modal-based rendering
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Linking,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface EducationalTooltipProps {
  title: string;
  content: string;
  learnMoreUrl?: string;
  iconSize?: number;
  iconColor?: string;
}

export function EducationalTooltip({
  title,
  content,
  learnMoreUrl,
  iconSize = 20,
  iconColor = "#6B7280",
}: EducationalTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLearnMore = () => {
    if (learnMoreUrl) {
      Linking.openURL(learnMoreUrl);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        accessibilityLabel={`Help: ${title}`}
        accessibilityRole="button"
        style={styles.trigger}
      >
        <Ionicons
          name="information-circle-outline"
          size={iconSize}
          color={iconColor}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
              </View>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.content}>{content}</Text>

            {learnMoreUrl && (
              <TouchableOpacity
                onPress={handleLearnMore}
                style={styles.learnMoreButton}
                accessibilityLabel="Learn more"
                accessibilityRole="button"
              >
                <Text style={styles.learnMoreText}>Learn more</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={styles.gotItButton}
              accessibilityLabel="Got it"
              accessibilityRole="button"
            >
              <Text style={styles.gotItText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
    marginBottom: 20,
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3B82F6",
    marginRight: 4,
  },
  gotItButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  gotItText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
