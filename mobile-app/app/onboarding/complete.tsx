/**
 * Fynvita Onboarding Complete Screen
 * Success screen with next steps
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Animated, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useAuthStore } from "../../src/store/authStore";
import LottieView from "lottie-react-native";

const NEXT_STEPS = [
  {
    icon: "analytics",
    title: "View Your Credit Score",
    description: "See your scores from all 3 bureaus",
    route: "/(tabs)/credit",
  },
  {
    icon: "document-text",
    title: "Start a Dispute",
    description: "Challenge inaccurate items",
    route: "/dispute/new",
  },
  {
    icon: "build",
    title: "Explore Credit Builder",
    description: "Tools to improve your score",
    route: "/credit-builder",
  },
  {
    icon: "shield-checkmark",
    title: "Set Up Monitoring",
    description: "Get alerts for changes",
    route: "/monitoring",
  },
];

export default function OnboardingCompleteScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, iconSize } =
    useTheme();
  const { user, completeOnboarding } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Persist completion. completeOnboarding() REJECTS when the write fails, and
   * an uncaught rejection inside an effect is an unhandled promise rejection —
   * previously unreachable because nothing entered this wizard.
   *
   * The failure is SURFACED rather than swallowed. A silent catch left this
   * screen saying "You're all set!" over a database that had recorded nothing,
   * and the only symptom was being marched through the wizard again on the
   * next launch with no explanation.
   */
  const save = useCallback(() => {
    setSaving(true);
    completeOnboarding()
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true))
      .finally(() => setSaving(false));
  }, [completeOnboarding]);

  useEffect(() => {
    save();

    // Animate entrance
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [save]);

  const handleGoToDashboard = () => {
    router.replace("/(tabs)");
  };

  const handleNextStep = (route: string) => {
    router.replace(route as never);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
        }}
      >
        {/* Success Animation */}
        <Animated.View
          style={[
            { alignItems: "center", marginBottom: spacing.lg },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.success,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="checkmark" size={64} color={colors.white} />
          </View>
        </Animated.View>

        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          You're all set!
        </Text>

        {saveFailed && (
          <View
            style={{
              backgroundColor: colors.warning + "22",
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{ fontSize: 14, color: colors.text, marginBottom: 8 }}
            >
              We couldn't save that setup to your account, so you may be asked
              to run through it again next time you open the app.
            </Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                {saving ? "Retrying..." : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: spacing.lg,
          }}
        >
          Welcome to Fynvita, {user?.firstName || "there"}! Your credit journey
          starts now.
        </Text>

        {/* Progress Bar Complete */}
        <View style={{ marginBottom: spacing.xl }}>
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
                backgroundColor: colors.success,
                borderRadius: 2,
                width: "100%",
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.success,
              marginTop: 8,
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            Setup Complete
          </Text>
        </View>

        {/* Next Steps */}
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            What's Next?
          </Text>
          {NEXT_STEPS.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
              onPress={() => handleNextStep(step.route)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: withOpacity(colors.primary, 0.08),
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: spacing.md,
                }}
              >
                <Ionicons
                  name={step.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {step.title}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {step.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: borderRadius.lg,
          }}
          onPress={handleGoToDashboard}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.white,
              marginRight: 8,
            }}
          >
            Go to Dashboard
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
