import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, getScoreColor } from '../../src/constants/theme';

const BUREAUS = [
  { id: 'experian', name: 'Experian', color: '#0066CC', score: 695, change: +12 },
  { id: 'equifax', name: 'Equifax', color: '#CC0000', score: 682, change: -5 },
  { id: 'transunion', name: 'TransUnion', color: '#00AA00', score: 688, change: +8 },
];

const COMPARISON_DATA = {
  accounts: { experian: 15, equifax: 14, transunion: 15 },
  openAccounts: { experian: 8, equifax: 7, transunion: 8 },
  closedAccounts: { experian: 7, equifax: 7, transunion: 7 },
  negativeItems: { experian: 2, equifax: 3, transunion: 2 },
  hardInquiries: { experian: 4, equifax: 3, transunion: 5 },
  collections: { experian: 1, equifax: 1, transunion: 0 },
  utilization: { experian: 28, equifax: 32, transunion: 28 },
  oldestAccount: { experian: '8y 3m', equifax: '8y 3m', transunion: '8y 3m' },
  avgAge: { experian: '4y 2m', equifax: '4y 0m', transunion: '4y 2m' },
};

const COMPARISON_ROWS = [
  { key: 'accounts', label: 'Total Accounts', icon: 'wallet-outline' },
  { key: 'openAccounts', label: 'Open Accounts', icon: 'checkmark-circle-outline' },
  { key: 'closedAccounts', label: 'Closed Accounts', icon: 'close-circle-outline' },
  { key: 'negativeItems', label: 'Negative Items', icon: 'alert-circle-outline', highlight: true },
  { key: 'hardInquiries', label: 'Hard Inquiries', icon: 'search-outline' },
  { key: 'collections', label: 'Collections', icon: 'warning-outline', highlight: true },
  { key: 'utilization', label: 'Utilization %', icon: 'pie-chart-outline' },
  { key: 'oldestAccount', label: 'Oldest Account', icon: 'time-outline' },
  { key: 'avgAge', label: 'Average Age', icon: 'calendar-outline' },
];

export default function ComparisonScreen() {
  const router = useRouter();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const getValueColor = (key: string, value: number | string, bureauId: string) => {
    if (key === 'negativeItems' || key === 'collections') {
      const numValue = typeof value === 'number' ? value : 0;
      if (numValue === 0) return '#4CAF50';
      if (numValue <= 2) return '#FF9800';
      return '#EF4444';
    }
    if (key === 'utilization') {
      const numValue = typeof value === 'number' ? value : 0;
      if (numValue <= 10) return '#4CAF50';
      if (numValue <= 30) return '#FF9800';
      return '#EF4444';
    }
    return lightTheme.colors.text;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bureau Comparison</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Score Cards */}
        <View style={styles.scoreCards}>
          {BUREAUS.map(bureau => (
            <View key={bureau.id} style={[styles.scoreCard, { borderTopColor: bureau.color }]}>
              <Text style={[styles.bureauName, { color: bureau.color }]}>{bureau.name}</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(bureau.score) }]}>{bureau.score}</Text>
              <View style={styles.changeRow}>
                <Ionicons
                  name={bureau.change >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={bureau.change >= 0 ? '#4CAF50' : '#EF4444'}
                />
                <Text style={[styles.changeText, { color: bureau.change >= 0 ? '#4CAF50' : '#EF4444' }]}>
                  {Math.abs(bureau.change)} pts
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Comparison Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.labelCell}><Text style={styles.headerText}>Metric</Text></View>
            {BUREAUS.map(bureau => (
              <View key={bureau.id} style={styles.valueCell}>
                <View style={[styles.bureauDot, { backgroundColor: bureau.color }]} />
              </View>
            ))}
          </View>

          {COMPARISON_ROWS.map(row => {
            const data = COMPARISON_DATA[row.key as keyof typeof COMPARISON_DATA];
            return (
              <TouchableOpacity
                key={row.key}
                style={[styles.tableRow, selectedMetric === row.key && styles.tableRowSelected]}
                onPress={() => setSelectedMetric(selectedMetric === row.key ? null : row.key)}
              >
                <View style={styles.labelCell}>
                  <Ionicons name={row.icon as any} size={18} color={lightTheme.colors.textSecondary} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                </View>
                {BUREAUS.map(bureau => {
                  const value = data[bureau.id as keyof typeof data];
                  return (
                    <View key={bureau.id} style={styles.valueCell}>
                      <Text style={[
                        styles.rowValue,
                        { color: getValueColor(row.key, value, bureau.id) },
                        row.highlight && typeof value === 'number' && value > 0 && styles.highlightValue
                      ]}>
                        {typeof value === 'number' && row.key === 'utilization' ? `${value}%` : value}
                      </Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Discrepancy Alert */}
        <View style={styles.alertCard}>
          <Ionicons name="alert-circle" size={24} color="#FF9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Discrepancy Found</Text>
            <Text style={styles.alertText}>
              Equifax shows 3 negative items while others show 2. This may be worth investigating.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download-outline" size={20} color={lightTheme.colors.primary} />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Start Dispute</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  content: { flex: 1, padding: 16 },
  scoreCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  scoreCard: { flex: 1, backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderTopWidth: 4 },
  bureauName: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: '700' },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  changeText: { fontSize: 12, fontWeight: '500', marginLeft: 2 },
  tableContainer: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: lightTheme.colors.background, padding: 12 },
  headerText: { fontSize: 12, fontWeight: '600', color: lightTheme.colors.textSecondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: lightTheme.colors.border },
  tableRowSelected: { backgroundColor: lightTheme.colors.primary + '10' },
  labelCell: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueCell: { flex: 1, alignItems: 'center' },
  bureauDot: { width: 12, height: 12, borderRadius: 6 },
  rowLabel: { fontSize: 14, color: lightTheme.colors.text },
  rowValue: { fontSize: 14, fontWeight: '600' },
  highlightValue: { fontWeight: '700' },
  alertCard: { flexDirection: 'row', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginBottom: 16 },
  alertContent: { flex: 1, marginLeft: 12 },
  alertTitle: { fontSize: 16, fontWeight: '600', color: '#E65100' },
  alertText: { fontSize: 14, color: '#E65100', marginTop: 4, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: lightTheme.colors.surface, gap: 8 },
  actionButtonPrimary: { backgroundColor: lightTheme.colors.primary },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: lightTheme.colors.primary },
});

