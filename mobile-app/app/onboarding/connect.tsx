/**
 * Fynvita Onboarding Connect Accounts Screen
 * Connect credit bureaus and bank accounts
 */

import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { PlaidHostedLink } from "../../src/components/PlaidHostedLink";
import { useOnboardingProgress } from "../../src/hooks/useOnboardingProgress";
import { useAuthStore } from "../../src/store/authStore";
import { creditMonitoringApi } from "../../src/services/api/credit";

const STEP = 3;

const BUREAUS = [
  {
    id: "experian",
    name: "Experian",
    color: "#0066CC",
    description: "Connect to pull your Experian credit report",
  },
  {
    id: "equifax",
    name: "Equifax",
    color: "#C41230",
    description: "Connect to pull your Equifax credit report",
  },
  {
    id: "transunion",
    name: "TransUnion",
    color: "#00A3E0",
    description: "Connect to pull your TransUnion credit report",
  },
];

export default function OnboardingConnectScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const { user } = useAuthStore();
  const { completeStep } = useOnboardingProgress();
  const [connectedBureaus, setConnectedBureaus] = useState<string[]>([]);
  const [bankConnected, setBankConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  /**
   * Connect a bureau for real.
   *
   * This used to be `await new Promise(r => setTimeout(r, 1500))` followed by
   * marking the bureau connected — a 1.5s pause, a green tick, and a footer
   * reading "N of 3 bureaus connected", with no request made and nothing
   * stored. The user finished onboarding believing their credit bureaus were
   * linked. It now posts to the same endpoint the web app uses, and a failure
   * says so instead of showing success.
   */
  const handleConnectBureau = async (bureauId: string) => {
    setIsConnecting(bureauId);
    try {
      const res = await creditMonitoringApi.connectBureau(bureauId);
      if (!res.success) {
        throw new Error(res.error?.message ?? "Connection failed");
      }
      setConnectedBureaus((prev) =>
        prev.includes(bureauId) ? prev : [...prev, bureauId],
      );
    } catch (error) {
      console.error(`Failed to connect ${bureauId}:`, error);
      Alert.alert(
        "Could not connect",
        `We could not connect to ${bureauId}. You can try again, or skip and connect later from Settings.`,
      );
    } finally {
      setIsConnecting(null);
    }
  };

  const handleContinue = async () => {
    await completeStep(STEP, {
      connectedBureaus,
      bankConnected,
    });
    router.push("/onboarding/complete");
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Account Connection?",
      "You can connect your accounts later from Settings. Some features may be limited.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Skip", onPress: () => router.push("/onboarding/complete") },
      ],
    );
  };

  const progress = 3 / 4;

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
            Step 3 of 4
          </Text>
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: fontWeight.bold,
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Connect your accounts
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              marginBottom: spacing.xl,
            }}
          >
            Link your credit bureaus and bank to unlock all features
          </Text>

          {/* Credit Bureaus */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: fontWeight.semibold,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            Credit Bureaus
          </Text>
          {BUREAUS.map((bureau) => {
            const isConnected = connectedBureaus.includes(bureau.id);
            const isLoading = isConnecting === bureau.id;
            return (
              <Card key={bureau.id} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: spacing.md,
                      backgroundColor: withOpacity(bureau.color, 0.12),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: fontWeight.bold,
                        color: bureau.color,
                      }}
                    >
                      {bureau.name[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: fontWeight.semibold,
                        color: colors.text,
                      }}
                    >
                      {bureau.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {bureau.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      {
                        backgroundColor: colors.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: borderRadius.md,
                      },
                      isConnected && { backgroundColor: colors.success },
                    ]}
                    onPress={() =>
                      !isConnected && handleConnectBureau(bureau.id)
                    }
                    disabled={isConnected || isLoading}
                  >
                    {isLoading ? (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: fontWeight.medium,
                          color: colors.white,
                        }}
                      >
                        ...
                      </Text>
                    ) : isConnected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.white}
                      />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: fontWeight.medium,
                          color: colors.white,
                        }}
                      >
                        Connect
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}

          {/* Bank Account */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: fontWeight.semibold,
              color: colors.text,
              marginBottom: spacing.md,
              marginTop: spacing.lg,
            }}
          >
            Bank Account (Optional)
          </Text>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: spacing.md,
                  backgroundColor: withOpacity(colors.success, 0.12),
                }}
              >
                <Ionicons name="business" size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: fontWeight.semibold,
                    color: colors.text,
                  }}
                >
                  Link Bank Account
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Track spending and get financial insights
                </Text>
              </View>
              {bankConnected ? (
                <View
                  style={{
                    backgroundColor: colors.success,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </View>
              ) : null}
            </View>

            {/*
              The real Plaid flow: hosted-link -> WebView -> deep-link callback
              -> exchange-token. It replaces a button that waited 1.5s and then
              set bankConnected = true without contacting anything, while this
              exact component already existed in the same app.

              Rendered only for a signed-in user because /financial/plaid/
              hosted-link requires a userId matching the caller's token.
            */}
            {!bankConnected && user?.id ? (
              <PlaidHostedLink
                userId={user.id}
                onSuccess={() => setBankConnected(true)}
                onExit={(error) => {
                  if (error) {
                    console.error("Plaid link failed:", error);
                    Alert.alert(
                      "Could not link your bank",
                      "You can try again, or skip and link it later from Settings.",
                    );
                  }
                }}
              />
            ) : null}
          </Card>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              backgroundColor: withOpacity(colors.success, 0.12),
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginTop: spacing.lg,
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={colors.success}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: colors.textSecondary,
                marginLeft: 10,
                lineHeight: 18,
              }}
            >
              Bank-level encryption protects your data. We never store your
              login credentials.
            </Text>
          </View>
        </View>
      </ScrollView>

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
          onPress={handleContinue}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: fontWeight.semibold,
              color: colors.white,
              marginRight: 8,
            }}
          >
            Continue
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
          {connectedBureaus.length} of 3 bureaus connected
        </Text>
      </View>
    </SafeAreaView>
  );
}
