import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';

const AuthScreen = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword, checkBiometricSupport, enableBiometric } = useAuthStore();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleAuth = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.success) {
          Alert.alert(
            'Account Created',
            'Please check your email to verify your account.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          );
        } else {
          Alert.alert('Sign Up Failed', result.error || 'An error occurred');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          // Check if biometric is available and offer to enable it
          const biometricSupported = await checkBiometricSupport();
          if (biometricSupported) {
            Alert.alert(
              'Enable Biometric Authentication',
              'Would you like to enable Face ID/Touch ID for faster login?',
              [
                { text: 'Not Now', style: 'cancel' },
                { 
                  text: 'Enable', 
                  onPress: async () => {
                    await enableBiometric();
                  }
                },
              ]
            );
          }
        } else {
          Alert.alert('Sign In Failed', result.error || 'An error occurred');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      Alert.alert(
        'Password Reset',
        'Check your email for password reset instructions.'
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send reset email');
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>CreditMaster Pro</Text>
              <Text style={styles.subtitle}>
                AI-Powered Credit Repair Platform
              </Text>
            </View>

            <Card style={styles.authCard}>
              <Text style={styles.authTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.authSubtitle}>
                {isSignUp 
                  ? 'Start your credit improvement journey'
                  : 'Sign in to continue your progress'
                }
              </Text>

              <View style={styles.form}>
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={
                    <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                  }
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  }
                  rightIcon={
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#94a3b8" 
                    />
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {isSignUp && (
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon={
                      <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                    }
                  />
                )}

                <Button
                  title={isSignUp ? 'Create Account' : 'Sign In'}
                  onPress={handleAuth}
                  loading={loading}
                  style={styles.authButton}
                />

                {!isSignUp && (
                  <Button
                    title="Forgot Password?"
                    onPress={handleForgotPassword}
                    variant="ghost"
                    style={styles.forgotButton}
                  />
                )}

                <View style={styles.switchAuth}>
                  <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </Text>
                  <Button
                    title={isSignUp ? 'Sign In' : 'Sign Up'}
                    onPress={() => setIsSignUp(!isSignUp)}
                    variant="ghost"
                    size="small"
                  />
                </View>
              </View>
            </Card>

            <View style={styles.features}>
              <Text style={styles.featuresTitle}>Why Choose CreditMaster Pro?</Text>
              
              <View style={styles.feature}>
                <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
                <Text style={styles.featureText}>
                  87% AI accuracy with 28 advanced strategies
                </Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="trending-up" size={24} color="#ffffff" />
                <Text style={styles.featureText}>
                  Average 55-115 point credit score improvement
                </Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="lock-closed" size={24} color="#ffffff" />
                <Text style={styles.featureText}>
                  Bank-level security with biometric protection
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  authCard: {
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  authButton: {
    marginTop: 8,
  },
  forgotButton: {
    marginTop: 8,
  },
  switchAuth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  switchText: {
    fontSize: 16,
    color: '#64748b',
  },
  features: {
    marginTop: 16,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 16,
    flex: 1,
    opacity: 0.9,
  },
});

export default AuthScreen;

