/**
 * Fynvita Admin Subscriptions Management Screen
 * Manage user subscriptions and billing
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Subscription { id: string; user: string; plan: 'free' | 'basic' | 'pro' | 'enterprise'; status: 'active' | 'cancelled' | 'past_due'; amount: number; nextBilling: string; }

const SUBSCRIPTIONS: Subscription[] = [
  { id: 'SUB-001', user: 'john@example.com', plan: 'pro', status: 'active', amount: 29.99, nextBilling: '2024-12-15' },
  { id: 'SUB-002', user: 'sarah@example.com', plan: 'enterprise', status: 'active', amount: 99.99, nextBilling: '2024-12-20' },
  { id: 'SUB-003', user: 'mike@example.com', plan: 'basic', status: 'past_due', amount: 9.99, nextBilling: '2024-12-01' },
  { id: 'SUB-004', user: 'emily@example.com', plan: 'pro', status: 'cancelled', amount: 29.99, nextBilling: '-' },
  { id: 'SUB-005', user: 'david@example.com', plan: 'free', status: 'active', amount: 0, nextBilling: '-' },
  { id: 'SUB-006', user: 'lisa@example.com', plan: 'pro', status: 'active', amount: 29.99, nextBilling: '2024-12-18' },
];

export default function AdminSubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return theme.colors.textSecondary;
      case 'basic': return theme.colors.primary;
      case 'pro': return theme.colors.secondary;
      case 'enterprise': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      case 'past_due': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredSubs = planFilter ? SUBSCRIPTIONS.filter(s => s.plan === planFilter) : SUBSCRIPTIONS;
  const totalMRR = SUBSCRIPTIONS.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
  const activeCount = SUBSCRIPTIONS.filter(s => s.status === 'active').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
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
            <Text style={styles.title}>Subscriptions</Text>
            <Text style={styles.subtitle}>Manage billing & plans</Text>
          </View>
        </View>

        {/* Revenue Stats */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.success}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>${totalMRR.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Subs</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.warning}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>{SUBSCRIPTIONS.filter(s => s.status === 'past_due').length}</Text>
            <Text style={styles.statLabel}>Past Due</Text>
          </Card>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'free', 'basic', 'pro', 'enterprise'].map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[styles.filterChip, (planFilter === plan || (plan === 'All' && !planFilter)) && styles.filterChipActive]}
              onPress={() => setPlanFilter(plan === 'All' ? null : plan)}
            >
              <Text style={[styles.filterText, (planFilter === plan || (plan === 'All' && !planFilter)) && styles.filterTextActive]}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subscriptions List */}
        <View style={styles.subsList}>
          {filteredSubs.map((sub) => (
            <Card key={sub.id} style={styles.subCard}>
              <View style={styles.subHeader}>
                <View style={[styles.planBadge, { backgroundColor: `${getPlanColor(sub.plan)}15` }]}>
                  <Text style={[styles.planText, { color: getPlanColor(sub.plan) }]}>{sub.plan.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sub.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>{sub.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.subUser}>{sub.user}</Text>
              <View style={styles.subDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>${sub.amount.toFixed(2)}/mo</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Next Billing</Text>
                  <Text style={styles.detailValue}>{sub.nextBilling}</Text>
                </View>
              </View>
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
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  subsList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  subCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  subHeader: { flexDirection: 'row', marginBottom: 8 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  planText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  subUser: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  subDetails: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' },
  detailItem: {},
  detailLabel: { fontSize: 11, color: theme.colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
});

