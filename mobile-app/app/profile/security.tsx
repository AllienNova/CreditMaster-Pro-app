import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";

export default function SecurityScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const securityItems = [
    {
      icon: "finger-print",
      title: "Biometric Login",
      desc: "Use Face ID or fingerprint to login",
      value: biometricEnabled,
      onToggle: setBiometricEnabled,
    },
    {
      icon: "key",
      title: "Two-Factor Authentication",
      desc: "Add extra security with 2FA",
      value: twoFactorEnabled,
      onToggle: setTwoFactorEnabled,
    },
    {
      icon: "notifications",
      title: "Login Alerts",
      desc: "Get notified of new logins",
      value: loginAlerts,
      onToggle: setLoginAlerts,
    },
  ];

  const sessions = [
    {
      device: "iPhone 14 Pro",
      location: "New York, NY",
      time: "Active now",
      current: true,
    },
    {
      device: "MacBook Pro",
      location: "New York, NY",
      time: "2 hours ago",
      current: false,
    },
    {
      device: "Windows PC",
      location: "Boston, MA",
      time: "3 days ago",
      current: false,
    },
  ];

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    Alert.alert("Success", "Password changed successfully");
    setShowPasswordModal(false);
    setPasswords({ current: "", new: "", confirm: "" });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing.md,
          paddingTop: 50,
          backgroundColor: colors.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text,
          }}
        >{`Security`}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >{`Password`}</Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: spacing.md,
          }}
          onPress={() => setShowPasswordModal(true)}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <View>
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.text,
                }}
              >{`Change Password`}</Text>
              <Text
                style={{ fontSize: fontSize.xs, color: colors.textSecondary }}
              >{`Last changed 30 days ago`}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >{`Security Options`}</Text>
        {securityItems.map((item, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                flex: 1,
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={colors.primary}
              />
              <View>
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    color: colors.text,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{ fontSize: fontSize.xs, color: colors.textSecondary }}
                >
                  {item.desc}
                </Text>
              </View>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >{`Active Sessions`}</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Sign Out All", "Sign out from all other devices?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: () => {} },
              ])
            }
          >
            <Text
              style={{
                color: colors.error,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
              }}
            >{`Sign out all`}</Text>
          </TouchableOpacity>
        </View>
        {sessions.map((session, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                backgroundColor: colors.borderLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: spacing.md,
              }}
            >
              <Ionicons
                name={
                  session.device.includes("iPhone")
                    ? "phone-portrait"
                    : "laptop"
                }
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.text,
                }}
              >
                {session.device}{" "}
                {session.current && (
                  <Text
                    style={{ color: colors.success, fontSize: fontSize.xs }}
                  >{`(This device)`}</Text>
                )}
              </Text>
              <Text
                style={{ fontSize: fontSize.xs, color: colors.textSecondary }}
              >
                {session.location} • {session.time}
              </Text>
            </View>
            {!session.current && (
              <TouchableOpacity>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >{`Security Log`}</Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <Text
            style={{ fontSize: fontSize.sm, color: colors.primary }}
          >{`View login history`}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <Text
            style={{ fontSize: fontSize.sm, color: colors.primary }}
          >{`Download account data`}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                marginBottom: spacing.md,
                textAlign: "center",
                color: colors.text,
              }}
            >{`Change Password`}</Text>
            <TextInput
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                fontSize: fontSize.md,
                color: colors.text,
              }}
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={passwords.current}
              onChangeText={(t) => setPasswords({ ...passwords, current: t })}
            />
            <TextInput
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                fontSize: fontSize.md,
                color: colors.text,
              }}
              placeholder="New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={passwords.new}
              onChangeText={(t) => setPasswords({ ...passwords, new: t })}
            />
            <TextInput
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                fontSize: fontSize.md,
                color: colors.text,
              }}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={passwords.confirm}
              onChangeText={(t) => setPasswords({ ...passwords, confirm: t })}
            />
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                marginTop: spacing.sm,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.borderLight,
                  alignItems: "center",
                }}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: fontWeight.semibold,
                  }}
                >{`Cancel`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                }}
                onPress={handleChangePassword}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: fontWeight.semibold,
                  }}
                >{`Change`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
