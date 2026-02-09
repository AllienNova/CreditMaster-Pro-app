/**
 * Fynvita Credit Cards Screen
 * Credit card recommendations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface CreditCard { id: string; name: string; issuer: string; type: 'secured' | 'rewards' | 'cashback' | 'travel'; apr: string; annualFee: number; approval: 'excellent' | 'good' | 'fair'; }

const CARDS: CreditCard[] = [
  { id: '1', name: 'Discover it Secured', issuer: 'Discover', type: 'secured', apr: '28.24%', annualFee: 0, approval: 'excellent' },
  { id: '2', name: 'Capital One Quicksilver', issuer: 'Capital One', type: 'cashback', apr: '19.99%-29.99%', annualFee: 0, approval: 'good' },
  { id: '3', name: 'Chase Sapphire Preferred', issuer: 'Chase', type: 'travel', apr: '21.49%-28.49%', annualFee: 95, approval: 'fair' },
  { id: '4', name: 'Citi Double Cash', issuer: 'Citi', type: 'cashback', apr: '18.99%-28.99%', annualFee: 0, approval: 'good' },
];

export default function CardsScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const getApprovalColor = (approval: string) => {
    switch (approval) {
      case 'excellent': return theme.colors.success;
      case 'good': return theme.colors.warning;
      case 'fair': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredCards = filter ? CARDS.filter(c => c.type === filter) : CARDS;

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
            <Text style={styles.title}>Credit Cards</Text>
            <Text style={styles.subtitle}>Personalized recommendations</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'secured', 'cashback', 'rewards', 'travel'].map((type) => (
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

        {/* Cards List */}
        <View style={styles.cardsList}>
          {filteredCards.map((card) => (
            <Card key={card.id} style={styles.cardItem}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="card" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardIssuer}>{card.issuer}</Text>
                </View>
                <View style={[styles.approvalBadge, { backgroundColor: `${getApprovalColor(card.approval)}15` }]}>
                  <Text style={[styles.approvalText, { color: getApprovalColor(card.approval) }]}>{card.approval}</Text>
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>APR</Text><Text style={styles.detailValue}>{card.apr}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Annual Fee</Text><Text style={styles.detailValue}>${card.annualFee}</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{card.type}</Text></View>
              </View>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyText}>Check Eligibility</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  cardsList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  cardItem: { marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIcon: { width: 48, height: 48, backgroundColor: `${theme.colors.primary}10`, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  cardIssuer: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  approvalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  approvalText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  applyButton: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  applyText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

