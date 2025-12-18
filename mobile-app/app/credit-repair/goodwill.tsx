/**
 * CPFI Goodwill Letters Screen
 * Request late payment removal
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Letter { id: string; creditor: string; status: 'draft' | 'sent' | 'responded' | 'success'; date: string; }

const LETTERS: Letter[] = [
  { id: '1', creditor: 'Chase Bank', status: 'success', date: '2024-11-15' },
  { id: '2', creditor: 'Capital One', status: 'responded', date: '2024-11-20' },
  { id: '3', creditor: 'Discover', status: 'sent', date: '2024-12-01' },
  { id: '4', creditor: 'Bank of America', status: 'draft', date: '2024-12-05' },
];

export default function GoodwillScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return theme.colors.textSecondary;
      case 'sent': return theme.colors.primary;
      case 'responded': return theme.colors.warning;
      case 'success': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Text style={styles.title}>Goodwill Letters</Text>
            <Text style={styles.subtitle}>Request late payment removal</Text>
          </View>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.infoTitle}> What is a Goodwill Letter?</Text>
          </View>
          <Text style={styles.infoText}>A goodwill letter is a polite request to a creditor asking them to remove a late payment from your credit report as a gesture of goodwill. Success rates are higher if you have a good payment history otherwise.</Text>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text style={styles.statValue}>{LETTERS.length}</Text><Text style={styles.statLabel}>Total</Text></Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.success}10` }]}><Text style={[styles.statValue, { color: theme.colors.success }]}>{LETTERS.filter(l => l.status === 'success').length}</Text><Text style={styles.statLabel}>Successful</Text></Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.primary}10` }]}><Text style={[styles.statValue, { color: theme.colors.primary }]}>{LETTERS.filter(l => l.status === 'sent').length}</Text><Text style={styles.statLabel}>Pending</Text></Card>
        </View>

        {/* Letters List */}
        <View style={styles.lettersList}>
          <Text style={styles.sectionTitle}>Your Letters</Text>
          {LETTERS.map((letter) => (
            <Card key={letter.id} style={styles.letterCard}>
              <View style={styles.letterHeader}>
                <View style={styles.letterIcon}>
                  <Ionicons name="mail" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.letterInfo}>
                  <Text style={styles.letterCreditor}>{letter.creditor}</Text>
                  <Text style={styles.letterDate}>{letter.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(letter.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(letter.status) }]}>{letter.status}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="create" size={22} color="#fff" />
          <Text style={styles.createText}>Create New Letter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  infoCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.md, backgroundColor: `${theme.colors.primary}08` },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  infoText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  lettersList: { paddingHorizontal: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  letterCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  letterHeader: { flexDirection: 'row', alignItems: 'center' },
  letterIcon: { width: 40, height: 40, backgroundColor: `${theme.colors.primary}10`, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  letterInfo: { flex: 1, marginLeft: 12 },
  letterCreditor: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  letterDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.lg, paddingVertical: 14, borderRadius: 12 },
  createText: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 8 },
});

