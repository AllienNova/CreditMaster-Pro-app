/**
 * CPFI Subscription Management Screen
 * View and change subscription plans
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Plan { id: string; name: string; price: number; features: string[]; popular?: boolean; current?: boolean; }

const PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, features: ['Basic credit score', 'Monthly updates', 'Limited disputes'] },
  { id: 'basic', name: 'Basic', price: 9.99, features: ['Weekly score updates', '5 disputes/month', 'Email support', 'Basic analytics'] },
  { id: 'pro', name: 'Pro', price: 29.99, features: ['Daily score updates', 'Unlimited disputes', 'AI recommendations', 'Priority support', 'Advanced analytics'], popular: true, current: true },
  { id: 'enterprise', name: 'Enterprise', price: 99.99, features: ['Real-time monitoring', 'Dedicated manager', 'Custom reports', 'API access', 'White-label options'] },
];

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('pro');

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const handleChangePlan = (planId: string) => {
    if (planId === 'pro') return;
    Alert.alert('Change Plan', `Switch to ${PLANS.find(p => p.id === planId)?.name} plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => setSelectedPlan(planId) },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Subscription</Text>
            <Text style={styles.subtitle}>Choose your plan</Text>
          </View>
        </View>

        {/* Plans */}
        {PLANS.map((plan) => (
          <TouchableOpacity key={plan.id} onPress={() => handleChangePlan(plan.id)}>
            <Card style={[styles.planCard, plan.current && styles.currentPlan, plan.popular && styles.popularPlan]}>
              {plan.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>Most Popular</Text></View>}
              {plan.current && <View style={styles.currentBadge}><Text style={styles.currentText}>Current Plan</Text></View>}
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.planPrice}>${plan.price}</Text>
                  {plan.price > 0 && <Text style={styles.planPeriod}>/mo</Text>}
                </View>
              </View>
              <View style={styles.featuresContainer}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              {!plan.current && (
                <TouchableOpacity style={[styles.selectButton, plan.popular && styles.popularButton]} onPress={() => handleChangePlan(plan.id)}>
                  <Text style={[styles.selectText, plan.popular && styles.popularSelectText]}>
                    {plan.price > 29.99 ? 'Upgrade' : plan.price < 29.99 ? 'Downgrade' : 'Select'}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  planCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg, position: 'relative' },
  currentPlan: { borderWidth: 2, borderColor: theme.colors.primary },
  popularPlan: { borderWidth: 2, borderColor: theme.colors.secondary },
  popularBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: theme.colors.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  currentBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  currentText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  planPeriod: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 2 },
  featuresContainer: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 13, color: theme.colors.text, marginLeft: 8 },
  selectButton: { backgroundColor: theme.colors.surface, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  popularButton: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  selectText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  popularSelectText: { color: '#fff' },
  cancelButton: { alignItems: 'center', padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
  cancelText: { fontSize: 14, color: theme.colors.error },
});

