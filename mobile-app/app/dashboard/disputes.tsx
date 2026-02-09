/**
 * Fynvita Disputes Dashboard Screen
 * Dispute tracking and management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Dispute {
  id: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  status: 'draft' | 'sent' | 'under_review' | 'resolved' | 'rejected';
  itemType: string;
  itemDescription: string;
  createdAt: string;
  outcome: string | null;
}

const MOCK_DISPUTES: Dispute[] = [
  { id: '1', bureau: 'experian', status: 'resolved', itemType: 'Late Payment', itemDescription: 'Capital One late payment March 2023', createdAt: '2024-10-15T10:00:00Z', outcome: 'removed' },
  { id: '2', bureau: 'equifax', status: 'under_review', itemType: 'Collection', itemDescription: 'Medical collection ABC Collections', createdAt: '2024-11-01T09:15:00Z', outcome: null },
  { id: '3', bureau: 'transunion', status: 'sent', itemType: 'Inquiry', itemDescription: 'Unauthorized hard inquiry XYZ Lender', createdAt: '2024-11-10T16:45:00Z', outcome: null },
  { id: '4', bureau: 'experian', status: 'draft', itemType: 'Balance Error', itemDescription: 'Incorrect balance on Chase card', createdAt: '2024-11-15T11:20:00Z', outcome: null },
];

const FILTERS = ['all', 'draft', 'sent', 'under_review', 'resolved'] as const;

export default function DisputesScreen() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDisputes(MOCK_DISPUTES);
      setLoading(false);
    }, 500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  };

  const filteredDisputes = disputes.filter(d => filter === 'all' || d.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return theme.colors.success;
      case 'sent': case 'under_review': return theme.colors.primary;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getBureauColor = (bureau: string) => {
    switch (bureau) {
      case 'experian': return '#1E40AF';
      case 'equifax': return '#DC2626';
      case 'transunion': return '#059669';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return 'checkmark-circle';
      case 'sent': return 'send';
      case 'under_review': return 'time';
      case 'rejected': return 'close-circle';
      default: return 'document-text';
    }
  };

  const getFilterCount = (filterKey: string) => {
    return filterKey === 'all' ? disputes.length : disputes.filter(d => d.status === filterKey).length;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Disputes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/credit-builder')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filterKey) => (
            <TouchableOpacity
              key={filterKey}
              style={[styles.filterPill, filter === filterKey && styles.filterPillActive]}
              onPress={() => setFilter(filterKey)}
            >
              <Text style={[styles.filterCount, filter === filterKey && styles.filterCountActive]}>
                {getFilterCount(filterKey)}
              </Text>
              <Text style={[styles.filterLabel, filter === filterKey && styles.filterLabelActive]}>
                {filterKey === 'all' ? 'Total' : filterKey.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Disputes List */}
        <View style={styles.disputesList}>
          {filteredDisputes.map((dispute) => (
            <Card key={dispute.id} style={styles.disputeCard}>
              <View style={styles.disputeHeader}>
                <View style={styles.bureauBadge}>
                  <Text style={[styles.bureauText, { color: getBureauColor(dispute.bureau) }]}>
                    {dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + '20' }]}>
                  <Ionicons
                    name={getStatusIcon(dispute.status) as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={getStatusColor(dispute.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
                    {dispute.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemType}>{dispute.itemType}</Text>
              <Text style={styles.itemDescription}>{dispute.itemDescription}</Text>

              <View style={styles.disputeFooter}>
                <Text style={styles.dateText}>
                  Created: {new Date(dispute.createdAt).toLocaleDateString()}
                </Text>
                {dispute.outcome && (
                  <View style={styles.outcomeBadge}>
                    <Ionicons name="checkmark" size={12} color={theme.colors.success} />
                    <Text style={styles.outcomeText}>{dispute.outcome}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </Card>
          ))}

          {filteredDisputes.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No disputes found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/credit-builder')}
              >
                <Text style={styles.emptyButtonText}>Start a New Dispute</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, paddingBottom: 0 },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },

  filtersContainer: { marginTop: theme.spacing.md },
  filtersContent: { paddingHorizontal: theme.spacing.lg, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surface, borderRadius: 12, alignItems: 'center', minWidth: 70 },
  filterPillActive: { backgroundColor: theme.colors.primary },
  filterCount: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  filterCountActive: { color: '#fff' },
  filterLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  filterLabelActive: { color: 'rgba(255,255,255,0.8)' },

  disputesList: { padding: theme.spacing.lg },
  disputeCard: { marginBottom: theme.spacing.md },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  bureauBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.colors.surface, borderRadius: 8 },
  bureauText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  itemType: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  itemDescription: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  disputeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateText: { fontSize: 12, color: theme.colors.textSecondary },
  outcomeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outcomeText: { fontSize: 12, fontWeight: '600', color: theme.colors.success, textTransform: 'capitalize' },
  detailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  detailsButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginRight: 4 },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 16, marginBottom: 20 },
  emptyButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#fff', fontWeight: '600' },
});
