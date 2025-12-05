import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';
import { disputesAPI, DisputeStrategy } from '../../services/api';

// Local strategy data (fallback when API unavailable)
const LOCAL_STRATEGIES: DisputeStrategy[] = [
  {
    id: 'escalation_tactics',
    name: 'Multi-Level Escalation',
    description: 'Progressive escalation through regulatory channels including CFPB, state AG, and legal demand letters',
    successRate: 72,
    difficulty: 'intermediate',
    riskLevel: 'medium',
    timeline: '60-90 days',
    legalBasis: ['FCRA §611', 'FCRA §616', 'FCRA §617', 'State consumer protection laws'],
    steps: [
      { step: 1, title: 'File CFPB Complaint', description: 'Submit formal complaint to Consumer Financial Protection Bureau' },
      { step: 2, title: 'State AG Complaint', description: 'File complaint with your state Attorney General' },
      { step: 3, title: 'Legal Demand Letter', description: 'Send attorney-drafted demand letter' },
    ],
    expectedOutcomes: [
      { outcome: 'Item removed after CFPB', probability: 45 },
      { outcome: 'Item removed after AG complaint', probability: 20 },
      { outcome: 'Settlement offer', probability: 15 },
    ],
    whenToUse: ['Multiple failed standard disputes', 'Clear FCRA violations', 'Time-sensitive situations'],
    whenNotToUse: ['First dispute attempt', 'No documentation of previous disputes'],
  },
  {
    id: 'mov_challenge',
    name: 'Method of Verification Challenge',
    description: 'Challenge how bureaus verified disputed information under FCRA §611(a)(6)(B)(iii)',
    successRate: 58,
    difficulty: 'advanced',
    riskLevel: 'low',
    timeline: '30-45 days',
    legalBasis: ['FCRA §611(a)(6)(B)(iii)', 'FCRA §611(a)(7)', 'FTC Opinion Letters'],
    steps: [
      { step: 1, title: 'Request MOV Details', description: 'Send letter requesting specific verification procedures used' },
      { step: 2, title: 'Analyze Response', description: 'Review bureau response for procedural failures' },
      { step: 3, title: 'Challenge Deficiencies', description: 'File follow-up citing specific procedural violations' },
    ],
    expectedOutcomes: [
      { outcome: 'Item deleted due to verification failure', probability: 35 },
      { outcome: 'Bureau provides detailed MOV', probability: 40 },
      { outcome: 'Basis for legal action', probability: 15 },
    ],
    whenToUse: ['Bureau claims verification without details', 'Furnisher non-responsive', 'Building legal case'],
    whenNotToUse: ['First dispute', 'Accurate information'],
  },
  {
    id: 'furnisher_direct',
    name: 'Furnisher Direct Dispute',
    description: 'Dispute directly with the data furnisher under FCRA §623 for more thorough investigation',
    successRate: 62,
    difficulty: 'intermediate',
    riskLevel: 'low',
    timeline: '30-45 days',
    legalBasis: ['FCRA §623(a)(8)', 'FCRA §623(b)', '12 CFR 1022.43'],
    steps: [
      { step: 1, title: 'Identify Furnisher', description: 'Get furnisher contact information from credit report' },
      { step: 2, title: 'Send Direct Dispute', description: 'Mail dispute letter directly to creditor/collection agency' },
      { step: 3, title: 'Follow Up', description: 'Track response and follow up if needed' },
    ],
    expectedOutcomes: [
      { outcome: 'Furnisher corrects/deletes', probability: 40 },
      { outcome: 'Furnisher verifies accuracy', probability: 35 },
      { outcome: 'Furnisher non-responsive', probability: 20 },
    ],
    whenToUse: ['Bureau disputes unsuccessful', 'Need more thorough investigation', 'Relationship with creditor'],
    whenNotToUse: ['Already disputed with furnisher', 'Debt collector harassment concerns'],
  },
  {
    id: 'debt_validation',
    name: 'FDCPA Debt Validation',
    description: 'Request complete debt validation from collection agencies under FDCPA §809(b)',
    successRate: 48,
    difficulty: 'beginner',
    riskLevel: 'low',
    timeline: '30-45 days',
    legalBasis: ['FDCPA §809(a)', 'FDCPA §809(b)', '15 U.S.C. §1692g'],
    steps: [
      { step: 1, title: 'Send Validation Request', description: 'Send within 30 days of first contact for strongest protection' },
      { step: 2, title: 'Review Validation', description: 'Check if validation meets legal requirements' },
      { step: 3, title: 'Challenge Insufficiency', description: 'Dispute if validation is incomplete' },
    ],
    expectedOutcomes: [
      { outcome: 'Debt cannot be validated - deleted', probability: 25 },
      { outcome: 'Validation reveals errors', probability: 15 },
      { outcome: 'Full validation provided', probability: 50 },
    ],
    whenToUse: ['Unknown collection accounts', 'Recently contacted by collector', 'Suspicious debt'],
    whenNotToUse: ['Debt is clearly yours', 'Older than statute of limitations'],
  },
  {
    id: 'hybrid_goodwill',
    name: 'Hybrid Dispute + Goodwill',
    description: 'Combine dispute rights with goodwill appeal for maximum effectiveness',
    successRate: 55,
    difficulty: 'beginner',
    riskLevel: 'low',
    timeline: '30-60 days',
    legalBasis: ['FCRA §611', 'Creditor discretion', 'Customer relationship policies'],
    steps: [
      { step: 1, title: 'Send Goodwill Letter', description: 'Appeal to creditor\'s discretion citing positive history' },
      { step: 2, title: 'Follow Up with Dispute', description: 'If goodwill fails, file formal dispute' },
      { step: 3, title: 'Escalate if Needed', description: 'Use executive email carpet bomb technique' },
    ],
    expectedOutcomes: [
      { outcome: 'Goodwill adjustment granted', probability: 25 },
      { outcome: 'Dispute removes item', probability: 20 },
      { outcome: 'Partial adjustment', probability: 15 },
    ],
    whenToUse: ['Good payment history except one issue', 'Long-standing customer', 'Extenuating circumstances'],
    whenNotToUse: ['Multiple delinquencies', 'No relationship with creditor'],
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return '#16A34A';
    case 'intermediate': return '#D97706';
    case 'advanced': return '#DC2626';
    case 'expert': return '#7C3AED';
    default: return '#6B7280';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return '#16A34A';
    case 'medium': return '#D97706';
    case 'high': return '#DC2626';
    default: return '#6B7280';
  }
};

