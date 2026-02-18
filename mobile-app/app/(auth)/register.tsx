import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useTheme } from "../../src/hooks/useTheme";

export default function RegisterScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, withOpacity } =
    useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    if (!name || !email || !password) {
      setLocalError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    const success = await register(email, password, name);
    if (success) {
      router.replace("/(tabs)");
    }
  };

  const displayError = localError || error;

  const inputStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginTop: 40, marginBottom: 30 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: withOpacity(colors.primary, 0.1),
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.sm,
            }}
          >
            <Ionicons
              name="person-add-outline"
              size={36}
              color={colors.primary}
            />
          </View>
          <Text
            style={{
              fontSize: fontSize.xxl,
              fontWeight: fontWeight.bold,
              color: colors.text,
              marginBottom: spacing.xs,
            }}
          >
            Create Account
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
            Start your credit repair journey
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {displayError && (
            <View
              style={{
                backgroundColor: withOpacity(colors.error, 0.1),
                padding: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: colors.error, textAlign: "center" }}>
                {displayError}
              </Text>
            </View>
          )}

          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: colors.text,
                marginBottom: spacing.xs,
              }}
            >
              Full Name
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="John Doe"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: colors.text,
                marginBottom: spacing.xs,
              }}
            >
              Email
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: colors.text,
                marginBottom: spacing.xs,
              }}
            >
              Password
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: colors.text,
                marginBottom: spacing.xs,
              }}
            >
              Confirm Password
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="Confirm your password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              alignItems: "center",
              marginTop: spacing.md,
            }}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text
                style={{
                  color: colors.white,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              fontSize: fontSize.xs,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.md,
            }}
          >
            By creating an account, you agree to our{" "}
            <Text
              style={{ color: colors.primary, fontWeight: fontWeight.semibold }}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={{ color: colors.primary, fontWeight: fontWeight.semibold }}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            paddingVertical: 20,
          }}
        >
          <Text style={{ color: colors.textSecondary }}>
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login">
            <Text
              style={{ color: colors.primary, fontWeight: fontWeight.semibold }}
            >
              Sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
