import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { useTheme } from "../../src/hooks/useTheme";

export default function LoginScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, withOpacity } =
    useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }
    setFormError(null);
    clearError();
    const success = await login(email, password);
    if (success) {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ alignItems: "center", marginTop: 60, marginBottom: 40 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: withOpacity(colors.primary, 0.1),
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name="card-outline" size={40} color={colors.primary} />
        </View>
        <Text
          style={{
            fontSize: fontSize.xxl + 4,
            fontWeight: fontWeight.bold,
            color: colors.text,
            marginBottom: spacing.xs,
          }}
        >
          Fynvita
        </Text>
        <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>
          Sign in to your account
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {(formError || error) && (
          <View
            style={{
              backgroundColor: withOpacity(colors.error, 0.1),
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ color: colors.error, textAlign: "center" }}>
              {formError || error}
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
            Email
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              fontSize: fontSize.md,
              color: colors.text,
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (formError) setFormError(null);
            }}
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
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              fontSize: fontSize.md,
              color: colors.text,
            }}
            placeholder="Enter your password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (formError) setFormError(null);
            }}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={{ alignSelf: "flex-end", marginBottom: spacing.lg }}
        >
          <Link href="/(auth)/forgot-password">
            <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>
              Forgot password?
            </Text>
          </Link>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            alignItems: "center",
          }}
          onPress={handleLogin}
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
              Sign In
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          paddingBottom: 40,
        }}
      >
        <Text style={{ color: colors.textSecondary }}>
          Don&apos;t have an account?{" "}
        </Text>
        <Link href="/(auth)/register">
          <Text
            style={{ color: colors.primary, fontWeight: fontWeight.semibold }}
          >
            Sign up
          </Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
