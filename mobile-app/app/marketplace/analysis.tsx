/**
 * CPFI Credit Analysis Marketplace Screen
 * Professional credit analysis services
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface AnalysisPackage {
  id: string;
  name: string;
  description: string;
  price: string;
  turnaround: string;
  features: string[];
  popular: boolean;
}

const PACKAGES: AnalysisPackage[] = [
  { id: '1', name: 'Basic Analysis', description: 'Essential credit report review', price: '$49', turnaround: '24 hours', features: ['Single bureau analysis', 'Error identification', 'Basic recommendations', 'PDF report'], popular: false },
  { id: '2', name: 'Comprehensive Analysis', description: 'Full 3-bureau deep dive', price: '$149', turnaround: '48 hours', features: ['All 3 bureau analysis', 'Detailed error report', 'Dispute strategy', 'Score improvement plan', 'Phone consultation'], popular: true },
  { id: '3', name: 'Expert Analysis', description: 'Premium analysis with ongoing support', price: '$299', turnaround: '72 hours', features: ['3-bureau analysis', 'Legal review', 'Custom dispute letters', '90-day support', 'Score guarantee'], popular: false },
];

export default function AnalysisScreen() {
  const handleSelectPackage = (pkg: AnalysisPackage) => {
    router.push('/settings/billing');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <Ionicons name="analytics" size={40} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>Professional Credit Analysis</Text>
          <Text style={styles.heroText}>Get expert insights into your credit report and a personalized plan to improve your score.</Text>
        </Card>

        {/* What's Included */}
        <Text style={styles.sectionTitle}>What's Included</Text>
        <View style={styles.includedGrid}>
          {[
            { icon: 'document-text', title: 'Report Review', desc: 'Line-by-line analysis' },
            { icon: 'search', title: 'Error Detection', desc: 'Find disputable items' },
            { icon: 'map', title: 'Action Plan', desc: 'Step-by-step guide' },
            { icon: 'chatbubbles', title: 'Expert Support', desc: 'Q&A with analysts' },
          ].map((item, idx) => (
            <View key={idx} style={styles.includedItem}>
              <View style={styles.includedIcon}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.includedTitle}>{item.title}</Text>
              <Text style={styles.includedDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Packages */}
        <Text style={styles.sectionTitle}>Choose Your Package</Text>
        {PACKAGES.map((pkg) => (
          <Card key={pkg.id} style={[styles.packageCard, pkg.popular && styles.popularCard]}>
            {pkg.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>Most Popular</Text></View>}
            <View style={styles.packageHeader}>
              <View>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.packagePrice}>{pkg.price}</Text>
                <Text style={styles.turnaround}>{pkg.turnaround}</Text>
              </View>
            </View>

            <View style={styles.featuresSection}>
              {pkg.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.selectButton, pkg.popular && styles.selectButtonPrimary]} onPress={() => handleSelectPackage(pkg)}>
              <Text style={[styles.selectButtonText, pkg.popular && styles.selectButtonTextPrimary]}>Select Package</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Guarantee */}
        <Card style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
          <View style={styles.guaranteeContent}>
            <Text style={styles.guaranteeTitle}>Satisfaction Guaranteed</Text>
            <Text style={styles.guaranteeText}>If you're not satisfied with your analysis, we'll refund your purchase within 7 days.</Text>
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
  heroCard: { alignItems: 'center', paddingVertical: theme.spacing.xl, marginBottom: theme.spacing.lg },
  heroTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md },
  heroText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: theme.spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  includedGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.lg },
  includedItem: { width: '48%', backgroundColor: theme.colors.surface, borderRadius: 12, padding: theme.spacing.md, margin: '1%', alignItems: 'center' },
  includedIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  includedTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  includedDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  packageCard: { marginBottom: theme.spacing.md },
  popularCard: { borderWidth: 2, borderColor: theme.colors.primary },
  popularBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  popularText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  packageName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  packageDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  priceContainer: { alignItems: 'flex-end' },
  packagePrice: { fontSize: 24, fontWeight: '700', color: theme.colors.primary },
  turnaround: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  featuresSection: { paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  featureText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  selectButton: { marginTop: theme.spacing.sm, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center' },
  selectButtonPrimary: { backgroundColor: theme.colors.primary },
  selectButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  selectButtonTextPrimary: { color: '#fff' },
  guaranteeCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: theme.spacing.md },
  guaranteeContent: { flex: 1, marginLeft: 12 },
  guaranteeTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  guaranteeText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
});

