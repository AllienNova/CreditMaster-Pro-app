import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";

export default function EditProfileScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    dateOfBirth: "1985-06-15",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }, 1000);
  };

  const InputField = ({
    label,
    value,
    field,
    keyboardType = "default",
    autoCapitalize = "words",
  }: any) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontSize: fontSize.xs,
          color: colors.textSecondary,
          marginBottom: 6,
          fontWeight: fontWeight.medium,
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderRadius: borderRadius.md,
          padding: spacing.md - 4,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          color: colors.text,
        }}
        value={value}
        onChangeText={(text) => setProfile({ ...profile, [field]: text })}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );

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
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text,
          }}
        >
          Edit Profile
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text
            style={[
              {
                color: colors.primary,
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
              },
              loading && { opacity: 0.5 },
            ]}
          >
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          alignItems: "center",
          padding: spacing.lg,
          backgroundColor: colors.surface,
          marginBottom: spacing.md,
        }}
      >
        <View style={{ position: "relative" as const }}>
          <Image
            source={{ uri: "https://via.placeholder.com/100" }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.border,
            }}
          />
          <TouchableOpacity
            style={{
              position: "absolute" as const,
              bottom: 0,
              right: 0,
              backgroundColor: colors.primary,
              padding: spacing.sm,
              borderRadius: borderRadius.xl,
              borderWidth: 2,
              borderColor: colors.white,
            }}
          >
            <Ionicons name="camera" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              marginTop: spacing.md - 4,
            }}
          >
            Change Photo
          </Text>
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
            marginBottom: spacing.md,
            color: colors.text,
          }}
        >
          Personal Information
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.md - 4 }}>
          <View style={{ flex: 1 }}>
            <InputField
              label="First Name"
              value={profile.firstName}
              field="firstName"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="Last Name"
              value={profile.lastName}
              field="lastName"
            />
          </View>
        </View>
        <InputField
          label="Email"
          value={profile.email}
          field="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <InputField
          label="Phone"
          value={profile.phone}
          field="phone"
          keyboardType="phone-pad"
        />
        <InputField
          label="Date of Birth"
          value={profile.dateOfBirth}
          field="dateOfBirth"
        />
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
            marginBottom: spacing.md,
            color: colors.text,
          }}
        >
          Address
        </Text>
        <InputField
          label="Street Address"
          value={profile.address}
          field="address"
        />
        <InputField label="City" value={profile.city} field="city" />
        <View style={{ flexDirection: "row", gap: spacing.md - 4 }}>
          <View style={{ flex: 1 }}>
            <InputField label="State" value={profile.state} field="state" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="ZIP Code"
              value={profile.zip}
              field="zip"
              keyboardType="numeric"
            />
          </View>
        </View>
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
            marginBottom: spacing.md,
            color: colors.text,
          }}
        >
          Identity Verification
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: withOpacity(colors.success, 0.1),
            padding: spacing.md,
            borderRadius: borderRadius.lg,
          }}
        >
          <View style={{ marginRight: spacing.md - 4 }}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={colors.success}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.success,
              }}
            >
              Identity Verified
            </Text>
            <Text
              style={{
                fontSize: fontSize.xs,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Your identity was verified on Jan 10, 2024
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.md,
          marginVertical: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <Ionicons name="trash-outline" size={20} color={colors.error} />
        <Text
          style={{
            color: colors.error,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          }}
        >
          Delete Account
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
