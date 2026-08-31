/**
 * Fynvita Settings Dashboard
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuthStore } from "../../src/store/authStore";
import { ScreenHeader } from "../../src/components/ScreenHeader";

export default function SettingsScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: "person", title: "Profile", route: "/settings/profile" },
        {
          icon: "notifications",
          title: "Notifications",
          route: "/settings/notifications",
        },
        {
          icon: "shield",
          title: "Privacy & Security",
          route: "/settings/privacy",
        },
      ],
    },
    {
      title: "Connections",
      items: [
        {
          icon: "link",
          title: "Connected Accounts",
          route: "/settings/connected-accounts",
        },
        {
          icon: "card",
          title: "Billing & Subscription",
          route: "/settings/billing",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "color-palette",
          title: "Appearance",
          route: "/settings/appearance",
        },
        {
          icon: "git-compare",
          title: "Transaction Rules",
          route: "/settings/transaction-rules",
        },
        {
          icon: "download",
          title: "Export Data",
          route: "/settings/data-export",
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle", title: "Help & Support", route: "/help" },
        {
          icon: "document-text",
          title: "Terms of Service",
          route: "/help/guides?id=terms",
        },
        {
          icon: "lock-closed",
          title: "Privacy Policy",
          route: "/help/guides?id=privacy",
        },
      ],
    },
  ];

  const s = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
      scrollView: { flex: 1 } as ViewStyle,
      header: { padding: spacing.lg } as ViewStyle,
      title: {
        fontSize: fontSize.xxl + 4,
        fontWeight: fontWeight.bold,
        color: colors.text,
      } as TextStyle,
      settingsGroup: { marginBottom: spacing.lg } as ViewStyle,
      groupTitle: {
        fontSize: 13,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        textTransform: "uppercase",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      } as TextStyle,
      groupItems: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
      } as ViewStyle,
      settingItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      } as ViewStyle,
      lastItem: { borderBottomWidth: 0 } as ViewStyle,
      settingTitle: {
        flex: 1,
        fontSize: fontSize.md,
        color: colors.text,
        marginLeft: spacing.md,
      } as TextStyle,
      signOutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: spacing.lg,
      } as ViewStyle,
      signOutText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.error,
        marginLeft: spacing.sm,
      } as TextStyle,
      version: {
        textAlign: "center",
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
      } as TextStyle,
    }),
    [colors, spacing, borderRadius, fontSize, fontWeight],
  );

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView style={s.scrollView}>
        <ScreenHeader title="Settings" />

        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={s.settingsGroup}>
            <Text style={s.groupTitle}>{group.title}</Text>
            <View style={s.groupItems}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    s.settingItem,
                    itemIndex === group.items.length - 1 && s.lastItem,
                  ]}
                  onPress={() => router.push(item.route as never)}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={colors.textSecondary}
                  />
                  <Text style={s.settingTitle}>{item.title}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={colors.error} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