export default function StrategiesScreen() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<DisputeStrategy[]>(LOCAL_STRATEGIES);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const { data, error } = await disputesAPI.getStrategies();
      if (data?.strategies && !error) {
        setStrategies(data.strategies);
      }
    } catch {
      // Use local strategies
    }
    setLoading(false);
  };

  const filteredStrategies = strategies.filter(s => 
    !selectedDifficulty || s.difficulty === selectedDifficulty
  );

  const handleSelectStrategy = (strategy: DisputeStrategy) => {
    router.push({
      pathname: '/dispute/use-strategy',
      params: { strategyId: strategy.id, strategyName: strategy.name },
    } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Strategies</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={24} color={lightTheme.colors.primary} />
        <Text style={styles.infoText}>
          These strategies combine FCRA rights with proven dispute techniques for maximum effectiveness
        </Text>
      </View>

      {/* Difficulty Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'beginner', 'intermediate', 'advanced', 'expert'].map(diff => (
          <TouchableOpacity
            key={diff}
            style={[
              styles.filterChip,
              (selectedDifficulty === diff || (diff === 'all' && !selectedDifficulty)) && styles.filterChipActive
            ]}
            onPress={() => setSelectedDifficulty(diff === 'all' ? null : diff)}
          >
            <Text style={[
              styles.filterText,
              (selectedDifficulty === diff || (diff === 'all' && !selectedDifficulty)) && styles.filterTextActive
            ]}>
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.strategiesList}>
          {filteredStrategies.map(strategy => (
            <TouchableOpacity
              key={strategy.id}
              style={styles.strategyCard}
              onPress={() => setExpandedId(expandedId === strategy.id ? null : strategy.id)}
              activeOpacity={0.8}
            >
              <View style={styles.strategyHeader}>
                <Text style={styles.strategyName}>{strategy.name}</Text>
                <Text style={[styles.successRate, { color: strategy.successRate >= 60 ? '#16A34A' : '#D97706' }]}>
                  {strategy.successRate}%
                </Text>
              </View>

              <Text style={styles.strategyDesc} numberOfLines={expandedId === strategy.id ? undefined : 2}>
                {strategy.description}
              </Text>

              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: getDifficultyColor(strategy.difficulty) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getDifficultyColor(strategy.difficulty) }]}>
                    {strategy.difficulty}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getRiskColor(strategy.riskLevel) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getRiskColor(strategy.riskLevel) }]}>
                    {strategy.riskLevel} risk
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={14} color={lightTheme.colors.textSecondary} />
                  <Text style={styles.badgeText}>{strategy.timeline}</Text>
                </View>
              </View>

              {expandedId === strategy.id && (
                <View style={styles.expandedContent}>
                  <Text style={styles.sectionTitle}>Steps:</Text>
                  {strategy.steps.map((step, i) => (
                    <View key={i} style={styles.stepItem}>
                      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{step.step}</Text></View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDesc}>{step.description}</Text>
                      </View>
                    </View>
                  ))}

                  <Text style={styles.sectionTitle}>Legal Basis:</Text>
                  <View style={styles.legalList}>
                    {strategy.legalBasis.map((law, i) => (
                      <Text key={i} style={styles.legalItem}>• {law}</Text>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.useButton} onPress={() => handleSelectStrategy(strategy)}>
                    <Text style={styles.useButtonText}>Use This Strategy</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.expandIcon}>
                <Ionicons 
                  name={expandedId === strategy.id ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={lightTheme.colors.textSecondary} 
                />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  infoBanner: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 12, backgroundColor: lightTheme.colors.primary + '10', borderRadius: 12, gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: lightTheme.colors.text, lineHeight: 18 },
  filterContainer: { maxHeight: 50, paddingHorizontal: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: lightTheme.colors.surface, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: lightTheme.colors.primary },
  filterText: { fontSize: 14, color: lightTheme.colors.textSecondary },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  strategiesList: { flex: 1, padding: 16 },
  strategyCard: { backgroundColor: lightTheme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  strategyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  strategyName: { fontSize: 17, fontWeight: '600', color: lightTheme.colors.text, flex: 1 },
  successRate: { fontSize: 16, fontWeight: '700' },
  strategyDesc: { fontSize: 14, color: lightTheme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: lightTheme.colors.background, borderRadius: 12, gap: 4 },
  badgeText: { fontSize: 12, color: lightTheme.colors.textSecondary, textTransform: 'capitalize' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: lightTheme.colors.border },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: lightTheme.colors.text, marginBottom: 8, marginTop: 12 },
  stepItem: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: lightTheme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '500', color: lightTheme.colors.text },
  stepDesc: { fontSize: 13, color: lightTheme.colors.textSecondary, marginTop: 2 },
  legalList: { marginBottom: 16 },
  legalItem: { fontSize: 13, color: lightTheme.colors.textSecondary, marginBottom: 4 },
  useButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: lightTheme.colors.primary, padding: 14, borderRadius: 12, gap: 8 },
  useButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  expandIcon: { position: 'absolute', right: 16, bottom: 16 },
});

