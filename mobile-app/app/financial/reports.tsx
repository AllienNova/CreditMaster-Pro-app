/**
 * Fynvita Financial Reports Screen
 * Generate and view financial reports
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'spending' | 'income' | 'net_worth' | 'tax' | 'budget' | 'custom';
  lastGenerated: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface SavedReport {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
}

const REPORT_TEMPLATES: Report[] = [
  { id: '1', name: 'Monthly Spending', description: 'Detailed breakdown of expenses by category', type: 'spending', lastGenerated: '2024-12-01', icon: 'cart' },
  { id: '2', name: 'Income Summary', description: 'All income sources and tax withholdings', type: 'income', lastGenerated: '2024-12-01', icon: 'cash' },
  { id: '3', name: 'Net Worth Statement', description: 'Assets, liabilities, and net worth trend', type: 'net_worth', lastGenerated: '2024-11-30', icon: 'stats-chart' },
  { id: '4', name: 'Tax Preparation', description: 'Income, deductions, and estimated taxes', type: 'tax', lastGenerated: '2024-11-15', icon: 'document-text' },
  { id: '5', name: 'Budget vs Actual', description: 'Compare budgeted vs actual spending', type: 'budget', lastGenerated: '2024-12-01', icon: 'pie-chart' },
  { id: '6', name: 'Custom Report', description: 'Build your own custom financial report', type: 'custom', lastGenerated: 'Never', icon: 'create' },
];

const SAVED_REPORTS: SavedReport[] = [
  { id: '1', name: 'November 2024 Spending', type: 'spending', date: '2024-12-01', size: '245 KB' },
  { id: '2', name: 'Q3 2024 Income Summary', type: 'income', date: '2024-10-01', size: '180 KB' },
  { id: '3', name: 'Net Worth Oct 2024', type: 'net_worth', date: '2024-11-01', size: '320 KB' },
  { id: '4', name: '2023 Tax Report', type: 'tax', date: '2024-03-15', size: '1.2 MB' },
];

const getTypeColor = (type: Report['type']): string => {
  const colors: Record<Report['type'], string> = {
    spending: '#EF4444', income: '#22C55E', net_worth: '#3B82F6', tax: '#8B5CF6', budget: '#F59E0B', custom: '#6B7280'
  };
  return colors[type];
};

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'templates' | 'saved'>('templates');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
          <TouchableOpacity>
            <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{REPORT_TEMPLATES.length}</Text>
              <Text style={styles.statLabel}>Templates</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{SAVED_REPORTS.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Dec 1</Text>
              <Text style={styles.statLabel}>Last Generated</Text>
            </View>
          </View>
        </Card>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity style={[styles.tab, activeTab === 'templates' && styles.tabActive]} onPress={() => setActiveTab('templates')}>
            <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'saved' && styles.tabActive]} onPress={() => setActiveTab('saved')}>
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Report Templates */}
        {activeTab === 'templates' && REPORT_TEMPLATES.map((report) => {
          const color = getTypeColor(report.type);
          return (
            <Card key={report.id} style={styles.reportCard}>
              <View style={styles.reportRow}>
                <View style={[styles.reportIcon, { backgroundColor: `${color}15` }]}>
                  <Ionicons name={report.icon} size={22} color={color} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportName}>{report.name}</Text>
                  <Text style={styles.reportDescription}>{report.description}</Text>
                  <Text style={styles.reportMeta}>Last: {report.lastGenerated}</Text>
                </View>
                <TouchableOpacity style={styles.generateButton}>
                  <Ionicons name="play" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {/* Saved Reports */}
        {activeTab === 'saved' && SAVED_REPORTS.map((report) => (
          <Card key={report.id} style={styles.savedCard}>
            <View style={styles.savedRow}>
              <View style={styles.savedIcon}>
                <Ionicons name="document" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.savedInfo}>
                <Text style={styles.savedName}>{report.name}</Text>
                <Text style={styles.savedMeta}>{report.date} • {report.size}</Text>
              </View>
              <View style={styles.savedActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="eye-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        {/* Export Options */}
        <Text style={styles.sectionTitle}>Export Options</Text>
        <View style={styles.exportGrid}>
          {[
            { icon: 'document-text', label: 'PDF', color: '#EF4444' },
            { icon: 'grid', label: 'Excel', color: '#22C55E' },
            { icon: 'code-slash', label: 'CSV', color: '#3B82F6' },
            { icon: 'print', label: 'Print', color: '#8B5CF6' },
          ].map((option) => (
            <TouchableOpacity key={option.label} style={styles.exportOption}>
              <View style={[styles.exportIcon, { backgroundColor: `${option.color}15` }]}>
                <Ionicons name={option.icon as keyof typeof Ionicons.glyphMap} size={24} color={option.color} />
              </View>
              <Text style={styles.exportLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  statsCard: { marginBottom: theme.spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  tabSelector: { flexDirection: 'row', marginBottom: theme.spacing.md },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 2, borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  reportCard: { marginBottom: theme.spacing.sm },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  reportIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reportInfo: { flex: 1 },
  reportName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  reportDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  reportMeta: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  generateButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  savedCard: { marginBottom: theme.spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center' },
  savedIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  savedInfo: { flex: 1 },
  savedName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  savedMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  savedActions: { flexDirection: 'row' },
  actionButton: { padding: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  exportOption: { width: '25%', alignItems: 'center', paddingHorizontal: 4, marginBottom: theme.spacing.md },
  exportIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  exportLabel: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
});

