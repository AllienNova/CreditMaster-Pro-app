import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme, colors } from '../../src/constants/theme';
import type { Dispute } from '../../src/types';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  sent: { bg: '#DBEAFE', text: '#2563EB' },
  under_review: { bg: '#FEF3C7', text: '#D97706' },
  resolved: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
};

export default function DisputesScreen() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDisputes = async () => {
    // Mock data
    setDisputes([
      { id: '1', user_id: '1', bureau: 'experian', status: 'under_review', item_type: 'Late Payment', item_description: 'Capital One late payment March 2023', dispute_reason: 'Payment was made on time', created_at: '2024-11-01T10:00:00Z', updated_at: '2024-11-15T10:00:00Z' },
      { id: '2', user_id: '1', bureau: 'equifax', status: 'resolved', item_type: 'Collection', item_description: 'ABC Collections medical debt', dispute_reason: 'Not my account', created_at: '2024-10-15T10:00:00Z', updated_at: '2024-11-10T10:00:00Z', outcome: 'removed' },
      { id: '3', user_id: '1', bureau: 'transunion', status: 'sent', item_type: 'Hard Inquiry', item_description: 'XYZ Lender unauthorized inquiry', dispute_reason: 'Unauthorized inquiry', created_at: '2024-11-10T10:00:00Z', updated_at: '2024-11-10T10:00:00Z' },
      { id: '4', user_id: '1', bureau: 'experian', status: 'draft', item_type: 'Balance Error', item_description: 'Chase incorrect balance reported', dispute_reason: 'Incorrect information', created_at: '2024-11-18T10:00:00Z', updated_at: '2024-11-18T10:00:00Z' },
    ]);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchDisputes(); setRefreshing(false); };

  const filteredDisputes = filter === 'all' ? disputes : disputes.filter(d => d.status === filter);

  const filters = ['all', 'draft', 'sent', 'under_review', 'resolved'];

  const renderDispute = ({ item }: { item: Dispute }) => (
    <TouchableOpacity style={styles.disputeCard} onPress={() => router.push(`/dispute/${item.id}` as never)}>
      <View style={styles.disputeHeader}>
        <Text style={[styles.bureau, { color: colors.bureaus[item.bureau as keyof typeof colors.bureaus] }]}>
          {item.bureau.charAt(0).toUpperCase() + item.bureau.slice(1)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status]?.bg }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status]?.text }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.itemType}>{item.item_type}</Text>
      <Text style={styles.itemDescription} numberOfLines={2}>{item.item_description}</Text>
      <View style={styles.disputeFooter}>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        {item.outcome && <Text style={styles.outcomeText}>Outcome: {item.outcome}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Disputes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/dispute/create' as never)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/dispute/templates' as never)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionText}>Templates</Text>
          <Text style={styles.quickActionSubtext}>10 proven letters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/dispute/strategies' as never)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF620' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.quickActionText}>Strategies</Text>
          <Text style={styles.quickActionSubtext}>7 advanced tactics</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { label: 'Total', value: disputes.length, color: theme.colors.primary },
          { label: 'Pending', value: disputes.filter(d => ['sent', 'under_review'].includes(d.status)).length, color: theme.colors.warning },
          { label: 'Resolved', value: disputes.filter(d => d.status === 'resolved').length, color: theme.colors.success },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Disputes List */}
      <FlatList
        data={filteredDisputes}
        renderItem={renderDispute}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No disputes found</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/dispute/wizard' as never)}>
              <Text style={styles.emptyButtonText}>Create New Dispute</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  quickActionsContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, gap: 12 },
  quickActionCard: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg },
  quickActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  quickActionSubtext: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, marginHorizontal: 4, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  filterContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, backgroundColor: theme.colors.surface },
  filterButtonActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { padding: theme.spacing.md },
  disputeCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bureau: { fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  itemType: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  itemDescription: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 },
  disputeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: theme.colors.textSecondary },
  outcomeText: { fontSize: 12, color: theme.colors.success, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  emptyButton: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.borderRadius.md },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

