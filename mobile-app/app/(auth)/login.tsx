import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { lightTheme as theme } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return;
    clearError();
    const success = await login(email, password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.logo}>💳</Text>
        <Text style={styles.title}>CPFI</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Link href="/(auth)/forgot-password">
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Link>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <Link href="/(auth)/register">
          <Text style={styles.linkText}>Sign up</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  logo: { fontSize: 64, marginBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary },
  form: { flex: 1 },
  errorContainer: { backgroundColor: '#FEE2E2', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  errorText: { color: theme.colors.error, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: theme.spacing.xs },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: 16, color: theme.colors.text },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: theme.spacing.lg },
  forgotPasswordText: { color: theme.colors.primary, fontSize: 14 },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 40 },
  footerText: { color: theme.colors.textSecondary },
  linkText: { color: theme.colors.primary, fontWeight: '600' },
});

