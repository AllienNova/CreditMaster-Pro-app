/**
 * Fynvita Admin System Logs Screen
 * View and filter system logs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface LogEntry { id: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string; source: string; timestamp: string; }

const LOGS: LogEntry[] = [
  { id: '1', level: 'info', message: 'User john@example.com logged in successfully', source: 'auth', timestamp: '14:32:15' },
  { id: '2', level: 'warn', message: 'Rate limit approaching for IP 192.168.1.100', source: 'api', timestamp: '14:31:45' },
  { id: '3', level: 'error', message: 'Failed to connect to credit bureau API: timeout', source: 'bureau', timestamp: '14:30:22' },
  { id: '4', level: 'info', message: 'Dispute DSP-001 created for user sarah@example.com', source: 'disputes', timestamp: '14:28:10' },
  { id: '5', level: 'debug', message: 'Cache hit for user profile: user_123', source: 'cache', timestamp: '14:27:55' },
  { id: '6', level: 'info', message: 'Payment processed: $29.99 for subscription renewal', source: 'billing', timestamp: '14:25:30' },
  { id: '7', level: 'warn', message: 'AI model response time exceeded 500ms', source: 'ai', timestamp: '14:24:00' },
  { id: '8', level: 'error', message: 'Email delivery failed: invalid recipient', source: 'email', timestamp: '14:22:15' },
  { id: '9', level: 'info', message: 'Scheduled job completed: daily_report_generation', source: 'jobs', timestamp: '14:20:00' },
  { id: '10', level: 'debug', message: 'Database query executed in 12ms', source: 'db', timestamp: '14:18:30' },
];

export default function AdminLogsScreen() {
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return theme.colors.primary;
      case 'warn': return theme.colors.warning;
      case 'error': return theme.colors.error;
      case 'debug': return theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredLogs = levelFilter ? LOGS.filter(l => l.level === levelFilter) : LOGS;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading logs...</Text>
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
            <Text style={styles.title}>System Logs</Text>
            <Text style={styles.subtitle}>Real-time log viewer</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'info', 'warn', 'error', 'debug'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.filterChip, (levelFilter === level || (level === 'All' && !levelFilter)) && styles.filterChipActive]}
              onPress={() => setLevelFilter(level === 'All' ? null : level)}
            >
              <Text style={[styles.filterText, (levelFilter === level || (level === 'All' && !levelFilter)) && styles.filterTextActive]}>
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Logs List */}
        <View style={styles.logsList}>
          {filteredLogs.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(log.level)}15` }]}>
                  <Text style={[styles.levelText, { color: getLevelColor(log.level) }]}>{log.level.toUpperCase()}</Text>
                </View>
                <Text style={styles.logSource}>{log.source}</Text>
                <Text style={styles.logTime}>{log.timestamp}</Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
            </Card>
          ))}
        </View>

        {/* Load More */}
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More Logs</Text>
        </TouchableOpacity>
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
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  logsList: { paddingHorizontal: theme.spacing.lg },
  logCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  levelText: { fontSize: 10, fontWeight: '700' },
  logSource: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, marginLeft: 8 },
  logTime: { fontSize: 11, color: theme.colors.textSecondary },
  logMessage: { fontSize: 13, color: theme.colors.text, lineHeight: 20, fontFamily: 'monospace' },
  loadMoreButton: { alignItems: 'center', padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
  loadMoreText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
});

