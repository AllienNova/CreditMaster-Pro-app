/**
 * Fynvita Identity Protection Dashboard
 * Comprehensive identity monitoring and protection
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  date: string;
  resolved: boolean;
}

interface ScanResult {
  category: string;
  status: 'safe' | 'exposed' | 'monitoring';
  count: number;
  lastScan: string;
}

const MOCK_ALERTS: Alert[] = [
  { id: '1', type: 'warning', title: 'Email Found on Dark Web', description: 'Your email was found in a data breach from 2023', date: '2024-01-10', resolved: false },
  { id: '2', type: 'info', title: 'New Account Opened', description: 'A new credit card was opened in your name', date: '2024-01-08', resolved: true },
];

const SCAN_RESULTS: ScanResult[] = [
  { category: 'Email Addresses', status: 'exposed', count: 1, lastScan: '2024-01-15' },
  { category: 'Phone Numbers', status: 'safe', count: 0, lastScan: '2024-01-15' },
  { category: 'SSN', status: 'safe', count: 0, lastScan: '2024-01-15' },
  { category: 'Passwords', status: 'exposed', count: 2, lastScan: '2024-01-15' },
  { category: 'Bank Accounts', status: 'safe', count: 0, lastScan: '2024-01-15' },
  { category: 'Credit Cards', status: 'monitoring', count: 0, lastScan: '2024-01-15' },
];

const FEATURES = [
  { icon: 'globe', title: 'Dark Web Monitoring', subtitle: 'Scan for exposed data', route: '/identity/dark-web', badge: '2 found' },
  { icon: 'finger-print', title: 'SSN Monitoring', subtitle: 'Track SSN usage', route: '/identity/ssn-monitoring', badge: null },
  { icon: 'card', title: 'Credit Monitoring', subtitle: 'New account alerts', route: '/monitoring', badge: null },
  { icon: 'snow', title: 'Credit Freeze', subtitle: 'Manage bureau freezes', route: '/credit-builder/freeze', badge: '2/3' },
  { icon: 'shield-checkmark', title: 'Identity Insurance', subtitle: '$1M coverage', route: '/identity/insurance', badge: 'Active' },
  { icon: 'document-text', title: 'Recovery Plan', subtitle: 'If identity is stolen', route: '/identity/recovery', badge: null },
];

export default function IdentityScreen() {
  const unresolvedAlerts = MOCK_ALERTS.filter(a => !a.resolved).length;
  const exposedItems = SCAN_RESULTS.filter(s => s.status === 'exposed').reduce((sum, s) => sum + s.count, 0);
  const protectionScore = exposedItems === 0 ? 100 : Math.max(0, 100 - (exposedItems * 15));

  const getStatusColor = (score: number) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return { name: 'alert-circle', color: '#EF4444' };
      case 'warning': return { name: 'warning', color: '#F59E0B' };
      default: return { name: 'information-circle', color: '#3B82F6' };
    }
  };

  const getScanStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return { name: 'checkmark-circle', color: '#22C55E' };
      case 'exposed': return { name: 'alert-circle', color: '#EF4444' };
      default: return { name: 'eye', color: '#3B82F6' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Identity Protection</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings/identity')}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Protection Score */}
        <Card style={[styles.scoreCard, { borderLeftColor: getStatusColor(protectionScore), borderLeftWidth: 4 }]}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getStatusColor(protectionScore) }]}>{protectionScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreTitle}>{protectionScore >= 80 ? 'Well Protected' : protectionScore >= 60 ? 'Needs Attention' : 'At Risk'}</Text>
              <Text style={styles.scoreSubtitle}>{exposedItems} items exposed • {unresolvedAlerts} alerts</Text>
              <View style={styles.lastScanRow}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.lastScanText}>Last scan: Today at 9:00 AM</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.scanButton}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.scanButtonText}>Run Full Scan</Text>
          </TouchableOpacity>
        </Card>

        {/* Active Alerts */}
        {unresolvedAlerts > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              <TouchableOpacity onPress={() => router.push('/identity/alerts')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {MOCK_ALERTS.filter(a => !a.resolved).map((alert) => {
              const icon = getAlertIcon(alert.type);
              return (
                <TouchableOpacity key={alert.id} onPress={() => router.push(`/identity/alerts/${alert.id}`)}>
                  <Card style={styles.alertCard}>
                    <View style={[styles.alertIcon, { backgroundColor: `${icon.color}15` }]}>
                      <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={24} color={icon.color} />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertDescription}>{alert.description}</Text>
                      <Text style={styles.alertDate}>{alert.date}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Scan Results Summary */}
        <Text style={styles.sectionTitle}>Monitoring Status</Text>
        <Card style={styles.scanResultsCard}>
          {SCAN_RESULTS.map((result, idx) => {
            const icon = getScanStatusIcon(result.status);
            return (
              <View key={result.category} style={[styles.scanResultRow, idx < SCAN_RESULTS.length - 1 && styles.scanResultBorder]}>
                <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={20} color={icon.color} />
                <Text style={styles.scanResultCategory}>{result.category}</Text>
                <Text style={[styles.scanResultStatus, { color: icon.color }]}>
                  {result.status === 'exposed' ? `${result.count} exposed` : result.status === 'safe' ? 'Safe' : 'Monitoring'}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Protection Features</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <TouchableOpacity key={index} style={styles.featureCard} onPress={() => router.push(feature.route as never)} activeOpacity={0.7}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              {feature.badge && (
                <View style={[styles.featureBadge, feature.badge.includes('found') && styles.featureBadgeWarning]}>
                  <Text style={[styles.featureBadgeText, feature.badge.includes('found') && styles.featureBadgeTextWarning]}>{feature.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Items */}
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Recommended Actions</Text>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="key" size={20} color="#F59E0B" />
            <Text style={styles.actionText}>Change 2 compromised passwords</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="snow" size={20} color="#3B82F6" />
            <Text style={styles.actionText}>Freeze credit at TransUnion</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  settingsButton: { padding: 4 },
  scoreCard: { marginBottom: theme.spacing.lg },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  scoreValue: { fontSize: 32, fontWeight: '700' },
  scoreLabel: { fontSize: 11, color: theme.colors.textSecondary },
  scoreInfo: { flex: 1 },
  scoreTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  scoreSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  lastScanRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  lastScanText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: theme.borderRadius.md },
  scanButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  seeAllText: { fontSize: 14, color: theme.colors.primary },
  alertCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  alertIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  alertDescription: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  alertDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  scanResultsCard: { marginBottom: theme.spacing.lg },
  scanResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  scanResultBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  scanResultCategory: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 12 },
  scanResultStatus: { fontSize: 13, fontWeight: '500' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: theme.spacing.md },
  featureCard: { width: '48%', margin: '1%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, position: 'relative' },
  featureIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  featureSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  featureBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  featureBadgeWarning: { backgroundColor: '#FEF3C7' },
  featureBadgeText: { fontSize: 10, fontWeight: '600', color: '#059669' },
  featureBadgeTextWarning: { color: '#D97706' },
  actionCard: { marginTop: theme.spacing.md },
  actionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionText: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 12 },
});

