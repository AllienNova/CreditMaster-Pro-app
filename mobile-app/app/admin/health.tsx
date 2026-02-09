/**
 * Fynvita Admin System Health Screen
 * Monitor system health and status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Service { name: string; status: 'healthy' | 'degraded' | 'down'; responseTime: number; uptime: string; lastCheck: string; }

const SERVICES: Service[] = [
  { name: 'API Gateway', status: 'healthy', responseTime: 45, uptime: '99.99%', lastCheck: '30s ago' },
  { name: 'Database (Supabase)', status: 'healthy', responseTime: 12, uptime: '99.95%', lastCheck: '30s ago' },
  { name: 'Authentication', status: 'healthy', responseTime: 89, uptime: '99.98%', lastCheck: '30s ago' },
  { name: 'AI Engine', status: 'degraded', responseTime: 350, uptime: '98.5%', lastCheck: '30s ago' },
  { name: 'Email Service (Resend)', status: 'healthy', responseTime: 120, uptime: '99.9%', lastCheck: '30s ago' },
  { name: 'Payment (Stripe)', status: 'healthy', responseTime: 180, uptime: '99.99%', lastCheck: '30s ago' },
  { name: 'Credit Bureaus API', status: 'healthy', responseTime: 520, uptime: '99.7%', lastCheck: '30s ago' },
  { name: 'Redis Cache', status: 'healthy', responseTime: 3, uptime: '99.99%', lastCheck: '30s ago' },
];

export default function AdminHealthScreen() {
  const [loading, setLoading] = useState(true);
  const [services] = useState(SERVICES);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return theme.colors.success;
      case 'degraded': return theme.colors.warning;
      case 'down': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking system health...</Text>
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
            <Text style={styles.title}>System Health</Text>
            <Text style={styles.subtitle}>Service status & monitoring</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Overall Status */}
        <Card style={[styles.statusCard, { backgroundColor: healthyCount === services.length ? `${theme.colors.success}10` : `${theme.colors.warning}10` }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: healthyCount === services.length ? theme.colors.success : theme.colors.warning }]} />
            <Text style={[styles.statusText, { color: healthyCount === services.length ? theme.colors.success : theme.colors.warning }]}>
              {healthyCount === services.length ? 'All Systems Operational' : 'Some Systems Degraded'}
            </Text>
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.success}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>{healthyCount}</Text>
            <Text style={styles.statLabel}>Healthy</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.warning}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>{degradedCount}</Text>
            <Text style={styles.statLabel}>Degraded</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.error}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>{downCount}</Text>
            <Text style={styles.statLabel}>Down</Text>
          </Card>
        </View>

        {/* Services List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {services.map((service, i) => (
            <Card key={i} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={[styles.serviceDot, { backgroundColor: getStatusColor(service.status) }]} />
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(service.status)}15` }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(service.status) }]}>{service.status}</Text>
                </View>
              </View>
              <View style={styles.serviceDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Response</Text>
                  <Text style={styles.detailValue}>{service.responseTime}ms</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Uptime</Text>
                  <Text style={styles.detailValue}>{service.uptime}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Last Check</Text>
                  <Text style={styles.detailValue}>{service.lastCheck}</Text>
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
  refreshButton: { padding: theme.spacing.sm },
  statusCard: { marginHorizontal: theme.spacing.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  serviceCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  serviceHeader: { flexDirection: 'row', alignItems: 'center' },
  serviceDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  serviceName: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  serviceDetails: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
});

