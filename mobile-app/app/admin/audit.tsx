/**
 * Fynvita Admin Audit Trail Screen
 * Security events and activity logs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface AuditEvent { id: string; action: string; user: string; timestamp: string; type: 'login' | 'data' | 'admin' | 'security'; details: string; }

const AUDIT_EVENTS: AuditEvent[] = [
  { id: '1', action: 'User Login', user: 'john@example.com', timestamp: '2024-12-07 14:32:15', type: 'login', details: 'Successful login from 192.168.1.1' },
  { id: '2', action: 'Data Export', user: 'admin@cpfi.com', timestamp: '2024-12-07 14:28:00', type: 'data', details: 'Exported user report (500 records)' },
  { id: '3', action: 'Role Change', user: 'admin@cpfi.com', timestamp: '2024-12-07 14:15:30', type: 'admin', details: 'Changed user role: sarah@example.com → Admin' },
  { id: '4', action: 'Failed Login', user: 'unknown@test.com', timestamp: '2024-12-07 14:10:00', type: 'security', details: 'Failed attempt from 10.0.0.5 (5th attempt)' },
  { id: '5', action: 'Settings Update', user: 'admin@cpfi.com', timestamp: '2024-12-07 13:45:00', type: 'admin', details: 'Updated rate limit: 100 → 200 req/min' },
  { id: '6', action: 'User Login', user: 'mary@example.com', timestamp: '2024-12-07 13:30:00', type: 'login', details: 'Successful login from mobile app' },
  { id: '7', action: 'Password Reset', user: 'tom@example.com', timestamp: '2024-12-07 12:15:00', type: 'security', details: 'Password reset requested' },
];

export default function AdminAuditScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return 'log-in';
      case 'data': return 'document-text';
      case 'admin': return 'settings';
      case 'security': return 'shield';
      default: return 'ellipse';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'login': return theme.colors.success;
      case 'data': return theme.colors.primary;
      case 'admin': return theme.colors.warning;
      case 'security': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredEvents = filter ? AUDIT_EVENTS.filter(e => e.type === filter) : AUDIT_EVENTS;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading audit trail...</Text>
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
            <Text style={styles.title}>Audit Trail</Text>
            <Text style={styles.subtitle}>Security & activity logs</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'login', 'data', 'admin', 'security'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, (filter === type || (type === 'All' && !filter)) && styles.filterChipActive]}
              onPress={() => setFilter(type === 'All' ? null : type)}
            >
              <Text style={[styles.filterText, (filter === type || (type === 'All' && !filter)) && styles.filterTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events List */}
        <View style={styles.eventsList}>
          {filteredEvents.map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(event.type)}15` }]}>
                  <Ionicons name={getTypeIcon(event.type) as keyof typeof Ionicons.glyphMap} size={18} color={getTypeColor(event.type)} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventAction}>{event.action}</Text>
                  <Text style={styles.eventUser}>{event.user}</Text>
                </View>
                <Text style={styles.eventTime}>{event.timestamp.split(' ')[1]}</Text>
              </View>
              <Text style={styles.eventDetails}>{event.details}</Text>
              <Text style={styles.eventDate}>{event.timestamp.split(' ')[0]}</Text>
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
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  eventsList: { paddingHorizontal: theme.spacing.lg },
  eventCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  eventHeader: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1, marginLeft: 12 },
  eventAction: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  eventUser: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  eventTime: { fontSize: 12, color: theme.colors.textSecondary },
  eventDetails: { fontSize: 13, color: theme.colors.text, marginTop: 8, backgroundColor: theme.colors.background, padding: 8, borderRadius: 6 },
  eventDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8 },
});

