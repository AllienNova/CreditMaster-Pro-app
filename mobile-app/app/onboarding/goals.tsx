/**
 * Fynvita Onboarding Goals Screen
 * Select credit improvement goals
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { useAuthStore } from "../../src/store/authStore";
import { useOnboardingProgress } from "../../src/hooks/useOnboardingProgress";

const STEP = 2;

const GOALS = [
  {
    id: "improve_score",
    icon: "trending-up",
    title: "Improve My Credit Score",
    description: "Get personalized tips to boost your score",
    color: "#22C55E",
  },
  {
    id: "dispute_errors",
    icon: "document-text",
    title: "Dispute Errors",
    description: "Challenge inaccurate items on my report",
    color: "#3B82F6",
  },
  {
    id: "buy_home",
    icon: "home",
    title: "Buy a Home",
    description: "Prepare for a mortgage application",
    color: "#F59E0B",
  },
  {
    id: "buy_car",
    icon: "car",
    title: "Buy a Car",
    description: "Get ready for auto financing",
    color: "#8B5CF6",
  },
  {
    id: "get_credit_card",
    icon: "card",
    title: "Get a Credit Card",
    description: "Find the best card for my needs",
    color: "#EC4899",
  },
  {
    id: "reduce_debt",
    icon: "wallet",
    title: "Reduce Debt",
    description: "Create a debt payoff strategy",
    color: "#EF4444",
  },
  {
    id: "student_loans",
    icon: "school",
    title: "Manage Student Loans",
    description: "Navigate repayment options",
    color: "#06B6D4",
  },
  {
    id: "monitor_credit",
    icon: "shield-checkmark",
    title: "Monitor My Credit",
    description: "Stay on top of changes",
    color: "#10B981",
  },
];

export default function OnboardingGoalsScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, iconSize } =
    useTheme();
  const { updateProfile } = useAuthStore();
  const {
    progress: savedProgress,
    loading,
    completeStep,
  } = useOnboardingProgress();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hydratedRef = useRef(false);

  // Restore the picks from a previous run. Async load, so not a useState
  // initialiser — see the same note in profile.tsx.
  useEffect(() => {
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;

    const saved = savedProgress.form_data?.goals;
    if (Array.isArray(saved) && saved.length > 0) {
      setSelectedGoals(saved.filter((g): g is string => typeof g === "string"));
    }
  }, [loading, savedProgress.form_data]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId],
    );
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ goals: selectedGoals });
    } catch (error) {
      console.error("Failed to save goals:", error);
    }

    // Recorded even when updateProfile threw, so a failed write does not also
    // cost the user the selections they made.
    await completeStep(STEP, { goals: selectedGoals });
    setIsLoading(false);
    router.push("/onboarding/connect");
  };

  const handleSkip = () => {
    router.push("/onboarding/connect");
  };

  const progress = 2 / 4;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={{ fontSize: 16, color: colors.primary }}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View
          style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}
        >
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
            }}
          >
            <View
              style={{
                height: "100%",
                backgroundColor: colors.primary,
                borderRadius: 2,
                width: `${progress * 100}%`,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Step 2 of 4
          </Text>
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            What are your goals?
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              marginBottom: spacing.xl,
            }}
          >
            Select all that apply. We'll customize your experience.
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    {
                      width: "48%",
                      backgroundColor: colors.surface,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      position: "relative" as const,
                    },
                    isSelected && { borderColor: goal.color, borderWidth: 2 },
                  ]}
                  onPress={() => toggleGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: spacing.sm,
                      backgroundColor: withOpacity(goal.color, 0.12),
                    }}
                  >
                    <Ionicons
                      name={goal.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={goal.color}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {goal.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      lineHeight: 16,
                    }}
                  >
                    {goal.description}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: goal.color,
                      }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.white}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <TouchableOpacity
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              paddingVertical: 16,
              borderRadius: borderRadius.lg,
            },
            selectedGoals.length === 0 && { opacity: 0.5 },
          ]}
          onPress={handleContinue}
          disabled={selectedGoals.length === 0 || isLoading}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.white,
              marginRight: 8,
            }}
          >
            {isLoading ? "Saving..." : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          {selectedGoals.length} goal{selectedGoals.length !== 1 ? "s" : ""}{" "}
          selected
        </Text>
      </View>
    </SafeAreaView>
  );
}
