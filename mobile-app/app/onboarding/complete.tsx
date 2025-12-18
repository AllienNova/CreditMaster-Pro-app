/**
 * CPFI Onboarding Complete Screen
 * Success screen with next steps
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import LottieView from 'lottie-react-native';

const NEXT_STEPS = [
  { icon: 'analytics', title: 'View Your Credit Score', description: 'See your scores from all 3 bureaus', route: '/(tabs)/credit' },
  { icon: 'document-text', title: 'Start a Dispute', description: 'Challenge inaccurate items', route: '/disputes/new' },
  { icon: 'build', title: 'Explore Credit Builder', description: 'Tools to improve your score', route: '/credit-builder' },
  { icon: 'shield-checkmark', title: 'Set Up Monitoring', description: 'Get alerts for changes', route: '/monitoring' },
];

export default function OnboardingCompleteScreen() {
  const { user, completeOnboarding } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Mark onboarding as complete
    completeOnboarding();

    // Animate entrance
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToDashboard = () => {
    router.replace('/(tabs)');
  };

  const handleNextStep = (route: string) => {
    router.replace(route as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={64} color="#fff" />
          </View>
        </Animated.View>

        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Welcome to CPFI, {user?.firstName || 'there'}! Your credit journey starts now.
        </Text>

        {/* Progress Bar Complete */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Setup Complete</Text>
        </View>

        {/* Next Steps */}
        <Animated.View style={[styles.nextStepsContainer, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>What's Next?</Text>
          {NEXT_STEPS.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={styles.stepCard}
              onPress={() => handleNextStep(step.route)}
              activeOpacity={0.7}
            >
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
  successContainer: { alignItems: 'center', marginBottom: theme.spacing.lg },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  progressContainer: { marginBottom: theme.spacing.xl },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#22C55E', borderRadius: 2 },
  progressText: { fontSize: 12, color: '#22C55E', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  nextStepsContainer: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  stepIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  stepDescription: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  footer: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  dashboardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.lg },
  dashboardButtonText: { fontSize: 18, fontWeight: '600', color: '#fff', marginRight: 8 },
});

