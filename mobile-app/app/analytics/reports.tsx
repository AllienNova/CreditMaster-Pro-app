/**
 * Fynvita Analytics Reports Screen
 * Generate and view detailed analytics reports
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  estimatedTime: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  generatedAt: string;
  size: string;
  type: 'pdf' | 'excel' | 'csv';
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: '1', name: 'Credit Score Summary', description: 'Complete credit score analysis with trends', icon: 'speedometer', estimatedTime: '2 min' },
  { id: '2', name: 'Dispute History', description: 'All disputes with outcomes and timelines', icon: 'document-text', estimatedTime: '1 min' },
  { id: '3', name: 'Financial Overview', description: 'Assets, liabilities, and net worth analysis', icon: 'wallet', estimatedTime: '3 min' },
  { id: '4', name: 'Credit Utilization', description: 'Detailed utilization breakdown by account', icon: 'pie-chart', estimatedTime: '1 min' },
  { id: '5', name: 'Payment History', description: 'Complete payment history across all accounts', icon: 'calendar', estimatedTime: '2 min' },
];

const GENERATED_REPORTS: GeneratedReport[] = [
  { id: '1', name: 'Credit Score Summary - Dec 2024', generatedAt: 'Dec 1, 2024', size: '2.4 MB', type: 'pdf' },
  { id: '2', name: 'Dispute History - Q4 2024', generatedAt: 'Nov 15, 2024', size: '1.8 MB', type: 'pdf' },
  { id: '3', name: 'Financial Overview - Nov 2024', generatedAt: 'Nov 1, 2024', size: '3.2 MB', type: 'excel' },
];

const getTypeIcon = (type: GeneratedReport['type']): keyof typeof Ionicons.glyphMap => {
  const icons: Record<GeneratedReport['type'], keyof typeof Ionicons.glyphMap> = {
    pdf: 'document', excel: 'grid', csv: 'list'
  };
  return icons[type];
};

const getTypeColor = (type: GeneratedReport['type']): string => {
  const colors: Record<GeneratedReport['type'], string> = {
    pdf: '#EF4444', excel: '#22C55E', csv: '#3B82F6'
  };
  return colors[type];
};

export default function AnalyticsReportsScreen() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (template: ReportTemplate) => {
    setGenerating(template.id);
    Alert.alert('Generating Report', `${template.name} will be ready in approximately ${template.estimatedTime}.`);
    setTimeout(() => setGenerating(null), 2000);
  };

  const handleDownload = (report: GeneratedReport) => {
    Alert.alert('Download', `Downloading ${report.name}...`);
  };

  const handleShare = (report: GeneratedReport) => {
    Alert.alert('Share', `Share ${report.name}?`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Generate New Report */}
        <Text style={styles.sectionTitle}>Generate Report</Text>
        {REPORT_TEMPLATES.map((template) => (
          <Card key={template.id} style={styles.templateCard}>
            <View style={styles.templateRow}>
              <View style={styles.templateIcon}>
                <Ionicons name={template.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>{template.description}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.generateButton, generating === template.id && styles.generatingButton]} onPress={() => handleGenerate(template)} disabled={generating === template.id}>
              {generating === template.id ? (
                <Text style={styles.generateButtonText}>Generating...</Text>
              ) : (
                <>
                  <Ionicons name="create" size={16} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </>
              )}
            </TouchableOpacity>
          </Card>
        ))}

        {/* Recent Reports */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        {GENERATED_REPORTS.map((report) => (
          <Card key={report.id} style={styles.reportCard}>
            <View style={styles.reportRow}>
              <View style={[styles.reportIcon, { backgroundColor: `${getTypeColor(report.type)}15` }]}>
                <Ionicons name={getTypeIcon(report.type)} size={20} color={getTypeColor(report.type)} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>{report.name}</Text>
                <Text style={styles.reportMeta}>{report.generatedAt} • {report.size}</Text>
              </View>
            </View>
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDownload(report)}>
                <Ionicons name="download" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(report)}>
                <Ionicons name="share" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Schedule Reports */}
        <Text style={styles.sectionTitle}>Scheduled Reports</Text>
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleName}>Monthly Credit Summary</Text>
              <Text style={styles.scheduleFrequency}>Every 1st of the month</Text>
            </View>
            <TouchableOpacity><Ionicons name="settings" size={20} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
        </Card>
        <TouchableOpacity style={styles.addScheduleButton}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.addScheduleText}>Schedule New Report</Text>
        </TouchableOpacity>

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
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  templateCard: { marginBottom: theme.spacing.sm },
  templateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  templateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  templateDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 8 },
  generatingButton: { backgroundColor: theme.colors.textSecondary },
  generateButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 6 },
  reportCard: { marginBottom: theme.spacing.sm },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  reportIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reportInfo: { flex: 1 },
  reportName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  reportMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  reportActions: { flexDirection: 'row', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, justifyContent: 'flex-end' },
  actionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  scheduleCard: { marginBottom: theme.spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center' },
  scheduleInfo: { flex: 1, marginLeft: 12 },
  scheduleName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  scheduleFrequency: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  addScheduleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed', borderRadius: 12 },
  addScheduleText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginLeft: 8 },
});

