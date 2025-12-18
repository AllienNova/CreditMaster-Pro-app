/**
 * CPFI Onboarding Profile Setup Screen
 * Collect user profile information
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';

export default function OnboardingProfileScreen() {
  const { user, updateProfile } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ firstName, lastName, phone, dateOfBirth });
      router.push('/onboarding/goals');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/goals');
  };

  const progress = 1 / 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 4</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Let's set up your profile</Text>
            <Text style={styles.subtitle}>This helps us personalize your experience</Text>

            <Card style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </Card>

            <Text style={styles.privacyNote}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.textSecondary} /> Your information is encrypted and secure
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, (!firstName.trim() || !lastName.trim()) && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!firstName.trim() || !lastName.trim() || isLoading}
          >
            <Text style={styles.continueButtonText}>{isLoading ? 'Saving...' : 'Continue'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { padding: 4 },
  skipText: { fontSize: 16, color: theme.colors.primary },
  progressContainer: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
  content: { paddingHorizontal: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  formCard: { marginBottom: theme.spacing.md },
  inputGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: theme.colors.text },
  privacyNote: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  footer: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.lg },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { fontSize: 18, fontWeight: '600', color: '#fff', marginRight: 8 },
});

