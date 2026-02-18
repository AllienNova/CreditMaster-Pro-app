/**
 * Fynvita Onboarding Profile Setup Screen
 * Collect user profile information
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useAuthStore } from "../../src/store/authStore";

export default function OnboardingProfileScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, iconSize } =
    useTheme();
  const { user, updateProfile } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ firstName, lastName, phone, dateOfBirth });
      router.push("/onboarding/goals");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/goals");
  };

  const progress = 1 / 4;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              Step 1 of 4
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
              Let's set up your profile
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginBottom: spacing.xl,
              }}
            >
              This helps us personalize your experience
            </Text>

            <Card style={{ marginBottom: spacing.md }}>
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  First Name *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Last Name *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Phone Number
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Date of Birth
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </Card>

            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              <Ionicons
                name="lock-closed"
                size={14}
                color={colors.textSecondary}
              />{" "}
              Your information is encrypted and secure
            </Text>
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
              (!firstName.trim() || !lastName.trim()) && { opacity: 0.5 },
            ]}
            onPress={handleContinue}
            disabled={!firstName.trim() || !lastName.trim() || isLoading}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
