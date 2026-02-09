/**
 * Fynvita Admin System Configuration Screen
 * System settings and configuration management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface ConfigItem { key: string; label: string; value: string | boolean | number; type: 'text' | 'boolean' | 'number'; category: string; }

const CONFIG_ITEMS: ConfigItem[] = [
  { key: 'maintenance_mode', label: 'Maintenance Mode', value: false, type: 'boolean', category: 'System' },
  { key: 'signup_enabled', label: 'User Signup Enabled', value: true, type: 'boolean', category: 'System' },
  { key: 'rate_limit', label: 'API Rate Limit (req/min)', value: 100, type: 'number', category: 'Security' },
  { key: 'session_timeout', label: 'Session Timeout (hours)', value: 24, type: 'number', category: 'Security' },
  { key: 'email_verification', label: 'Email Verification Required', value: true, type: 'boolean', category: 'Security' },
  { key: '2fa_required', label: '2FA Required for Admin', value: true, type: 'boolean', category: 'Security' },
  { key: 'dispute_auto_process', label: 'Auto-process Disputes', value: false, type: 'boolean', category: 'Features' },
  { key: 'ai_analysis_enabled', label: 'AI Analysis Enabled', value: true, type: 'boolean', category: 'Features' },
  { key: 'max_disputes_per_day', label: 'Max Disputes/Day', value: 10, type: 'number', category: 'Limits' },
  { key: 'max_file_size_mb', label: 'Max Upload Size (MB)', value: 25, type: 'number', category: 'Limits' },
];

export default function AdminConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState(CONFIG_ITEMS);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const toggleBoolConfig = (key: string) => {
    setConfigs(configs.map(c => c.key === key ? { ...c, value: !c.value } : c));
  };

  const categories = [...new Set(configs.map(c => c.category))];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading configuration...</Text>
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
            <Text style={styles.title}>System Config</Text>
            <Text style={styles.subtitle}>Manage system settings</Text>
          </View>
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {categories.map((category) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <Card style={styles.configCard}>
              {configs.filter(c => c.category === category).map((config, i, arr) => (
                <View key={config.key} style={[styles.configItem, i < arr.length - 1 && styles.configItemBorder]}>
                  <View style={styles.configInfo}>
                    <Text style={styles.configLabel}>{config.label}</Text>
                    {config.type === 'number' && (
                      <Text style={styles.configValue}>{config.value}</Text>
                    )}
                  </View>
                  {config.type === 'boolean' && (
                    <Switch
                      value={config.value as boolean}
                      onValueChange={() => toggleBoolConfig(config.key)}
                      trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}80` }}
                      thumbColor={config.value ? theme.colors.primary : '#f4f3f4'}
                    />
                  )}
                  {config.type === 'number' && (
                    <View style={styles.numberControls}>
                      <TouchableOpacity style={styles.numberBtn}><Text style={styles.numberBtnText}>-</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.numberBtn}><Text style={styles.numberBtnText}>+</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Warning */}
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <Text style={styles.warningTitle}> Important</Text>
          </View>
          <Text style={styles.warningText}>Changes to system configuration may affect all users. Please test in staging before applying to production.</Text>
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
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  configCard: { padding: 0, overflow: 'hidden' },
  configItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  configItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  configInfo: { flex: 1 },
  configLabel: { fontSize: 14, color: theme.colors.text },
  configValue: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  numberControls: { flexDirection: 'row' },
  numberBtn: { width: 32, height: 32, backgroundColor: theme.colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  numberBtnText: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  warningCard: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: `${theme.colors.warning}10` },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  warningTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.warning },
  warningText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
});

