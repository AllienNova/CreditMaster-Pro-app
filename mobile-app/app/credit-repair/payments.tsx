/**
 * CPFI Payment History Screen
 * Track payment patterns
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Payment { id: string; account: string; amount: number; dueDate: string; status: 'paid' | 'upcoming' | 'late' | 'missed'; }

const PAYMENTS: Payment[] = [
  { id: '1', account: 'Chase Credit Card', amount: 250, dueDate: '2024-12-15', status: 'upcoming' },
  { id: '2', account: 'Capital One', amount: 150, dueDate: '2024-12-10', status: 'upcoming' },
  { id: '3', account: 'Discover', amount: 100, dueDate: '2024-12-01', status: 'paid' },
  { id: '4', account: 'Bank of America', amount: 200, dueDate: '2024-11-25', status: 'paid' },
  { id: '5', account: 'Citi', amount: 175, dueDate: '2024-11-20', status: 'late' },
  { id: '6', account: 'Wells Fargo', amount: 300, dueDate: '2024-11-15', status: 'paid' },
];

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return theme.colors.success;
      case 'upcoming': return theme.colors.primary;
      case 'late': return theme.colors.warning;
      case 'missed': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'upcoming': return 'time';
      case 'late': return 'alert-circle';
      case 'missed': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const onTimeRate = Math.round((PAYMENTS.filter(p => p.status === 'paid').length / PAYMENTS.filter(p => p.status !== 'upcoming').length) * 100);

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
            <Text style={styles.title}>Payment History</Text>
            <Text style={styles.subtitle}>Track your payments</Text>
          </View>
        </View>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>{onTimeRate}%</Text>
              <Text style={styles.statLabel}>On-Time Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PAYMENTS.filter(p => p.status === 'upcoming').length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>{PAYMENTS.filter(p => p.status === 'late').length}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
          </View>
        </Card>

        {/* Calendar Hint */}
        <Card style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.calendarTitle}> Payment Calendar</Text>
          </View>
          <Text style={styles.calendarText}>Next payment due in 3 days: Chase Credit Card - $250</Text>
          <TouchableOpacity style={styles.calendarButton}>
            <Text style={styles.calendarButtonText}>Set Reminders</Text>
          </TouchableOpacity>
        </Card>

        {/* Payments List */}
        <View style={styles.paymentsList}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {PAYMENTS.map((payment) => (
            <Card key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(payment.status)}15` }]}>
                  <Ionicons name={getStatusIcon(payment.status) as keyof typeof Ionicons.glyphMap} size={20} color={getStatusColor(payment.status)} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAccount}>{payment.account}</Text>
                  <Text style={styles.paymentDate}>Due: {payment.dueDate}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>${payment.amount}</Text>
                  <Text style={[styles.paymentStatus, { color: getStatusColor(payment.status) }]}>{payment.status}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  statsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  calendarCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.md },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  calendarTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  calendarText: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  calendarButton: { backgroundColor: theme.colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  calendarButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  paymentsList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  paymentCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  paymentRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { flex: 1, marginLeft: 12 },
  paymentAccount: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  paymentDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  paymentStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
});

