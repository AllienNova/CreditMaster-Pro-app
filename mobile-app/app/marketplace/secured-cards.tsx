/**
 * CPFI Secured Cards Marketplace Screen
 * Browse and compare secured credit cards
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface SecuredCard {
  id: string;
  name: string;
  issuer: string;
  annualFee: number;
  deposit: string;
  apr: string;
  features: string[];
  rating: number;
  approvalOdds: 'High' | 'Medium' | 'Low';
}

const SECURED_CARDS: SecuredCard[] = [
  { id: '1', name: 'Discover it® Secured', issuer: 'Discover', annualFee: 0, deposit: '$200-$2,500', apr: '28.24%', features: ['2% cash back at restaurants & gas', 'No annual fee', 'Free FICO score'], rating: 4.8, approvalOdds: 'High' },
  { id: '2', name: 'Capital One Platinum Secured', issuer: 'Capital One', annualFee: 0, deposit: '$49-$200', apr: '30.74%', features: ['Low deposit option', 'No annual fee', 'Credit line increase possible'], rating: 4.5, approvalOdds: 'High' },
  { id: '3', name: 'Chime Credit Builder', issuer: 'Chime', annualFee: 0, deposit: 'No deposit', apr: '0%', features: ['No credit check', 'No interest', 'Reports to all 3 bureaus'], rating: 4.7, approvalOdds: 'High' },
  { id: '4', name: 'OpenSky® Secured Visa®', issuer: 'OpenSky', annualFee: 35, deposit: '$200-$3,000', apr: '22.64%', features: ['No credit check', 'Reports to all 3 bureaus', 'Choose your credit limit'], rating: 4.2, approvalOdds: 'High' },
];

const getOddsColor = (odds: SecuredCard['approvalOdds']): string => {
  const colors = { High: '#22C55E', Medium: '#F59E0B', Low: '#EF4444' };
  return colors[odds];
};

export default function SecuredCardsScreen() {
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'apr'>('rating');

  const sortedCards = [...SECURED_CARDS].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'fee') return a.annualFee - b.annualFee;
    return parseFloat(a.apr) - parseFloat(b.apr);
  });

  const handleApply = (card: SecuredCard) => {
    Linking.openURL(`https://www.${card.issuer.toLowerCase().replace(' ', '')}.com`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Secured Cards</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>Secured cards require a refundable deposit and help build credit with responsible use.</Text>
        </Card>

        {/* Sort Options */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {(['rating', 'fee', 'apr'] as const).map((option) => (
            <TouchableOpacity key={option} style={[styles.sortChip, sortBy === option && styles.sortChipActive]} onPress={() => setSortBy(option)}>
              <Text style={[styles.sortText, sortBy === option && styles.sortTextActive]}>{option === 'fee' ? 'Fee' : option === 'apr' ? 'APR' : 'Rating'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cards List */}
        {sortedCards.map((card) => (
          <Card key={card.id} style={styles.cardItem}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.cardIssuer}>{card.issuer}</Text>
              </View>
              <View style={[styles.oddsBadge, { backgroundColor: `${getOddsColor(card.approvalOdds)}15` }]}>
                <Text style={[styles.oddsText, { color: getOddsColor(card.approvalOdds) }]}>{card.approvalOdds} Approval</Text>
              </View>
            </View>

            <View style={styles.cardStats}>
              <View style={styles.statItem}><Text style={styles.statLabel}>Annual Fee</Text><Text style={styles.statValue}>${card.annualFee}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>Deposit</Text><Text style={styles.statValue}>{card.deposit}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>APR</Text><Text style={styles.statValue}>{card.apr}</Text></View>
            </View>

            <View style={styles.featuresSection}>
              {card.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{card.rating}</Text>
              </View>
              <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(card)}>
                <Text style={styles.applyButtonText}>Apply Now</Text>
                <Ionicons name="open-outline" size={16} color="#fff" />
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
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${theme.colors.primary}10`, marginBottom: theme.spacing.md },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 10, lineHeight: 18 },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  sortLabel: { fontSize: 13, color: theme.colors.textSecondary, marginRight: 8 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  sortChipActive: { backgroundColor: theme.colors.primary },
  sortText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  sortTextActive: { color: '#fff' },
  cardItem: { marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  cardName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardIssuer: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  oddsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  oddsText: { fontSize: 11, fontWeight: '600' },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  featuresSection: { marginTop: theme.spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  featureText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginLeft: 4 },
  applyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 6 },
});

