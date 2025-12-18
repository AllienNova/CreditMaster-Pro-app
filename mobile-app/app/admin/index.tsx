/**
 * CPFI Admin Dashboard Screen
 * Overview of key metrics for admin users
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
}

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const METRICS: MetricCard[] = [
  { id: '1', title: 'Total Users', value: '12,458', change: '+12%', changeType: 'positive', icon: 'people' },
  { id: '2', title: 'Active Subscriptions', value: '8,234', change: '+8%', changeType: 'positive', icon: 'card' },
  { id: '3', title: 'Monthly Revenue', value: '$245,890', change: '+15%', changeType: 'positive', icon: 'cash' },
  { id: '4', title: 'Dispute Success Rate', value: '78%', change: '+3%', changeType: 'positive', icon: 'checkmark-circle' },
  { id: '5', title: 'Avg Score Improvement', value: '+47 pts', change: '+5 pts', changeType: 'positive', icon: 'trending-up' },
  { id: '6', title: 'Support Tickets', value: '23', change: '-15%', changeType: 'positive', icon: 'help-circle' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { id: '1', title: 'View Users', icon: 'people', route: '/admin/users' },
  { id: '2', title: 'View Metrics', icon: 'stats-chart', route: '/admin/metrics' },
  { id: '3', title: 'Settings', icon: 'settings', route: '/settings' },
];

export default function AdminDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'positive': return '#22C55E';
      case 'negative': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity><Ionicons name="notifications" size={24} color={theme.colors.text} /></TouchableOpacity>
        </View>

        {/* Admin Badge */}
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#fff" />
          <Text style={styles.adminBadgeText}>Administrator Access</Text>
        </View>

        {/* Metrics Grid */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {METRICS.map((metric) => (
            <Card key={metric.id} style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name={metric.icon} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
              <View style={styles.changeRow}>
                <Ionicons name={metric.changeType === 'positive' ? 'arrow-up' : 'arrow-down'} size={12} color={getChangeColor(metric.changeType)} />
                <Text style={[styles.changeText, { color: getChangeColor(metric.changeType) }]}>{metric.change}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.id} style={styles.actionButton} onPress={() => router.push(action.route as never)}>
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          {[
            { time: '2 min ago', text: 'New user registered: john@example.com', icon: 'person-add' },
            { time: '15 min ago', text: 'Dispute #4521 resolved successfully', icon: 'checkmark-circle' },
            { time: '1 hour ago', text: 'Premium subscription: sarah@example.com', icon: 'card' },
            { time: '2 hours ago', text: 'Support ticket #892 closed', icon: 'help-circle' },
          ].map((activity, idx) => (
            <View key={idx} style={[styles.activityItem, idx < 3 && styles.activityBorder]}>
              <View style={styles.activityIcon}>
                <Ionicons name={activity.icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  adminBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'center', marginBottom: theme.spacing.lg },
  adminBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff', marginLeft: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  metricCard: { width: '48%', margin: '1%', alignItems: 'center', paddingVertical: theme.spacing.md },
  metricIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  metricTitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  changeText: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { alignItems: 'center', padding: theme.spacing.md },
  actionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { fontSize: 12, fontWeight: '500', color: theme.colors.text },
  activityCard: { padding: 0 },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: theme.colors.text },
  activityTime: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
});

