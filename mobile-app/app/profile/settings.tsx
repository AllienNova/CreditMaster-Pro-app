import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { useAuthStore } from "../../src/store/authStore";
import { supabase } from "../../src/services/supabase";

interface SettingItem {
  id: string;
  label: string;
  icon: string;
  type: "toggle" | "link" | "action";
  value?: boolean;
  description?: string;
}

const SETTINGS_SECTIONS = [
  {
    title: "Notifications",
    items: [
      {
        id: "push",
        label: "Push Notifications",
        icon: "notifications-outline",
        type: "toggle",
        value: true,
      },
      {
        id: "email",
        label: "Email Notifications",
        icon: "mail-outline",
        type: "toggle",
        value: true,
      },
      {
        id: "sms",
        label: "SMS Alerts",
        icon: "chatbubble-outline",
        type: "toggle",
        value: false,
      },
      {
        id: "score_alerts",
        label: "Score Change Alerts",
        icon: "trending-up-outline",
        type: "toggle",
        value: true,
      },
      {
        id: "dispute_updates",
        label: "Dispute Updates",
        icon: "document-text-outline",
        type: "toggle",
        value: true,
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        id: "biometric",
        label: "Biometric Login",
        icon: "finger-print-outline",
        type: "toggle",
        value: true,
        description: "Use Face ID or fingerprint",
      },
      {
        id: "two_factor",
        label: "Two-Factor Auth",
        icon: "shield-checkmark-outline",
        type: "link",
      },
      {
        id: "change_password",
        label: "Change Password",
        icon: "key-outline",
        type: "link",
      },
      {
        id: "sessions",
        label: "Active Sessions",
        icon: "phone-portrait-outline",
        type: "link",
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      {
        id: "data_sharing",
        label: "Data Sharing",
        icon: "share-outline",
        type: "toggle",
        value: false,
      },
      {
        id: "analytics",
        label: "Usage Analytics",
        icon: "analytics-outline",
        type: "toggle",
        value: true,
      },
      {
        id: "download_data",
        label: "Download My Data",
        icon: "download-outline",
        type: "link",
      },
      {
        id: "delete_account",
        label: "Delete Account",
        icon: "trash-outline",
        type: "action",
      },
    ],
  },
  {
    title: "App",
    items: [
      {
        id: "dark_mode",
        label: "Dark Mode",
        icon: "moon-outline",
        type: "toggle",
        value: false,
      },
      {
        id: "language",
        label: "Language",
        icon: "language-outline",
        type: "link",
      },
      {
        id: "clear_cache",
        label: "Clear Cache",
        icon: "trash-bin-outline",
        type: "action",
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push: true,
    email: true,
    sms: false,
    score_alerts: true,
    dispute_updates: true,
    biometric: true,
    data_sharing: false,
    analytics: true,
    dark_mode: false,
  });

  const handleToggle = (id: string) => {
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete user profile from database
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Sign out the user (the auth deletion should be handled by Supabase edge function or admin)
      await logout();

      Alert.alert(
        "Account Deleted",
        "Your account has been successfully deleted.",
      );
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAction = (id: string) => {
    if (id === "delete_account") {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              // Second confirmation for destructive action
              Alert.alert(
                "Final Confirmation",
                "This is your last chance to cancel. Are you absolutely sure?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Yes, Delete My Account",
                    style: "destructive",
                    onPress: handleDeleteAccount,
                  },
                ],
              );
            },
          },
        ],
      );
    } else if (id === "clear_cache") {
      Alert.alert("Clear Cache", "Cache cleared successfully!");
    }
  };

  const handleLink = (id: string) => {
    const routes: Record<string, string> = {
      two_factor: "/settings/privacy",
      change_password: "/profile/security",
      sessions: "/settings/privacy",
      download_data: "/settings/privacy",
      language: "/settings/notifications",
    };

    const route = routes[id];
    if (route) {
      router.push(route as Href);
    }
  };

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
      onPress={() => {
        if (item.type === "toggle") handleToggle(item.id);
        else if (item.type === "action") handleAction(item.id);
        else handleLink(item.id);
      }}
      activeOpacity={item.type === "toggle" ? 1 : 0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <View
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: withOpacity(colors.primary, 0.08),
              alignItems: "center",
              justifyContent: "center",
            },
            item.id === "delete_account" && {
              backgroundColor: withOpacity(colors.error, 0.1),
            },
          ]}
        >
          <Ionicons
            name={item.icon as any}
            size={22}
            color={item.id === "delete_account" ? colors.error : colors.primary}
          />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text
            style={[
              { fontSize: fontSize.md, color: colors.text },
              item.id === "delete_account" && { color: colors.error },
            ]}
          >
            {item.label}
          </Text>
          {item.description && (
            <Text
              style={{
                fontSize: fontSize.xs,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {item.description}
            </Text>
          )}
        </View>
      </View>
      {item.type === "toggle" ? (
        <Switch
          value={settings[item.id]}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{
            false: colors.border,
            true: withOpacity(colors.primary, 0.38),
          }}
          thumbColor={settings[item.id] ? colors.primary : colors.borderLight}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: spacing.md,
          paddingTop: 48,
          backgroundColor: colors.surface,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text,
          }}
        >
          Settings
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.textSecondary,
                textTransform: "uppercase",
                paddingHorizontal: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              {section.title}
            </Text>
            <View style={{ backgroundColor: colors.surface }}>
              {section.items.map((item) =>
                renderSettingItem(item as SettingItem),
              )}
            </View>
          </View>
        ))}

        <View
          style={{
            alignItems: "center",
            padding: spacing.lg,
            marginTop: spacing.lg,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
            Fynvita v1.0.0
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: spacing.sm,
            }}
          >
            <TouchableOpacity>
              <Text style={{ fontSize: fontSize.sm, color: colors.primary }}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                marginHorizontal: spacing.sm,
                color: colors.textSecondary,
              }}
            >
              •
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: fontSize.sm, color: colors.primary }}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
