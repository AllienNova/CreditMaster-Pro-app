/**
 * CPFI Credit Freeze Screen
 * Manage credit freezes at all bureaus
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Bureau {
  id: string;
  name: string;
  logo: string;
  freezeUrl: string;
  phone: string;
  isFrozen: boolean;
  lastUpdated: string;
}

const BUREAUS: Bureau[] = [
  { id: 'experian', name: 'Experian', logo: '🔵', freezeUrl: 'https://www.experian.com/freeze', phone: '1-888-397-3742', isFrozen: true, lastUpdated: '2024-01-15' },
  { id: 'equifax', name: 'Equifax', logo: '🔴', freezeUrl: 'https://www.equifax.com/personal/credit-report-services/credit-freeze/', phone: '1-800-685-1111', isFrozen: true, lastUpdated: '2024-01-15' },
  { id: 'transunion', name: 'TransUnion', logo: '🟢', freezeUrl: 'https://www.transunion.com/credit-freeze', phone: '1-888-909-8872', isFrozen: false, lastUpdated: '2024-01-10' },
];

const BENEFITS = [
  { icon: 'shield-checkmark', title: 'Prevents New Accounts', description: 'Stops identity thieves from opening credit in your name' },
  { icon: 'cash', title: 'Free by Law', description: 'Credit freezes are free at all three bureaus' },
  { icon: 'lock-closed', title: 'You Control Access', description: 'Temporarily lift when you need to apply for credit' },
  { icon: 'time', title: 'Stays Until You Remove', description: 'Freeze remains in place until you lift it' },
];

export default function CreditFreezeScreen() {
  const [bureauStatus, setBureauStatus] = useState<Record<string, boolean>>(
    BUREAUS.reduce((acc, b) => ({ ...acc, [b.id]: b.isFrozen }), {})
  );

  const frozenCount = Object.values(bureauStatus).filter(Boolean).length;
  const allFrozen = frozenCount === 3;

  const toggleFreeze = (bureauId: string) => {
    setBureauStatus(prev => ({ ...prev, [bureauId]: !prev[bureauId] }));
  };

  const openBureauSite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Freeze</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Card */}
        <Card style={[styles.statusCard, allFrozen ? styles.statusCardFrozen : styles.statusCardUnfrozen]}>
          <View style={styles.statusIcon}>
            <Ionicons name={allFrozen ? 'snow' : 'warning'} size={40} color={allFrozen ? '#3B82F6' : '#F59E0B'} />
          </View>
          <Text style={styles.statusTitle}>{allFrozen ? 'Fully Protected' : 'Partially Protected'}</Text>
          <Text style={styles.statusText}>{frozenCount} of 3 bureaus frozen</Text>
          {!allFrozen && <Text style={styles.statusWarning}>Freeze all bureaus for maximum protection</Text>}
        </Card>

        {/* Bureau Cards */}
        <Text style={styles.sectionTitle}>Credit Bureaus</Text>
        {BUREAUS.map((bureau) => (
          <Card key={bureau.id} style={styles.bureauCard}>
            <View style={styles.bureauRow}>
              <Text style={styles.bureauLogo}>{bureau.logo}</Text>
              <View style={styles.bureauInfo}>
                <Text style={styles.bureauName}>{bureau.name}</Text>
                <Text style={styles.bureauStatus}>{bureauStatus[bureau.id] ? '🔒 Frozen' : '🔓 Unfrozen'}</Text>
              </View>
              <Switch value={bureauStatus[bureau.id]} onValueChange={() => toggleFreeze(bureau.id)} trackColor={{ false: theme.colors.border, true: '#3B82F6' }} thumbColor="#fff" />
            </View>
            <View style={styles.bureauActions}>
              <TouchableOpacity style={styles.bureauAction} onPress={() => openBureauSite(bureau.freezeUrl)}>
                <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.bureauActionText}>Manage Online</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bureauAction} onPress={() => Linking.openURL(`tel:${bureau.phone}`)}>
                <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.bureauActionText}>{bureau.phone}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Benefits */}
        <Text style={styles.sectionTitle}>Why Freeze Your Credit?</Text>
        <View style={styles.benefitsGrid}>
          {BENEFITS.map((benefit, idx) => (
            <Card key={idx} style={styles.benefitCard}>
              <Ionicons name={benefit.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </Card>
          ))}
        </View>

        {/* FAQ */}
        <Card style={styles.faqCard}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Does a freeze affect my credit score?</Text>
            <Text style={styles.faqAnswer}>No, freezing your credit has no impact on your score.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I still use my existing cards?</Text>
            <Text style={styles.faqAnswer}>Yes, a freeze only prevents new accounts from being opened.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I apply for credit with a freeze?</Text>
            <Text style={styles.faqAnswer}>Temporarily lift the freeze at the relevant bureau before applying.</Text>
          </View>
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
  statusCard: { alignItems: 'center', marginBottom: theme.spacing.lg },
  statusCardFrozen: { backgroundColor: '#EFF6FF' },
  statusCardUnfrozen: { backgroundColor: '#FEF3C720' },
  statusIcon: { marginBottom: theme.spacing.sm },
  statusTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statusText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  statusWarning: { fontSize: 13, color: '#F59E0B', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  bureauCard: { marginBottom: theme.spacing.sm },
  bureauRow: { flexDirection: 'row', alignItems: 'center' },
  bureauLogo: { fontSize: 28, marginRight: 12 },
  bureauInfo: { flex: 1 },
  bureauName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  bureauStatus: { fontSize: 13, color: theme.colors.textSecondary },
  bureauActions: { flexDirection: 'row', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  bureauAction: { flexDirection: 'row', alignItems: 'center', marginRight: theme.spacing.lg },
  bureauActionText: { fontSize: 13, color: theme.colors.primary, marginLeft: 6 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: theme.spacing.md },
  benefitCard: { width: '48%', margin: '1%', alignItems: 'center', paddingVertical: theme.spacing.md },
  benefitTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center', marginTop: 8 },
  benefitDescription: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  faqCard: { marginTop: theme.spacing.md },
  faqTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  faqItem: { marginBottom: theme.spacing.md },
  faqQuestion: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  faqAnswer: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
});

