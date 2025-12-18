/**
 * CPFI Payment History Screen
 * Track and improve payment history
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface PaymentRecord {
  id: string;
  account: string;
  dueDate: string;
  amount: number;
  status: 'on_time' | 'late' | 'missed' | 'upcoming';
  daysLate?: number;
}

const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: '1', account: 'Chase Freedom', dueDate: '2024-01-15', amount: 150, status: 'on_time' },
  { id: '2', account: 'Capital One', dueDate: '2024-01-20', amount: 75, status: 'on_time' },
  { id: '3', account: 'Discover It', dueDate: '2024-01-25', amount: 50, status: 'late', daysLate: 5 },
  { id: '4', account: 'Auto Loan', dueDate: '2024-02-01', amount: 350, status: 'upcoming' },
  { id: '5', account: 'Mortgage', dueDate: '2024-02-05', amount: 1500, status: 'upcoming' },
  { id: '6', account: 'Student Loan', dueDate: '2024-02-10', amount: 200, status: 'upcoming' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'on_time': return '#22C55E';
    case 'late': return '#F59E0B';
    case 'missed': return '#EF4444';
    case 'upcoming': return '#3B82F6';
    default: return theme.colors.textSecondary;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'on_time': return 'checkmark-circle';
    case 'late': return 'warning';
    case 'missed': return 'close-circle';
    case 'upcoming': return 'time';
    default: return 'help-circle';
  }
};

export default function PaymentsScreen() {
  const [filter, setFilter] = useState<string>('all');
  const onTimeCount = MOCK_PAYMENTS.filter(p => p.status === 'on_time').length;
  const lateCount = MOCK_PAYMENTS.filter(p => p.status === 'late').length;
  const upcomingCount = MOCK_PAYMENTS.filter(p => p.status === 'upcoming').length;
  const onTimeRate = Math.round((onTimeCount / (onTimeCount + lateCount)) * 100) || 100;

  const filteredPayments = filter === 'all' ? MOCK_PAYMENTS : MOCK_PAYMENTS.filter(p => p.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment History</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.rateCircle}>
            <Text style={[styles.ratePercent, { color: onTimeRate >= 95 ? '#22C55E' : onTimeRate >= 80 ? '#F59E0B' : '#EF4444' }]}>{onTimeRate}%</Text>
            <Text style={styles.rateLabel}>On-Time Rate</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.statValue}>{onTimeCount}</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{lateCount}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </Card>

        {/* Impact Info */}
        <Card style={styles.impactCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.impactText}>Payment history accounts for 35% of your credit score - the largest factor!</Text>
        </Card>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', 'upcoming', 'on_time', 'late'].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f === 'on_time' ? 'On Time' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Payments List */}
        <Text style={styles.sectionTitle}>Payment Records</Text>
        {filteredPayments.map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(payment.status)}20` }]}>
                <Ionicons name={getStatusIcon(payment.status) as keyof typeof Ionicons.glyphMap} size={20} color={getStatusColor(payment.status)} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentAccount}>{payment.account}</Text>
                <Text style={styles.paymentDate}>Due: {new Date(payment.dueDate).toLocaleDateString()}</Text>
                {payment.daysLate && <Text style={styles.lateText}>{payment.daysLate} days late</Text>}
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>${payment.amount}</Text>
                <Text style={[styles.paymentStatus, { color: getStatusColor(payment.status) }]}>
                  {payment.status === 'on_time' ? 'Paid' : payment.status === 'upcoming' ? 'Due' : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for On-Time Payments</Text>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Set up autopay for minimum payments</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Create calendar reminders 5 days before due dates</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Request due date changes to align with payday</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Use bill pay apps to track all due dates</Text></View>
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
  statsCard: { alignItems: 'center', marginBottom: theme.spacing.md },
  rateCircle: { alignItems: 'center', marginBottom: theme.spacing.md },
  ratePercent: { fontSize: 48, fontWeight: '700' },
  rateLabel: { fontSize: 14, color: theme.colors.textSecondary },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  impactCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, backgroundColor: `${theme.colors.primary}10` },
  impactText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 10 },
  filterRow: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 14, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  paymentCard: { marginBottom: theme.spacing.sm },
  paymentRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  paymentInfo: { flex: 1 },
  paymentAccount: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  paymentDate: { fontSize: 13, color: theme.colors.textSecondary },
  lateText: { fontSize: 12, color: '#F59E0B', marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  paymentStatus: { fontSize: 12, fontWeight: '500' },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});

