/**
 * Fynvita Credit Card Recommendations Screen
 * Personalized card offers with approval likelihood and rewards comparison
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  type: 'cashback' | 'travel' | 'rewards' | 'secured' | 'balance_transfer';
  annualFee: number;
  apr: string;
  signupBonus: string;
  rewards: string[];
  approvalOdds: number;
  creditNeeded: string;
  featured: boolean;
}

const CREDIT_CARDS: CreditCard[] = [
  { id: '1', name: 'Chase Freedom Unlimited', issuer: 'Chase', type: 'cashback', annualFee: 0, apr: '20.49% - 29.24%', signupBonus: '$200 after $500 spend', rewards: ['1.5% on everything', '5% on travel via Chase', '3% on dining'], approvalOdds: 85, creditNeeded: 'Good (670+)', featured: true },
  { id: '2', name: 'Citi Double Cash', issuer: 'Citi', type: 'cashback', annualFee: 0, apr: '19.24% - 29.24%', signupBonus: '$200 after $1,500 spend', rewards: ['2% on everything (1% + 1%)', 'No categories to track'], approvalOdds: 78, creditNeeded: 'Good (670+)', featured: false },
  { id: '3', name: 'Capital One Venture X', issuer: 'Capital One', type: 'travel', annualFee: 395, apr: '21.24% - 28.24%', signupBonus: '75,000 miles after $4,000 spend', rewards: ['2X miles on everything', '10X on hotels via Capital One', 'Priority Pass lounge access'], approvalOdds: 65, creditNeeded: 'Excellent (740+)', featured: true },
  { id: '4', name: 'Discover it Secured', issuer: 'Discover', type: 'secured', annualFee: 0, apr: '28.24%', signupBonus: 'Cashback Match first year', rewards: ['2% at restaurants & gas', '1% on everything else', 'Free FICO score'], approvalOdds: 95, creditNeeded: 'Building/Fair', featured: false },
  { id: '5', name: 'Citi Simplicity', issuer: 'Citi', type: 'balance_transfer', annualFee: 0, apr: '19.24% - 29.99%', signupBonus: '0% APR for 21 months', rewards: ['No late fees ever', '0% intro APR on transfers', 'No penalty APR'], approvalOdds: 72, creditNeeded: 'Good (670+)', featured: false },
  { id: '6', name: 'Amex Blue Cash Preferred', issuer: 'American Express', type: 'cashback', annualFee: 95, apr: '19.24% - 29.99%', signupBonus: '$350 after $3,000 spend', rewards: ['6% at US supermarkets', '6% on streaming', '3% on transit'], approvalOdds: 70, creditNeeded: 'Good (670+)', featured: true },
];

const CARD_TYPES = [
  { id: 'all', label: 'All Cards' },
  { id: 'cashback', label: 'Cash Back' },
  { id: 'travel', label: 'Travel' },
  { id: 'secured', label: 'Secured' },
  { id: 'balance_transfer', label: 'Balance Transfer' },
];

export default function CreditCardsScreen() {
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'approval' | 'rewards'>('approval');
  
  const filteredCards = selectedType === 'all' ? CREDIT_CARDS : CREDIT_CARDS.filter(c => c.type === selectedType);
  const sortedCards = [...filteredCards].sort((a, b) => sortBy === 'approval' ? b.approvalOdds - a.approvalOdds : 0);

  const getApprovalColor = (odds: number) => {
    if (odds >= 80) return '#22C55E';
    if (odds >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cashback': return 'Cash Back';
      case 'travel': return 'Travel';
      case 'secured': return 'Secured';
      case 'balance_transfer': return 'Balance Transfer';
      default: return 'Rewards';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Cards</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Match Summary */}
        <Card style={styles.matchCard}>
          <View style={styles.matchIcon}>
            <Ionicons name="sparkles" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.matchTitle}>Matched for Your Profile</Text>
          <Text style={styles.matchText}>Based on your credit score of 720, we found {CREDIT_CARDS.length} cards you may qualify for</Text>
        </Card>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {CARD_TYPES.map((type) => (
            <TouchableOpacity key={type.id} style={[styles.filterChip, selectedType === type.id && styles.filterChipActive]} onPress={() => setSelectedType(type.id)}>
              <Text style={[styles.filterChipText, selectedType === type.id && styles.filterChipTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Options */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity style={[styles.sortButton, sortBy === 'approval' && styles.sortButtonActive]} onPress={() => setSortBy('approval')}>
            <Text style={[styles.sortButtonText, sortBy === 'approval' && styles.sortButtonTextActive]}>Approval Odds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortButton, sortBy === 'rewards' && styles.sortButtonActive]} onPress={() => setSortBy('rewards')}>
            <Text style={[styles.sortButtonText, sortBy === 'rewards' && styles.sortButtonTextActive]}>Best Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Cards List */}
        {sortedCards.map((card) => (
          <Card key={card.id} style={[styles.cardItem, card.featured && styles.cardItemFeatured]}>
            {card.featured && <View style={styles.featuredBadge}><Text style={styles.featuredText}>TOP PICK</Text></View>}
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.cardIssuer}>{card.issuer} • {getTypeLabel(card.type)}</Text>
              </View>
              <View style={[styles.approvalBadge, { backgroundColor: `${getApprovalColor(card.approvalOdds)}15` }]}>
                <Text style={[styles.approvalText, { color: getApprovalColor(card.approvalOdds) }]}>{card.approvalOdds}%</Text>
                <Text style={styles.approvalLabel}>odds</Text>
              </View>
            </View>
            <View style={styles.cardDetails}>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Annual Fee</Text><Text style={styles.detailValue}>${card.annualFee}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>APR</Text><Text style={styles.detailValue}>{card.apr.split(' - ')[0]}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Credit Needed</Text><Text style={styles.detailValue}>{card.creditNeeded.split(' ')[0]}</Text></View>
            </View>
            <View style={styles.bonusRow}>
              <Ionicons name="gift" size={16} color="#8B5CF6" />
              <Text style={styles.bonusText}>{card.signupBonus}</Text>
            </View>
            <View style={styles.rewardsSection}>
              {card.rewards.slice(0, 2).map((reward, idx) => (
                <View key={idx} style={styles.rewardItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                  <Text style={styles.rewardText}>{reward}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
              <Ionicons name="open-outline" size={16} color="#fff" />
            </TouchableOpacity>
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
  matchCard: { alignItems: 'center', marginBottom: theme.spacing.lg, backgroundColor: '#F5F3FF' },
  matchIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  matchTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  matchText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  sortLabel: { fontSize: 13, color: theme.colors.textSecondary, marginRight: 8 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface, marginRight: 8 },
  sortButtonActive: { backgroundColor: `${theme.colors.primary}20` },
  sortButtonText: { fontSize: 12, color: theme.colors.textSecondary },
  sortButtonTextActive: { color: theme.colors.primary, fontWeight: '600' },
  cardItem: { marginBottom: theme.spacing.md, position: 'relative' },
  cardItemFeatured: { borderWidth: 2, borderColor: '#8B5CF6' },
  featuredBadge: { position: 'absolute', top: -1, right: 16, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  featuredText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardIssuer: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  approvalBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  approvalText: { fontSize: 18, fontWeight: '700' },
  approvalLabel: { fontSize: 10, color: theme.colors.textSecondary },
  cardDetails: { flexDirection: 'row', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, backgroundColor: '#F5F3FF', padding: 10, borderRadius: 8 },
  bonusText: { fontSize: 13, color: '#8B5CF6', fontWeight: '500', marginLeft: 8 },
  rewardsSection: { marginTop: theme.spacing.sm },
  rewardItem: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rewardText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 6 },
});

