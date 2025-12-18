/**
 * CPFI Marketplace Dashboard
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

export default function MarketplaceScreen() {
  const services = [
    { icon: 'card', title: 'Secured Cards', subtitle: 'Build credit with secured cards', route: '/marketplace/secured-cards' },
    { icon: 'eye', title: 'Monitoring Services', subtitle: 'Credit monitoring options', route: '/marketplace/monitoring-services' },
    { icon: 'school', title: 'Credit Education', subtitle: 'Courses and guides', route: '/marketplace/education' },
    { icon: 'briefcase', title: 'Credit Attorneys', subtitle: 'Legal assistance', route: '/marketplace/attorneys' },
    { icon: 'people', title: 'Community', subtitle: 'Forums and discussions', route: '/marketplace/community' },
    { icon: 'construct', title: 'Credit Services', subtitle: 'Professional services', route: '/marketplace/services' },
    { icon: 'calculator', title: 'Calculators', subtitle: 'Financial calculators', route: '/marketplace/calculators' },
    { icon: 'trending-up', title: 'Tradelines', subtitle: 'Authorized user tradelines', route: '/marketplace/tradelines' },
    { icon: 'person', title: 'Credit Coaching', subtitle: '1-on-1 coaching', route: '/marketplace/coaching' },
    { icon: 'git-merge', title: 'Debt Consolidation', subtitle: 'Consolidation options', route: '/marketplace/consolidation' },
    { icon: 'analytics', title: 'Credit Analysis', subtitle: 'Professional analysis', route: '/marketplace/analysis' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Products and services to help your credit journey</Text>
        </View>

        {/* Services Grid */}
        <View style={styles.servicesSection}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceItem}
              onPress={() => router.push(service.route as never)}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={service.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.xl },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  servicesSection: { marginTop: theme.spacing.md },
  serviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  serviceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  serviceContent: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  serviceSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});

