/**
 * Phase 6.3.2: SuggestionChips Component
 * Horizontal scrollable chips for quick actions with haptic feedback
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { lightTheme as theme } from "../../constants/theme";

export interface SuggestionChip {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action: string;
}

interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  onChipPress: (action: string) => void;
  visible?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onChipPress,
  visible = true,
}) => {
  if (!visible || suggestions.length === 0) {
    return null;
  }

  const handlePress = async (action: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChipPress(action);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.chip}
            onPress={() => handlePress(chip.action)}
            activeOpacity={0.7}
          >
            {chip.icon && (
              <Ionicons
                name={chip.icon}
                size={18}
                color={theme.colors.primary}
                style={styles.icon}
              />
            )}
            <Text style={styles.label}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Pre-defined suggestion sets
export const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  {
    id: "1",
    label: "Portfolio Status",
    icon: "briefcase",
    action: "VIEW_PORTFOLIO",
  },
  {
    id: "2",
    label: "Budget Review",
    icon: "calculator",
    action: "BUDGET_ANALYSIS",
  },
  {
    id: "3",
    label: "Debt Analysis",
    icon: "trending-down",
    action: "DEBT_STRATEGY",
  },
  {
    id: "4",
    label: "Market Insights",
    icon: "trending-up",
    action: "MARKET_INSIGHTS",
  },
  {
    id: "5",
    label: "Credit Score",
    icon: "card",
    action: "CREDIT_IMPROVEMENT",
  },
  {
    id: "6",
    label: "Investment Ideas",
    icon: "bulb",
    action: "INVESTMENT_ADVICE",
  },
];

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: theme.spacing.sm,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  label: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "500",
  },
});
