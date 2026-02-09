/**
 * Fynvita Dispute Detail Screen
 * Individual dispute view with timeline and actions
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  status: 'complete' | 'current' | 'pending';
}

const DISPUTE_DATA = {
  id: '1',
  creditor: 'Capital One',
  accountNumber: '****4521',
  type: 'Late Payment',
  bureau: 'Experian',
  status: 'investigating',
  submittedDate: 'Nov 15, 2024',
  expectedResponse: 'Dec 15, 2024',
  daysRemaining: 9,
  reason: 'Payment was made on time but reported as 30 days late',
  disputeMethod: 'Online',
  confirmationNumber: 'EXP-2024-1115-4521',
};

const TIMELINE: TimelineEvent[] = [
  { id: '1', date: 'Nov 15, 2024', title: 'Dispute Submitted', description: 'Your dispute was submitted to Experian', status: 'complete' },
  { id: '2', date: 'Nov 17, 2024', title: 'Received by Bureau', description: 'Experian acknowledged receipt of your dispute', status: 'complete' },
  { id: '3', date: 'Nov 20, 2024', title: 'Investigation Started', description: 'Bureau began investigating with creditor', status: 'current' },
  { id: '4', date: 'Dec 15, 2024', title: 'Response Expected', description: 'Bureau must respond within 30 days', status: 'pending' },
];

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'investigating': return '#3B82F6';
      case 'resolved': return '#22C55E';
      case 'rejected': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  const getTimelineColor = (status: string) => {
    switch (status) {
      case 'complete': return '#22C55E';
      case 'current': return '#3B82F6';
      case 'pending': return theme.colors.border;
      default: return theme.colors.border;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispute Details</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(DISPUTE_DATA.status)}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(DISPUTE_DATA.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(DISPUTE_DATA.status) }]}>{DISPUTE_DATA.status.charAt(0).toUpperCase() + DISPUTE_DATA.status.slice(1)}</Text>
            </View>
            <Text style={styles.daysRemaining}>{DISPUTE_DATA.daysRemaining} days remaining</Text>
          </View>
          <Text style={styles.creditorName}>{DISPUTE_DATA.creditor}</Text>
          <Text style={styles.accountNumber}>{DISPUTE_DATA.accountNumber}</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{DISPUTE_DATA.type}</Text></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Bureau</Text><Text style={styles.detailValue}>{DISPUTE_DATA.bureau}</Text></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Method</Text><Text style={styles.detailValue}>{DISPUTE_DATA.disputeMethod}</Text></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Confirmation</Text><Text style={styles.detailValue}>{DISPUTE_DATA.confirmationNumber}</Text></View>
          </View>
        </Card>

        {/* Reason */}
        <Text style={styles.sectionTitle}>Dispute Reason</Text>
        <Card style={styles.reasonCard}>
          <Text style={styles.reasonText}>{DISPUTE_DATA.reason}</Text>
        </Card>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        <Card style={styles.timelineCard}>
          {TIMELINE.map((event, idx) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: getTimelineColor(event.status) }]}>
                  {event.status === 'complete' && <Ionicons name="checkmark" size={12} color="#fff" />}
                  {event.status === 'current' && <View style={styles.currentDot} />}
                </View>
                {idx < TIMELINE.length - 1 && <View style={[styles.timelineLine, { backgroundColor: getTimelineColor(TIMELINE[idx + 1].status) }]} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{event.date}</Text>
                <Text style={[styles.timelineTitle, event.status === 'pending' && { color: theme.colors.textSecondary }]}>{event.title}</Text>
                <Text style={styles.timelineDescription}>{event.description}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>View Letter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Follow Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]}>
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

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
  moreButton: { padding: 4 },
  statusCard: { marginBottom: theme.spacing.lg },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  daysRemaining: { fontSize: 12, color: '#F59E0B', fontWeight: '500' },
  creditorName: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  accountNumber: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  detailItem: { width: '50%', marginBottom: theme.spacing.sm },
  detailLabel: { fontSize: 11, color: theme.colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: theme.colors.text, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  reasonCard: { marginBottom: theme.spacing.lg },
  reasonText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  timelineCard: { marginBottom: theme.spacing.lg },
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  currentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: theme.spacing.lg },
  timelineDate: { fontSize: 11, color: theme.colors.textSecondary },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  timelineDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, paddingVertical: 12, borderRadius: theme.borderRadius.md, marginHorizontal: 4 },
  actionButtonText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary, marginLeft: 6 },
  actionButtonDanger: { backgroundColor: '#FEE2E2' },
});

