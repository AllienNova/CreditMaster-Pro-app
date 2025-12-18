/**
 * CPFI Documents Library Screen
 * Manage credit repair documents
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Document { id: string; name: string; type: 'report' | 'letter' | 'response' | 'id'; size: string; date: string; status: 'verified' | 'pending' | 'expired'; }

const DOCUMENTS: Document[] = [
  { id: '1', name: 'Experian Credit Report', type: 'report', size: '2.4 MB', date: '2024-12-01', status: 'verified' },
  { id: '2', name: 'Dispute Letter - Late Payment', type: 'letter', size: '156 KB', date: '2024-11-28', status: 'verified' },
  { id: '3', name: 'Equifax Response', type: 'response', size: '890 KB', date: '2024-11-25', status: 'pending' },
  { id: '4', name: 'Driver License', type: 'id', size: '1.2 MB', date: '2024-11-20', status: 'verified' },
  { id: '5', name: 'TransUnion Report', type: 'report', size: '2.1 MB', date: '2024-11-15', status: 'expired' },
  { id: '6', name: 'Goodwill Letter Template', type: 'letter', size: '45 KB', date: '2024-11-10', status: 'verified' },
];

export default function DocumentsScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'report': return 'document-text';
      case 'letter': return 'mail';
      case 'response': return 'chatbox';
      case 'id': return 'card';
      default: return 'document';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'expired': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredDocs = filter ? DOCUMENTS.filter(d => d.type === filter) : DOCUMENTS;
  const stats = { total: DOCUMENTS.length, reports: DOCUMENTS.filter(d => d.type === 'report').length, letters: DOCUMENTS.filter(d => d.type === 'letter').length };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
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
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>Manage your files</Text>
          </View>
          <TouchableOpacity style={styles.uploadButton}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.primary}10` }]}><Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.reports}</Text><Text style={styles.statLabel}>Reports</Text></Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.secondary}10` }]}><Text style={[styles.statValue, { color: theme.colors.secondary }]}>{stats.letters}</Text><Text style={styles.statLabel}>Letters</Text></Card>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'report', 'letter', 'response', 'id'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, (filter === type || (type === 'All' && !filter)) && styles.filterChipActive]}
              onPress={() => setFilter(type === 'All' ? null : type)}
            >
              <Text style={[styles.filterText, (filter === type || (type === 'All' && !filter)) && styles.filterTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Documents List */}
        <View style={styles.docsList}>
          {filteredDocs.map((doc) => (
            <TouchableOpacity key={doc.id} onPress={() => router.push(`/documents/${doc.id}`)}>
              <Card style={styles.docCard}>
                <View style={styles.docIcon}>
                  <Ionicons name={getTypeIcon(doc.type) as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docMeta}>{doc.size} • {doc.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(doc.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>{doc.status}</Text>
                </View>
              </Card>
            </TouchableOpacity>
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
  uploadButton: { width: 44, height: 44, backgroundColor: theme.colors.primary, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  docsList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  docCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  docIcon: { width: 44, height: 44, backgroundColor: `${theme.colors.primary}10`, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  docMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
});

