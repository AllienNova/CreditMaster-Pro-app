/**
 * CPFI Debt Negotiation Screen
 * Negotiate with creditors
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Debt { id: string; creditor: string; balance: number; originalBalance: number; status: 'active' | 'negotiating' | 'settled'; lastContact: string; }

const DEBTS: Debt[] = [
  { id: '1', creditor: 'Collection Agency A', balance: 2500, originalBalance: 3500, status: 'negotiating', lastContact: '2024-12-01' },
  { id: '2', creditor: 'Medical Collections', balance: 1200, originalBalance: 1200, status: 'active', lastContact: '2024-11-15' },
  { id: '3', creditor: 'Credit Card Debt', balance: 0, originalBalance: 5000, status: 'settled', lastContact: '2024-10-20' },
  { id: '4', creditor: 'Utility Company', balance: 450, originalBalance: 450, status: 'active', lastContact: '2024-11-28' },
];

export default function NegotiateScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.error;
      case 'negotiating': return theme.colors.warning;
      case 'settled': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  const totalDebt = DEBTS.reduce((sum, d) => sum + d.balance, 0);
  const totalSaved = DEBTS.reduce((sum, d) => sum + (d.originalBalance - d.balance), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Text style={styles.title}>Debt Negotiation</Text>
            <Text style={styles.subtitle}>Negotiate with creditors</Text>
          </View>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.colors.error }]}>${totalDebt.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Debt</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>${totalSaved.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Saved</Text>
            </View>
          </View>
        </Card>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Negotiation Tips</Text>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={16} color={theme.colors.success} /><Text style={styles.tipText}>Always get agreements in writing</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={16} color={theme.colors.success} /><Text style={styles.tipText}>Start with 25-50% of the balance</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={16} color={theme.colors.success} /><Text style={styles.tipText}>Request "pay for delete" agreements</Text></View>
        </Card>

        {/* Debts List */}
        <View style={styles.debtsList}>
          <Text style={styles.sectionTitle}>Your Debts</Text>
          {DEBTS.map((debt) => (
            <Card key={debt.id} style={styles.debtCard}>
              <View style={styles.debtHeader}>
                <Text style={styles.debtCreditor}>{debt.creditor}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(debt.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(debt.status) }]}>{debt.status}</Text>
                </View>
              </View>
              <View style={styles.debtDetails}>
                <View style={styles.debtAmounts}>
                  <Text style={styles.debtBalance}>${debt.balance.toLocaleString()}</Text>
                  {debt.balance < debt.originalBalance && (
                    <Text style={styles.debtOriginal}>was ${debt.originalBalance.toLocaleString()}</Text>
                  )}
                </View>
                <Text style={styles.debtContact}>Last contact: {debt.lastContact}</Text>
              </View>
              {debt.status !== 'settled' && (
                <TouchableOpacity style={styles.negotiateButton}>
                  <Text style={styles.negotiateText}>{debt.status === 'negotiating' ? 'Continue Negotiation' : 'Start Negotiation'}</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  summaryCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  tipsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.md },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipText: { fontSize: 13, color: theme.colors.text, marginLeft: 8 },
  debtsList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  debtCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  debtCreditor: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  debtDetails: { marginBottom: 12 },
  debtAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  debtBalance: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  debtOriginal: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 8, textDecorationLine: 'line-through' },
  debtContact: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  negotiateButton: { backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  negotiateText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

