/**
 * CPFI Loan Pre-qualification Screen
 * Pre-qualified loan offers with rate comparison and calculator
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface LoanOffer {
  id: string;
  lender: string;
  type: 'personal' | 'auto' | 'home' | 'student' | 'debt_consolidation';
  minAmount: number;
  maxAmount: number;
  aprRange: string;
  termRange: string;
  monthlyPayment: number;
  approvalOdds: number;
  features: string[];
  prequalified: boolean;
}

const LOAN_OFFERS: LoanOffer[] = [
  { id: '1', lender: 'SoFi', type: 'personal', minAmount: 5000, maxAmount: 100000, aprRange: '8.99% - 25.81%', termRange: '24-84 months', monthlyPayment: 312, approvalOdds: 82, features: ['No fees', 'Unemployment protection', 'Rate discount with autopay'], prequalified: true },
  { id: '2', lender: 'LightStream', type: 'personal', minAmount: 5000, maxAmount: 100000, aprRange: '7.49% - 25.49%', termRange: '24-144 months', monthlyPayment: 298, approvalOdds: 75, features: ['Rate beat program', 'Same-day funding', 'No fees'], prequalified: true },
  { id: '3', lender: 'Upstart', type: 'personal', minAmount: 1000, maxAmount: 50000, aprRange: '6.70% - 35.99%', termRange: '36-60 months', monthlyPayment: 345, approvalOdds: 88, features: ['AI-powered approval', 'Fast funding', 'Considers education'], prequalified: true },
  { id: '4', lender: 'Marcus by Goldman Sachs', type: 'debt_consolidation', minAmount: 3500, maxAmount: 40000, aprRange: '6.99% - 24.99%', termRange: '36-72 months', monthlyPayment: 285, approvalOdds: 70, features: ['No fees', 'On-time payment reward', 'Flexible payments'], prequalified: false },
  { id: '5', lender: 'Discover', type: 'personal', minAmount: 2500, maxAmount: 35000, aprRange: '7.99% - 24.99%', termRange: '36-84 months', monthlyPayment: 275, approvalOdds: 78, features: ['Cash back reward', 'No origination fee', 'Flexible terms'], prequalified: true },
];

const LOAN_TYPES = [
  { id: 'all', label: 'All Loans' },
  { id: 'personal', label: 'Personal' },
  { id: 'debt_consolidation', label: 'Debt Consolidation' },
  { id: 'auto', label: 'Auto' },
  { id: 'home', label: 'Home' },
];

export default function LoansScreen() {
  const [selectedType, setSelectedType] = useState('all');
  const [loanAmount, setLoanAmount] = useState('10000');
  const [showCalculator, setShowCalculator] = useState(false);
  
  const filteredOffers = selectedType === 'all' ? LOAN_OFFERS : LOAN_OFFERS.filter(o => o.type === selectedType);
  const sortedOffers = [...filteredOffers].sort((a, b) => b.approvalOdds - a.approvalOdds);

  const getApprovalColor = (odds: number) => {
    if (odds >= 80) return '#22C55E';
    if (odds >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Loan Offers</Text>
          <TouchableOpacity onPress={() => setShowCalculator(!showCalculator)}>
            <Ionicons name="calculator" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Pre-qualification Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="checkmark-shield" size={24} color="#22C55E" />
          </View>
          <Text style={styles.summaryTitle}>Pre-Qualified Offers</Text>
          <Text style={styles.summaryText}>Based on your credit profile, you're pre-qualified for {LOAN_OFFERS.filter(o => o.prequalified).length} loan offers with no impact to your credit score</Text>
        </Card>

        {/* Calculator */}
        {showCalculator && (
          <Card style={styles.calculatorCard}>
            <Text style={styles.calcTitle}>Loan Calculator</Text>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Loan Amount</Text>
              <View style={styles.calcInput}>
                <Text style={styles.calcPrefix}>$</Text>
                <TextInput style={styles.calcInputField} value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" placeholder="10,000" />
              </View>
            </View>
            <View style={styles.calcResults}>
              <View style={styles.calcResult}>
                <Text style={styles.calcResultLabel}>Est. Monthly</Text>
                <Text style={styles.calcResultValue}>${Math.round(parseInt(loanAmount || '0') / 36)}</Text>
              </View>
              <View style={styles.calcResult}>
                <Text style={styles.calcResultLabel}>Total Interest</Text>
                <Text style={styles.calcResultValue}>${Math.round(parseInt(loanAmount || '0') * 0.15)}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {LOAN_TYPES.map((type) => (
            <TouchableOpacity key={type.id} style={[styles.filterChip, selectedType === type.id && styles.filterChipActive]} onPress={() => setSelectedType(type.id)}>
              <Text style={[styles.filterChipText, selectedType === type.id && styles.filterChipTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Offers List */}
        <Text style={styles.sectionTitle}>{sortedOffers.length} Offers Available</Text>
        {sortedOffers.map((offer) => (
          <Card key={offer.id} style={[styles.offerCard, offer.prequalified && styles.offerCardPrequalified]}>
            {offer.prequalified && <View style={styles.prequalBadge}><Text style={styles.prequalText}>PRE-QUALIFIED</Text></View>}
            <View style={styles.offerHeader}>
              <View style={styles.offerInfo}>
                <Text style={styles.offerLender}>{offer.lender}</Text>
                <Text style={styles.offerType}>{offer.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
              </View>
              <View style={[styles.approvalBadge, { backgroundColor: `${getApprovalColor(offer.approvalOdds)}15` }]}>
                <Text style={[styles.approvalText, { color: getApprovalColor(offer.approvalOdds) }]}>{offer.approvalOdds}%</Text>
                <Text style={styles.approvalLabel}>odds</Text>
              </View>
            </View>
            <View style={styles.offerDetails}>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Amount</Text><Text style={styles.detailValue}>{formatCurrency(offer.minAmount)} - {formatCurrency(offer.maxAmount)}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>APR</Text><Text style={styles.detailValue}>{offer.aprRange.split(' - ')[0]}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Terms</Text><Text style={styles.detailValue}>{offer.termRange}</Text></View>
            </View>
            <View style={styles.featuresSection}>
              {offer.features.slice(0, 2).map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <View style={styles.offerFooter}>
              <View>
                <Text style={styles.monthlyLabel}>Est. Monthly Payment</Text>
                <Text style={styles.monthlyValue}>${offer.monthlyPayment}/mo</Text>
              </View>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Check Rate</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

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
  summaryCard: { alignItems: 'center', marginBottom: theme.spacing.lg, backgroundColor: '#F0FDF4' },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  summaryText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  calculatorCard: { marginBottom: theme.spacing.lg, backgroundColor: '#F5F3FF' },
  calcTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  calcLabel: { fontSize: 14, color: theme.colors.textSecondary },
  calcInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  calcPrefix: { fontSize: 16, color: theme.colors.textSecondary, marginRight: 4 },
  calcInputField: { fontSize: 16, color: theme.colors.text, minWidth: 80 },
  calcResults: { flexDirection: 'row', paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: '#E9D5FF' },
  calcResult: { flex: 1, alignItems: 'center' },
  calcResultLabel: { fontSize: 11, color: theme.colors.textSecondary },
  calcResultValue: { fontSize: 18, fontWeight: '700', color: '#8B5CF6', marginTop: 2 },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  offerCard: { marginBottom: theme.spacing.md, position: 'relative' },
  offerCardPrequalified: { borderWidth: 2, borderColor: '#22C55E' },
  prequalBadge: { position: 'absolute', top: -1, right: 16, backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  prequalText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  offerInfo: { flex: 1 },
  offerLender: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  offerType: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  approvalBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  approvalText: { fontSize: 18, fontWeight: '700' },
  approvalLabel: { fontSize: 10, color: theme.colors.textSecondary },
  offerDetails: { flexDirection: 'row', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  featuresSection: { marginTop: theme.spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  featureText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },
  offerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  monthlyLabel: { fontSize: 10, color: theme.colors.textSecondary },
  monthlyValue: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  applyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 6 },
});

