/**
 * Fynvita Debt Consolidation Marketplace Screen
 * Debt consolidation options
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface ConsolidationOption {
  id: string;
  name: string;
  type: string;
  apr: string;
  minAmount: string;
  maxAmount: string;
  term: string;
  features: string[];
  rating: number;
}

const OPTIONS: ConsolidationOption[] = [
  { id: '1', name: 'SoFi Personal Loan', type: 'Personal Loan', apr: '8.99% - 25.81%', minAmount: '$5,000', maxAmount: '$100,000', term: '2-7 years', features: ['No fees', 'Unemployment protection', 'Rate discount with autopay'], rating: 4.8 },
  { id: '2', name: 'LightStream', type: 'Personal Loan', apr: '7.49% - 25.49%', minAmount: '$5,000', maxAmount: '$100,000', term: '2-12 years', features: ['Same-day funding', 'No fees', 'Rate beat program'], rating: 4.7 },
  { id: '3', name: 'Prosper', type: 'Peer-to-Peer', apr: '8.99% - 35.99%', minAmount: '$2,000', maxAmount: '$50,000', term: '3-5 years', features: ['Fixed rates', 'No prepayment penalty', 'Joint applications'], rating: 4.5 },
  { id: '4', name: 'Upstart', type: 'AI-Based', apr: '6.70% - 35.99%', minAmount: '$1,000', maxAmount: '$50,000', term: '3-5 years', features: ['AI underwriting', 'Fast approval', 'Education considered'], rating: 4.6 },
];

export default function ConsolidationScreen() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const types = ['all', 'Personal Loan', 'Peer-to-Peer', 'AI-Based'];

  const filteredOptions = selectedType === 'all' ? OPTIONS : OPTIONS.filter(o => o.type === selectedType);

  const handleApply = (option: ConsolidationOption) => {
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(option.name)}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Debt Consolidation</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>What is Debt Consolidation?</Text>
            <Text style={styles.infoText}>Combine multiple debts into a single loan with one monthly payment, often at a lower interest rate.</Text>
          </View>
        </Card>

        {/* Benefits */}
        <View style={styles.benefitsRow}>
          {[
            { icon: 'trending-down', text: 'Lower Rate' },
            { icon: 'calendar', text: 'One Payment' },
            { icon: 'time', text: 'Pay Off Faster' },
          ].map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {types.map((type) => (
            <TouchableOpacity key={type} style={[styles.filterChip, selectedType === type && styles.filterChipActive]} onPress={() => setSelectedType(type)}>
              <Text style={[styles.filterText, selectedType === type && styles.filterTextActive]}>{type === 'all' ? 'All Types' : type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Options List */}
        {filteredOptions.map((option) => (
          <Card key={option.id} style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <View>
                <Text style={styles.optionName}>{option.name}</Text>
                <Text style={styles.optionType}>{option.type}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{option.rating}</Text>
              </View>
            </View>

            <View style={styles.optionStats}>
              <View style={styles.statItem}><Text style={styles.statLabel}>APR</Text><Text style={styles.statValue}>{option.apr}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>Amount</Text><Text style={styles.statValue}>{option.minAmount} - {option.maxAmount}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>Term</Text><Text style={styles.statValue}>{option.term}</Text></View>
            </View>

            <View style={styles.featuresSection}>
              {option.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(option)}>
              <Text style={styles.applyButtonText}>Check Your Rate</Text>
              <Ionicons name="open-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </Card>
        ))}

        {/* Calculator Link */}
        <TouchableOpacity style={styles.calculatorLink} onPress={() => router.push('/financial/debt-payoff')}>
          <Ionicons name="calculator" size={20} color={theme.colors.primary} />
          <Text style={styles.calculatorText}>Use our Debt Payoff Calculator</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

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
  infoBanner: { marginBottom: theme.spacing.md },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  infoText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  benefitsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.lg },
  benefitItem: { alignItems: 'center' },
  benefitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  benefitText: { fontSize: 12, fontWeight: '500', color: theme.colors.text },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  optionCard: { marginBottom: theme.spacing.md },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  optionName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  optionType: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#92400E', marginLeft: 4 },
  optionStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary },
  statValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  featuresSection: { marginTop: theme.spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  featureText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8, marginTop: theme.spacing.sm },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 6 },
  calculatorLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, paddingVertical: 14, borderRadius: 12, marginTop: theme.spacing.md },
  calculatorText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginHorizontal: 8 },
});

