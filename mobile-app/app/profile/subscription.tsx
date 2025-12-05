import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: ['Basic credit monitoring', '1 dispute per month', 'Limited AI assistance', 'Email support'],
    current: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    period: 'month',
    features: ['3-bureau monitoring', '5 disputes per month', 'AI dispute letters', 'Priority email support', 'Score simulator'],
    current: true,
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79,
    period: 'month',
    features: ['Real-time monitoring', 'Unlimited disputes', 'Advanced AI tools', 'Phone support', 'Score simulator', 'Identity protection', 'Student loan tools'],
    current: false,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: 'month',
    features: ['Everything in Premium', 'Dedicated account manager', 'Custom integrations', 'API access', 'White-label options', 'SLA guarantee'],
    current: false,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('basic');

  const handleUpgrade = (planId: string) => {
    if (planId === 'basic') return; // Already on this plan
    Alert.alert(
      'Upgrade Plan',
      `Upgrade to ${PLANS.find(p => p.id === planId)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => console.log('Upgrade to:', planId) },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => console.log('Cancel subscription') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Active</Text></View>
          </View>
          <Text style={styles.currentPlanName}>Basic</Text>
          <Text style={styles.currentPlanPrice}>$29<Text style={styles.currentPlanPeriod}>/month</Text></Text>
          <Text style={styles.renewalText}>Renews on January 15, 2025</Text>
        </View>

        <Text style={styles.sectionTitle}>Available Plans</Text>

        {PLANS.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, plan.current && styles.planCardCurrent, plan.popular && styles.planCardPopular]}
            onPress={() => setSelectedPlan(plan.id)}
            activeOpacity={0.8}
          >
            {plan.popular && (
              <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>Most Popular</Text></View>
            )}
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  {plan.price > 0 && <Text style={styles.planPeriod}>/{plan.period}</Text>}
                </Text>
              </View>
              {plan.current ? (
                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>
              ) : (
                <TouchableOpacity
                  style={[styles.selectButton, plan.popular && styles.selectButtonPopular]}
                  onPress={() => handleUpgrade(plan.id)}
                >
                  <Text style={[styles.selectButtonText, plan.popular && styles.selectButtonTextPopular]}>
                    {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={plan.popular ? '#FF9800' : lightTheme.colors.primary} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.billingSection}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <TouchableOpacity style={styles.billingItem}>
            <Ionicons name="card-outline" size={24} color={lightTheme.colors.primary} />
            <View style={styles.billingInfo}>
              <Text style={styles.billingLabel}>Payment Method</Text>
              <Text style={styles.billingValue}>•••• 4242</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={lightTheme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.billingItem}>
            <Ionicons name="receipt-outline" size={24} color={lightTheme.colors.primary} />
            <View style={styles.billingInfo}>
              <Text style={styles.billingLabel}>Billing History</Text>
              <Text style={styles.billingValue}>View invoices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={lightTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  content: { flex: 1, padding: 16 },
  currentPlanCard: { backgroundColor: lightTheme.colors.primary, borderRadius: 16, padding: 20, marginBottom: 24 },
  currentPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  currentPlanLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  currentPlanName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  currentPlanPrice: { fontSize: 20, color: '#FFFFFF', marginTop: 4 },
  currentPlanPeriod: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  renewalText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: lightTheme.colors.text, marginBottom: 12 },
  planCard: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  planCardCurrent: { borderColor: lightTheme.colors.primary },
  planCardPopular: { borderColor: '#FF9800' },
  popularBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: '700', color: lightTheme.colors.text },
  planPrice: { fontSize: 24, fontWeight: '700', color: lightTheme.colors.primary },
  planPeriod: { fontSize: 14, fontWeight: '400', color: lightTheme.colors.textSecondary },
  currentBadge: { backgroundColor: lightTheme.colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  currentBadgeText: { fontSize: 14, color: lightTheme.colors.primary, fontWeight: '600' },
  selectButton: { backgroundColor: lightTheme.colors.primary + '15', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  selectButtonPopular: { backgroundColor: '#FF9800' },
  selectButtonText: { fontSize: 14, color: lightTheme.colors.primary, fontWeight: '600' },
  selectButtonTextPopular: { color: '#FFFFFF' },
  featuresList: { marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  featureText: { fontSize: 14, color: lightTheme.colors.text },
  billingSection: { marginTop: 24 },
  billingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: lightTheme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 },
  billingInfo: { flex: 1, marginLeft: 12 },
  billingLabel: { fontSize: 16, color: lightTheme.colors.text },
  billingValue: { fontSize: 14, color: lightTheme.colors.textSecondary },
  cancelButton: { alignItems: 'center', padding: 16, marginTop: 24, marginBottom: 32 },
  cancelButtonText: { fontSize: 16, color: '#EF4444' },
});

