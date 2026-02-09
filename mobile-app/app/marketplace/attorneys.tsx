/**
 * Fynvita Credit Attorneys Marketplace Screen
 * Find credit repair attorneys
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Attorney {
  id: string;
  name: string;
  firm: string;
  specialty: string;
  rating: number;
  reviews: number;
  location: string;
  freeConsult: boolean;
  phone: string;
}

const ATTORNEYS: Attorney[] = [
  { id: '1', name: 'James Wilson', firm: 'Wilson Credit Law', specialty: 'FCRA Violations', rating: 4.9, reviews: 127, location: 'Los Angeles, CA', freeConsult: true, phone: '+18001234567' },
  { id: '2', name: 'Sarah Martinez', firm: 'Consumer Rights Legal', specialty: 'Debt Collection', rating: 4.8, reviews: 89, location: 'New York, NY', freeConsult: true, phone: '+18001234568' },
  { id: '3', name: 'Michael Chen', firm: 'Chen & Associates', specialty: 'Credit Repair', rating: 4.7, reviews: 156, location: 'Chicago, IL', freeConsult: false, phone: '+18001234569' },
  { id: '4', name: 'Emily Thompson', firm: 'Thompson Law Group', specialty: 'Identity Theft', rating: 4.9, reviews: 203, location: 'Houston, TX', freeConsult: true, phone: '+18001234570' },
];

export default function AttorneysScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAttorneys = ATTORNEYS.filter(attorney =>
    attorney.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attorney.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attorney.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Attorneys</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>These attorneys specialize in consumer credit law and can help with FCRA violations, debt collection harassment, and more.</Text>
        </Card>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search by name, specialty, or location..." placeholderTextColor={theme.colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Attorneys List */}
        {filteredAttorneys.map((attorney) => (
          <Card key={attorney.id} style={styles.attorneyCard}>
            <View style={styles.attorneyHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{attorney.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.attorneyInfo}>
                <Text style={styles.attorneyName}>{attorney.name}</Text>
                <Text style={styles.attorneyFirm}>{attorney.firm}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{attorney.rating}</Text>
                  <Text style={styles.reviewsText}>({attorney.reviews} reviews)</Text>
                </View>
              </View>
              {attorney.freeConsult && (
                <View style={styles.freeBadge}><Text style={styles.freeText}>Free Consult</Text></View>
              )}
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="briefcase" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{attorney.specialty}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{attorney.location}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.callButton} onPress={() => handleCall(attorney.phone)}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.callButtonText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <Ionicons name="mail" size={18} color={theme.colors.primary} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {filteredAttorneys.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No attorneys found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        )}

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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: theme.spacing.md },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, marginLeft: 8 },
  attorneyCard: { marginBottom: theme.spacing.md },
  attorneyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  attorneyInfo: { flex: 1 },
  attorneyName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  attorneyFirm: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginLeft: 4 },
  reviewsText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  freeBadge: { backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  freeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 6 },
  actionsRow: { flexDirection: 'row', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  callButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8, marginRight: 8 },
  callButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 6 },
  messageButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8 },
  messageButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginLeft: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
});

