/**
 * CPFI Billing & Subscription Settings Screen
 * Manage subscription and payment methods
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiry?: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', type: 'card', last4: '4242', brand: 'Visa', expiry: '12/25', isDefault: true },
  { id: '2', type: 'card', last4: '5555', brand: 'Mastercard', expiry: '08/26', isDefault: false },
];

const INVOICES: Invoice[] = [
  { id: '1', date: 'Dec 1, 2024', amount: 29.00, status: 'paid' },
  { id: '2', date: 'Nov 1, 2024', amount: 29.00, status: 'paid' },
  { id: '3', date: 'Oct 1, 2024', amount: 29.00, status: 'paid' },
];

const PLANS = [
  { id: 'basic', name: 'Basic', price: 29, features: ['Credit Score Monitoring', 'Basic Dispute Tools', 'Email Support'] },
  { id: 'premium', name: 'Premium', price: 79, features: ['All Basic Features', 'AI Dispute Generation', 'Identity Protection', 'Priority Support'] },
  { id: 'enterprise', name: 'Enterprise', price: 199, features: ['All Premium Features', 'Dedicated Account Manager', 'Custom Integrations', 'White-Label Options'] },
];

export default function BillingSettingsScreen() {
  const [currentPlan] = useState('basic');
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(paymentMethods.map(m => ({ ...m, isDefault: m.id === methodId })));
  };

  const handleRemoveMethod = (methodId: string) => {
    Alert.alert('Remove Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPaymentMethods(paymentMethods.filter(m => m.id !== methodId)) },
    ]);
  };

  const handleUpgrade = (planId: string) => {
    Alert.alert('Upgrade Plan', `Upgrade to ${PLANS.find(p => p.id === planId)?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upgrade', onPress: () => {} },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Billing</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Plan */}
        <Text style={styles.sectionTitle}>Current Plan</Text>
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Basic Plan</Text>
              <Text style={styles.planPrice}>$29<Text style={styles.planPeriod}>/month</Text></Text>
            </View>
            <View style={styles.planBadge}><Text style={styles.planBadgeText}>Active</Text></View>
          </View>
          <Text style={styles.renewalText}>Renews on January 1, 2025</Text>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        </Card>

        {/* Upgrade Options */}
        <Text style={styles.sectionTitle}>Upgrade</Text>
        {PLANS.filter(p => p.id !== currentPlan).map((plan) => (
          <Card key={plan.id} style={styles.upgradeCard}>
            <View style={styles.upgradeHeader}>
              <Text style={styles.upgradeName}>{plan.name}</Text>
              <Text style={styles.upgradePrice}>${plan.price}/mo</Text>
            </View>
            <View style={styles.featuresList}>
              {plan.features.slice(0, 3).map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.upgradeButton} onPress={() => handleUpgrade(plan.id)}>
              <Text style={styles.upgradeButtonText}>Upgrade to {plan.name}</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        {paymentMethods.map((method) => (
          <Card key={method.id} style={styles.methodCard}>
            <View style={styles.methodRow}>
              <View style={styles.methodIcon}>
                <Ionicons name="card" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.brand} •••• {method.last4}</Text>
                <Text style={styles.methodExpiry}>Expires {method.expiry}</Text>
              </View>
              {method.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
            </View>
            <View style={styles.methodActions}>
              {!method.isDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(method.id)}>
                  <Text style={styles.actionText}>Set as Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleRemoveMethod(method.id)}>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>

        {/* Billing History */}
        <Text style={styles.sectionTitle}>Billing History</Text>
        <Card style={styles.historyCard}>
          {INVOICES.map((invoice, index) => (
            <View key={invoice.id}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
                <Text style={styles.invoiceAmount}>${invoice.amount.toFixed(2)}</Text>
                <View style={[styles.invoiceStatus, { backgroundColor: '#22C55E15' }]}>
                  <Text style={[styles.invoiceStatusText, { color: '#22C55E' }]}>Paid</Text>
                </View>
              </View>
              {index < INVOICES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  planCard: { marginBottom: theme.spacing.md },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  planPrice: { fontSize: 28, fontWeight: '700', color: theme.colors.primary, marginTop: 4 },
  planPeriod: { fontSize: 14, fontWeight: '400', color: theme.colors.textSecondary },
  planBadge: { backgroundColor: '#22C55E15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planBadgeText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
  renewalText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  cancelButton: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelButtonText: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  upgradeCard: { marginBottom: theme.spacing.sm },
  upgradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  upgradeName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  upgradePrice: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
  featuresList: { marginBottom: theme.spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  featureText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  upgradeButton: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  upgradeButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  methodCard: { marginBottom: theme.spacing.sm },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  methodExpiry: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  defaultBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  defaultText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  methodActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 16 },
  actionText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed', borderRadius: 12, marginTop: theme.spacing.sm },
  addButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginLeft: 8 },
  historyCard: {},
  invoiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  invoiceDate: { flex: 1, fontSize: 14, color: theme.colors.text },
  invoiceAmount: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginRight: 12 },
  invoiceStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  invoiceStatusText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border },
});

