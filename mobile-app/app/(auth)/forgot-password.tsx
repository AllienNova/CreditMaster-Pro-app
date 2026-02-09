import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../../src/services/supabase';
import { useTheme } from '../../src/hooks/useTheme';

export default function ForgotPasswordScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, iconSize, withOpacity } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: withOpacity(colors.primary, 0.08),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}>
            <Ionicons name="mail" size={48} color={colors.primary} />
          </View>
          <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md }}>
            Check Your Email
          </Text>
          <Text style={{
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}>
            We&apos;ve sent a password reset link to {email}. Please check your inbox and follow the instructions.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              alignItems: 'center',
              width: '100%',
            }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={{ color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={{ marginTop: 40, marginBottom: spacing.md }} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={iconSize.lg} color={colors.text} />
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: withOpacity(colors.primary, 0.08),
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>
        <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm }}>
          Forgot Password?
        </Text>
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          No worries! Enter your email address and we&apos;ll send you a link to reset your password.
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {error && (
          <View style={{
            backgroundColor: withOpacity(colors.error, 0.1),
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.md,
          }}>
            <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.xs }}>
            Email Address
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
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            alignItems: 'center',
          }}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{ color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
              Send Reset Link
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 40 }}>
        <Text style={{ color: colors.textSecondary }}>Remember your password? </Text>
        <Link href="/(auth)/login">
          <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>Sign in</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
