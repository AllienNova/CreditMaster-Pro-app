/**
 * CPFI Credit Mix Screen
 * Diversify credit types for better score
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface CreditType {
  id: string;
  type: string;
  icon: string;
  count: number;
  hasType: boolean;
  description: string;
  color: string;
}

const CREDIT_TYPES: CreditType[] = [
  { id: 'credit_cards', type: 'Credit Cards', icon: 'card', count: 3, hasType: true, description: 'Revolving credit accounts', color: '#3B82F6' },
  { id: 'auto_loan', type: 'Auto Loan', icon: 'car', count: 1, hasType: true, description: 'Installment loan for vehicle', color: '#22C55E' },
  { id: 'mortgage', type: 'Mortgage', icon: 'home', count: 0, hasType: false, description: 'Home loan', color: '#F59E0B' },
  { id: 'student_loan', type: 'Student Loans', icon: 'school', count: 2, hasType: true, description: 'Education financing', color: '#8B5CF6' },
  { id: 'personal_loan', type: 'Personal Loan', icon: 'cash', count: 0, hasType: false, description: 'Unsecured installment loan', color: '#EC4899' },
  { id: 'retail_card', type: 'Retail Cards', icon: 'storefront', count: 1, hasType: true, description: 'Store credit cards', color: '#06B6D4' },
];

export default function CreditMixScreen() {
  const typesHave = CREDIT_TYPES.filter(t => t.hasType).length;
  const totalTypes = CREDIT_TYPES.length;
  const mixScore = Math.round((typesHave / totalTypes) * 100);
  const totalAccounts = CREDIT_TYPES.reduce((sum, t) => sum + t.count, 0);

  const getMixColor = (score: number) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#84CC16';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getMixLabel = (score: number) => {
    if (score >= 80) return 'Excellent Mix';
    if (score >= 60) return 'Good Mix';
    if (score >= 40) return 'Fair Mix';
    return 'Limited Mix';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Mix</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Mix Score Card */}
        <Card style={styles.mixCard}>
          <View style={styles.mixCircle}>
            <Text style={[styles.mixPercent, { color: getMixColor(mixScore) }]}>{typesHave}/{totalTypes}</Text>
            <Text style={styles.mixLabel}>{getMixLabel(mixScore)}</Text>
          </View>
          <View style={styles.mixBar}>
            <View style={[styles.mixFill, { width: `${mixScore}%`, backgroundColor: getMixColor(mixScore) }]} />
          </View>
          <Text style={styles.mixHint}>You have {typesHave} of {totalTypes} credit types</Text>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{totalAccounts}</Text>
            <Text style={styles.statLabel}>Total Accounts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{typesHave}</Text>
            <Text style={styles.statLabel}>Credit Types</Text>
          </Card>
        </View>

        {/* Impact Info */}
        <Card style={styles.impactCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.impactText}>Credit mix accounts for 10% of your score. Having diverse credit types shows lenders you can manage different accounts.</Text>
        </Card>

        {/* Credit Types */}
        <Text style={styles.sectionTitle}>Credit Types</Text>
        {CREDIT_TYPES.map((creditType) => (
          <Card key={creditType.id} style={[styles.typeCard, !creditType.hasType && styles.missingCard]}>
            <View style={styles.typeRow}>
              <View style={[styles.typeIcon, { backgroundColor: `${creditType.color}20` }]}>
                <Ionicons name={creditType.icon as keyof typeof Ionicons.glyphMap} size={24} color={creditType.color} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeName}>{creditType.type}</Text>
                <Text style={styles.typeDescription}>{creditType.description}</Text>
              </View>
              <View style={styles.typeRight}>
                {creditType.hasType ? (
                  <>
                    <View style={styles.countBadge}><Text style={styles.countText}>{creditType.count}</Text></View>
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  </>
                ) : (
                  <>
                    <Text style={styles.missingText}>Missing</Text>
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.textSecondary} />
                  </>
                )}
              </View>
            </View>
          </Card>
        ))}

        {/* Recommendations */}
        {CREDIT_TYPES.filter(t => !t.hasType).length > 0 && (
          <Card style={styles.recommendCard}>
            <Text style={styles.recommendTitle}>Recommendations</Text>
            <Text style={styles.recommendText}>Consider adding these credit types to improve your mix:</Text>
            {CREDIT_TYPES.filter(t => !t.hasType).map((t) => (
              <View key={t.id} style={styles.recommendItem}>
                <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={18} color={t.color} />
                <Text style={styles.recommendItemText}>{t.type}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Better Credit Mix</Text>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Don't open accounts just for mix - only if needed</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Credit builder loans can add installment credit</Text></View>
          <View style={styles.tipItem}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /><Text style={styles.tipText}>Secured cards are good for building credit</Text></View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  mixCard: { alignItems: 'center', marginBottom: theme.spacing.md },
  mixCircle: { alignItems: 'center', marginBottom: theme.spacing.md },
  mixPercent: { fontSize: 48, fontWeight: '700' },
  mixLabel: { fontSize: 16, color: theme.colors.textSecondary },
  mixBar: { width: '100%', height: 12, backgroundColor: theme.colors.border, borderRadius: 6 },
  mixFill: { height: '100%', borderRadius: 6 },
  mixHint: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  impactCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.lg, backgroundColor: `${theme.colors.primary}10` },
  impactText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 10, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  typeCard: { marginBottom: theme.spacing.sm },
  missingCard: { opacity: 0.7, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border },
  typeRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  typeDescription: { fontSize: 12, color: theme.colors.textSecondary },
  typeRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  missingText: { fontSize: 12, color: theme.colors.textSecondary },
  recommendCard: { marginTop: theme.spacing.md, backgroundColor: '#FEF3C720' },
  recommendTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  recommendText: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  recommendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recommendItemText: { fontSize: 14, color: theme.colors.text, marginLeft: 10 },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});

