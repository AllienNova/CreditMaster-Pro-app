/**
 * Fynvita Credit Repair Hub Screen
 * Central hub for all credit repair tools
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Tool { id: string; name: string; description: string; icon: string; route: string; color: string; }

const TOOLS: Tool[] = [
  { id: '1', name: 'Dispute Center', description: 'File and track credit disputes', icon: 'document-text', route: '/credit-repair/disputes', color: theme.colors.primary },
  { id: '2', name: 'Credit Building', description: 'Strategies to build credit', icon: 'trending-up', route: '/credit-repair/building', color: theme.colors.success },
  { id: '3', name: 'Credit Cards', description: 'Card recommendations', icon: 'card', route: '/credit-repair/cards', color: theme.colors.secondary },
  { id: '4', name: 'Goodwill Letters', description: 'Request late payment removal', icon: 'mail', route: '/credit-repair/goodwill', color: theme.colors.warning },
  { id: '5', name: 'Inquiry Removal', description: 'Remove hard inquiries', icon: 'search', route: '/credit-repair/inquiries', color: '#9333ea' },
  { id: '6', name: 'Debt Negotiation', description: 'Negotiate with creditors', icon: 'chatbubbles', route: '/credit-repair/negotiate', color: '#0891b2' },
  { id: '7', name: 'Payment History', description: 'Track payment patterns', icon: 'calendar', route: '/credit-repair/payments', color: '#059669' },
];

export default function CreditRepairScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tools...</Text>
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
            <Text style={styles.title}>Credit Repair</Text>
            <Text style={styles.subtitle}>Tools to improve your credit</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Active Disputes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>+45</Text>
              <Text style={styles.statLabel}>Points Gained</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </Card>

        {/* Tools Grid */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionTitle}>Repair Tools</Text>
          <View style={styles.toolsGrid}>
            {TOOLS.map((tool) => (
              <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => router.push(tool.route as any)}>
                <View style={[styles.toolIcon, { backgroundColor: `${tool.color}15` }]}>
                  <Ionicons name={tool.icon as keyof typeof Ionicons.glyphMap} size={28} color={tool.color} />
                </View>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDesc} numberOfLines={2}>{tool.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.tipsTitle}> Pro Tip</Text>
          </View>
          <Text style={styles.tipsText}>Start with disputing inaccurate information on your credit report. This often has the biggest impact on your score.</Text>
        </Card>
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
  statsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  toolsSection: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  toolCard: { width: '48%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: theme.spacing.md, margin: '1%', marginBottom: 8 },
  toolIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  toolName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  toolDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  tipsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl, padding: theme.spacing.md, backgroundColor: `${theme.colors.warning}10` },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.warning },
  tipsText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
});

