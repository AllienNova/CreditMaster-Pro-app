import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { lightTheme as theme, getScoreColor, getScoreLabel } from '../../src/constants/theme';

interface DashboardData {
  creditScore: { score: number; change: number };
  disputes: { total: number; pending: number; resolved: number };
  recentActivity: { type: string; title: string; date: string }[];
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    // Mock data - replace with API call
    setData({
      creditScore: { score: 678, change: 12 },
      disputes: { total: 8, pending: 3, resolved: 5 },
      recentActivity: [
        { type: 'dispute', title: 'Dispute updated: Experian', date: '2 hours ago' },
        { type: 'score', title: 'Credit score increased +12', date: '1 day ago' },
        { type: 'document', title: 'Report analyzed', date: '3 days ago' },
      ],
    });
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Credit Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>Your Credit Score</Text>
          <View style={[styles.changeBadge, { backgroundColor: data?.creditScore.change && data.creditScore.change > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
            <Text style={[styles.changeText, { color: data?.creditScore.change && data.creditScore.change > 0 ? theme.colors.success : theme.colors.error }]}>
              {data?.creditScore.change && data.creditScore.change > 0 ? '+' : ''}{data?.creditScore.change || 0}
            </Text>
          </View>
        </View>
        <Text style={[styles.scoreValue, { color: getScoreColor(data?.creditScore.score || 0) }]}>{data?.creditScore.score || '---'}</Text>
        <Text style={styles.scoreCategory}>{getScoreLabel(data?.creditScore.score || 0)}</Text>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreProgress, { width: `${((data?.creditScore.score || 300) - 300) / 5.5}%`, backgroundColor: getScoreColor(data?.creditScore.score || 0) }]} />
        </View>
        <View style={styles.scoreRange}><Text style={styles.rangeText}>300</Text><Text style={styles.rangeText}>850</Text></View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
        {[
          { icon: 'add-circle', label: 'New Dispute', route: '/dispute/wizard' },
          { icon: 'cloud-upload', label: 'Upload Report', route: '/reports/upload' },
          { icon: 'calculator', label: 'Calculator', route: '/calculator' },
          { icon: 'school', label: 'Student Loans', route: '/(tabs)/loans' },
        ].map((action, i) => (
          <TouchableOpacity key={i} style={styles.actionButton} onPress={() => router.push(action.route as never)}>
            <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Disputes Overview */}
      <View style={styles.overviewCard}>
        <Text style={styles.cardTitle}>Disputes Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statValue}>{data?.disputes.total || 0}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statItem}><Text style={[styles.statValue, { color: theme.colors.warning }]}>{data?.disputes.pending || 0}</Text><Text style={styles.statLabel}>Pending</Text></View>
          <View style={styles.statItem}><Text style={[styles.statValue, { color: theme.colors.success }]}>{data?.disputes.resolved || 0}</Text><Text style={styles.statLabel}>Resolved</Text></View>
        </View>
        <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(tabs)/disputes')}>
          <Text style={styles.viewAllText}>View All Disputes</Text><Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityCard}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {data?.recentActivity.map((item, i) => (
          <View key={i} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name={item.type === 'dispute' ? 'document-text' : item.type === 'score' ? 'trending-up' : 'folder'} size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.activityContent}><Text style={styles.activityTitle}>{item.title}</Text><Text style={styles.activityDate}>{item.date}</Text></View>
          </View>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, paddingTop: 60 },
  greeting: { fontSize: 14, color: theme.colors.textSecondary },
  userName: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  scoreCard: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  scoreLabel: { fontSize: 14, color: theme.colors.textSecondary },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  changeText: { fontSize: 12, fontWeight: '600' },
  scoreValue: { fontSize: 64, fontWeight: '700', textAlign: 'center' },
  scoreCategory: { fontSize: 16, textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  scoreBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreProgress: { height: '100%', borderRadius: 4 },
  scoreRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rangeText: { fontSize: 10, color: theme.colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: theme.spacing.lg, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  actionsScroll: { paddingLeft: theme.spacing.md },
  actionButton: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginRight: theme.spacing.sm, alignItems: 'center', width: 90 },
  actionLabel: { fontSize: 12, color: theme.colors.text, marginTop: 8, textAlign: 'center' },
  overviewCard: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.md },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  viewAllText: { color: theme.colors.primary, fontWeight: '500', marginRight: 4 },
  activityCard: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  activityIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  activityDate: { fontSize: 12, color: theme.colors.textSecondary },
});

