/**
 * Fynvita Admin Feature Flags Screen
 * Manage feature flags and A/B tests
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface FeatureFlag { id: string; name: string; description: string; enabled: boolean; rollout: number; type: 'release' | 'experiment' | 'ops'; }

const FEATURES: FeatureFlag[] = [
  { id: 'ff-001', name: 'ai_dispute_v2', description: 'New AI dispute generation engine', enabled: true, rollout: 100, type: 'release' },
  { id: 'ff-002', name: 'dark_mode', description: 'Dark mode theme support', enabled: true, rollout: 50, type: 'experiment' },
  { id: 'ff-003', name: 'instant_reports', description: 'Instant credit report generation', enabled: false, rollout: 0, type: 'release' },
  { id: 'ff-004', name: 'new_onboarding', description: 'Redesigned onboarding flow', enabled: true, rollout: 25, type: 'experiment' },
  { id: 'ff-005', name: 'batch_processing', description: 'Batch dispute processing', enabled: true, rollout: 100, type: 'ops' },
  { id: 'ff-006', name: 'social_sharing', description: 'Share achievements on social media', enabled: false, rollout: 0, type: 'release' },
];

export default function AdminFeaturesScreen() {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState(FEATURES);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'release': return theme.colors.success;
      case 'experiment': return theme.colors.warning;
      case 'ops': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading feature flags...</Text>
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
            <Text style={styles.title}>Feature Flags</Text>
            <Text style={styles.subtitle}>Manage releases & experiments</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{features.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.success}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>{features.filter(f => f.enabled).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.warning}10` }]}>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>{features.filter(f => f.type === 'experiment').length}</Text>
            <Text style={styles.statLabel}>Experiments</Text>
          </Card>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {features.map((feature) => (
            <Card key={feature.id} style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>{feature.name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(feature.type)}15` }]}>
                    <Text style={[styles.typeText, { color: getTypeColor(feature.type) }]}>{feature.type}</Text>
                  </View>
                </View>
                <Switch
                  value={feature.enabled}
                  onValueChange={() => toggleFeature(feature.id)}
                  trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}80` }}
                  thumbColor={feature.enabled ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
              <Text style={styles.featureDesc}>{feature.description}</Text>
              <View style={styles.rolloutRow}>
                <Text style={styles.rolloutLabel}>Rollout</Text>
                <View style={styles.rolloutBar}>
                  <View style={[styles.rolloutFill, { width: `${feature.rollout}%` }]} />
                </View>
                <Text style={styles.rolloutPercent}>{feature.rollout}%</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.tipsTitle}> Feature Flag Types</Text>
          </View>
          <Text style={styles.tipText}>• <Text style={{ color: theme.colors.success }}>Release</Text>: Gradual feature rollouts</Text>
          <Text style={styles.tipText}>• <Text style={{ color: theme.colors.warning }}>Experiment</Text>: A/B testing features</Text>
          <Text style={styles.tipText}>• <Text style={{ color: theme.colors.primary }}>Ops</Text>: Operational toggles</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  addButton: { width: 40, height: 40, backgroundColor: theme.colors.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  featuresList: { paddingHorizontal: theme.spacing.lg },
  featureCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  featureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  featureName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  featureDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 },
  rolloutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  rolloutLabel: { fontSize: 12, color: theme.colors.textSecondary, width: 50 },
  rolloutBar: { flex: 1, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, marginHorizontal: 8 },
  rolloutFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 3 },
  rolloutPercent: { fontSize: 12, fontWeight: '600', color: theme.colors.text, width: 40, textAlign: 'right' },
  tipsCard: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.lg, padding: theme.spacing.md },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
});

