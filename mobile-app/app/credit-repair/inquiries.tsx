/**
 * CPFI Inquiry Removal Screen
 * Remove hard inquiries from credit report
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Inquiry { id: string; creditor: string; date: string; bureau: string; removable: boolean; }

const INQUIRIES: Inquiry[] = [
  { id: '1', creditor: 'Chase Bank', date: '2024-11-15', bureau: 'Experian', removable: true },
  { id: '2', creditor: 'Capital One', date: '2024-10-20', bureau: 'TransUnion', removable: true },
  { id: '3', creditor: 'Discover', date: '2024-09-05', bureau: 'Equifax', removable: false },
  { id: '4', creditor: 'American Express', date: '2024-08-12', bureau: 'Experian', removable: true },
  { id: '5', creditor: 'Wells Fargo', date: '2024-06-30', bureau: 'TransUnion', removable: false },
];

export default function InquiriesScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const handleDispute = (inquiry: Inquiry) => {
    Alert.alert('Dispute Inquiry', `File a dispute for ${inquiry.creditor} inquiry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dispute', onPress: () => Alert.alert('Success', 'Dispute filed successfully') },
    ]);
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
            <Text style={styles.title}>Hard Inquiries</Text>
            <Text style={styles.subtitle}>Manage credit inquiries</Text>
          </View>
        </View>

        {/* Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{INQUIRIES.length}</Text>
              <Text style={styles.infoLabel}>Total Inquiries</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: theme.colors.success }]}>{INQUIRIES.filter(i => i.removable).length}</Text>
              <Text style={styles.infoLabel}>Removable</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: theme.colors.error }]}>-{INQUIRIES.length * 5}</Text>
              <Text style={styles.infoLabel}>Score Impact</Text>
            </View>
          </View>
        </Card>

        {/* Tip */}
        <Card style={styles.tipCard}>
          <Ionicons name="bulb" size={18} color={theme.colors.warning} />
          <Text style={styles.tipText}>Hard inquiries fall off your credit report after 2 years. Unauthorized inquiries can be disputed immediately.</Text>
        </Card>

        {/* Inquiries List */}
        <View style={styles.inquiriesList}>
          <Text style={styles.sectionTitle}>Your Inquiries</Text>
          {INQUIRIES.map((inquiry) => (
            <Card key={inquiry.id} style={styles.inquiryCard}>
              <View style={styles.inquiryHeader}>
                <View style={styles.inquiryIcon}>
                  <Ionicons name="search" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.inquiryInfo}>
                  <Text style={styles.inquiryCreditor}>{inquiry.creditor}</Text>
                  <View style={styles.inquiryMeta}>
                    <Text style={styles.inquiryDate}>{inquiry.date}</Text>
                    <Text style={styles.inquiryBureau}>• {inquiry.bureau}</Text>
                  </View>
                </View>
                {inquiry.removable ? (
                  <TouchableOpacity style={styles.disputeButton} onPress={() => handleDispute(inquiry)}>
                    <Text style={styles.disputeText}>Dispute</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.validBadge}>
                    <Text style={styles.validText}>Valid</Text>
                  </View>
                )}
              </View>
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
  infoCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, alignItems: 'center' },
  infoValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  infoLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  infoDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  tipCard: { flexDirection: 'row', marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.md, backgroundColor: `${theme.colors.warning}10` },
  tipText: { flex: 1, fontSize: 12, color: theme.colors.text, marginLeft: 8, lineHeight: 18 },
  inquiriesList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  inquiryCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  inquiryHeader: { flexDirection: 'row', alignItems: 'center' },
  inquiryIcon: { width: 40, height: 40, backgroundColor: `${theme.colors.primary}10`, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  inquiryInfo: { flex: 1, marginLeft: 12 },
  inquiryCreditor: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  inquiryMeta: { flexDirection: 'row', marginTop: 2 },
  inquiryDate: { fontSize: 12, color: theme.colors.textSecondary },
  inquiryBureau: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  disputeButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  disputeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  validBadge: { backgroundColor: `${theme.colors.textSecondary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  validText: { fontSize: 12, color: theme.colors.textSecondary },
});

