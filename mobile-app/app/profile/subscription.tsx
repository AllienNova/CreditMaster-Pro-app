import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { useAuthStore } from "../../src/store/authStore";
import { userApi } from "../../src/services/api/user";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    features: [
      "Basic credit monitoring",
      "1 dispute per month",
      "Limited AI assistance",
      "Email support",
    ],
    current: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 29,
    period: "month",
    features: [
      "3-bureau monitoring",
      "5 disputes per month",
      "AI dispute letters",
      "Priority email support",
      "Score simulator",
    ],
    current: true,
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 79,
    period: "month",
    features: [
      "Real-time monitoring",
      "Unlimited disputes",
      "Advanced AI tools",
      "Phone support",
      "Score simulator",
      "Identity protection",
      "Student loan tools",
    ],
    current: false,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    period: "month",
    features: [
      "Everything in Premium",
      "Dedicated account manager",
      "Custom integrations",
      "API access",
      "White-label options",
      "SLA guarantee",
    ],
    current: false,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const handleUpgrade = (planId: string) => {
    if (planId === "basic") return; // Already on this plan
    Alert.alert(
      "Upgrade Plan",
      `Upgrade to ${PLANS.find((p) => p.id === planId)?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upgrade",
          onPress: () => {
            /* TODO: Implement upgrade flow */
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You will lose access to premium features at the end of your billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => {
            /* TODO: Implement cancellation flow */
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
          paddingTop: 48,
          backgroundColor: colors.surface,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>
          Subscription
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
              Current Plan
            </Text>
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text
                style={{ fontSize: 12, color: colors.white, fontWeight: "600" }}
              >
                Active
              </Text>
            </View>
          </View>
          <Text
            style={{ fontSize: 28, fontWeight: "700", color: colors.white }}
          >
            Basic
          </Text>
          <Text style={{ fontSize: 20, color: colors.white, marginTop: 4 }}>
            $29
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
              /month
            </Text>
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              marginTop: 12,
            }}
          >
            Renews on January 15, 2025
          </Text>
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Available Plans
        </Text>

        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: "transparent",
              },
              plan.current && { borderColor: colors.primary },
              plan.popular && { borderColor: colors.warning },
            ]}
            onPress={() => setSelectedPlan(plan.id)}
            activeOpacity={0.8}
          >
            {plan.popular && (
              <View
                style={{
                  position: "absolute",
                  top: -10,
                  right: 16,
                  backgroundColor: colors.warning,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.white,
                    fontWeight: "600",
                  }}
                >
                  Most Popular
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {plan.name}
                </Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                  {plan.price > 0 && (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "400",
                        color: colors.textSecondary,
                      }}
                    >
                      /{plan.period}
                    </Text>
                  )}
                </Text>
              </View>
              {plan.current ? (
                <View
                  style={{
                    backgroundColor: withOpacity(colors.primary, 0.12),
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    Current
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    {
                      backgroundColor: withOpacity(colors.primary, 0.08),
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                    },
                    plan.popular && { backgroundColor: colors.warning },
                  ]}
                  onPress={() => handleUpgrade(plan.id)}
                >
                  <Text
                    style={[
                      {
                        fontSize: 14,
                        color: colors.primary,
                        fontWeight: "600",
                      },
                      plan.popular && { color: colors.white },
                    ]}
                  >
                    {plan.price === 0 ? "Downgrade" : "Upgrade"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ marginTop: 8 }}>
              {plan.features.map((feature, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={plan.popular ? colors.warning : colors.primary}
                  />
                  <Text style={{ fontSize: 14, color: colors.text }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Billing
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons name="card-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>
                Payment Method
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                •••• 4242
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>
                Billing History
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                View invoices
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            alignItems: "center",
            padding: 16,
            marginTop: 24,
            marginBottom: 32,
          }}
          onPress={handleCancel}
        >
          <Text style={{ fontSize: 16, color: colors.error }}>
            Cancel Subscription
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
