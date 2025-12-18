/**
 * CPFI Dispute Tracking Dashboard
 * Status timeline, bureau responses, follow-up reminders
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Dispute {
  id: string;
  creditor: string;
  type: string;
  bureau: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  submittedDate: string;
  expectedResponse: string;
  daysRemaining: number;
  result?: 'deleted' | 'updated' | 'verified' | 'pending';
}

const DISPUTES: Dispute[] = [
  { id: '1', creditor: 'Capital One', type: 'Late Payment', bureau: 'Experian', status: 'investigating', submittedDate: 'Nov 15, 2024', expectedResponse: 'Dec 15, 2024', daysRemaining: 9 },
  { id: '2', creditor: 'Midland Credit', type: 'Collection Account', bureau: 'All Three', status: 'pending', submittedDate: 'Nov 28, 2024', expectedResponse: 'Dec 28, 2024', daysRemaining: 22 },
  { id: '3', creditor: 'Chase Bank', type: 'Account Error', bureau: 'TransUnion', status: 'resolved', submittedDate: 'Oct 20, 2024', expectedResponse: 'Nov 20, 2024', daysRemaining: 0, result: 'deleted' },
  { id: '4', creditor: 'Discover', type: 'Hard Inquiry', bureau: 'Equifax', status: 'rejected', submittedDate: 'Oct 5, 2024', expectedResponse: 'Nov 5, 2024', daysRemaining: 0, result: 'verified' },
];

const STATS = { total: 12, pending: 2, resolved: 8, successRate: 75 };

export default function DisputesScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const filters = ['all', 'pending', 'investigating', 'resolved', 'rejected'];
  
  const filteredDisputes = selectedFilter === 'all' ? DISPUTES : DISPUTES.filter(d => d.status === selectedFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'investigating': return '#3B82F6';
      case 'resolved': return '#22C55E';
      case 'rejected': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return null;
    const colors: Record<string, { bg: string; text: string }> = {
      deleted: { bg: '#DCFCE7', text: '#22C55E' },
      updated: { bg: '#DBEAFE', text: '#3B82F6' },
      verified: { bg: '#FEE2E2', text: '#EF4444' },
      pending: { bg: '#FEF3C7', text: '#F59E0B' },
    };
    return colors[result] || colors.pending;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispute Center</Text>
          <TouchableOpacity onPress={() => router.push('/disputes/new')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{STATS.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{STATS.pending}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>{STATS.resolved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{STATS.successRate}%</Text>
              <Text style={styles.statLabel}>Success</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/disputes/new')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.quickActionText}>AI Dispute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/disputes/analytics')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="analytics" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity key={filter} style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]} onPress={() => setSelectedFilter(filter)}>
              <Text style={[styles.filterChipText, selectedFilter === filter && styles.filterChipTextActive]}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Disputes List */}
        <Text style={styles.sectionTitle}>{filteredDisputes.length} Disputes</Text>
        {filteredDisputes.map((dispute) => (
          <TouchableOpacity key={dispute.id} onPress={() => router.push(`/disputes/${dispute.id}`)}>
            <Card style={styles.disputeCard}>
              <View style={styles.disputeHeader}>
                <View style={styles.disputeInfo}>
                  <Text style={styles.disputeCreditor}>{dispute.creditor}</Text>
                  <Text style={styles.disputeType}>{dispute.type} • {dispute.bureau}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(dispute.status)}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(dispute.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>{dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}</Text>
                </View>
              </View>
              
              {/* Timeline */}
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.timelineText}>Submitted: {dispute.submittedDate}</Text>
                </View>
                {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
                  <View style={styles.timelineItem}>
                    <Ionicons name="time-outline" size={14} color={dispute.daysRemaining <= 7 ? '#F59E0B' : theme.colors.textSecondary} />
                    <Text style={[styles.timelineText, dispute.daysRemaining <= 7 && { color: '#F59E0B' }]}>{dispute.daysRemaining} days remaining</Text>
                  </View>
                )}
                {dispute.result && (
                  <View style={[styles.resultBadge, { backgroundColor: getResultBadge(dispute.result)?.bg }]}>
                    <Text style={[styles.resultText, { color: getResultBadge(dispute.result)?.text }]}>{dispute.result.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

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
  addButton: { padding: 4 },
  statsCard: { marginBottom: theme.spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  quickActions: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  quickAction: { flex: 1, alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  disputeCard: { marginBottom: theme.spacing.sm },
  disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  disputeInfo: { flex: 1 },
  disputeCreditor: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  disputeType: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  timeline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  timelineText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  resultText: { fontSize: 10, fontWeight: '700' },
});

