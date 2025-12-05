import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme, colors } from '../../src/constants/theme';
import type { Document } from '../../src/types';

export default function ReportsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = async () => {
    setDocuments([
      { id: '1', user_id: '1', name: 'Experian_Report_Nov2024.pdf', type: 'credit_report', file_url: '', file_size: 2456789, status: 'analyzed', uploaded_at: '2024-11-15T10:00:00Z', analysis_result: { bureau: 'Experian', score: 678, accounts_count: 12, disputable_items: 3, recommendations: [] } },
      { id: '2', user_id: '1', name: 'Equifax_Report_Oct2024.pdf', type: 'credit_report', file_url: '', file_size: 1987654, status: 'analyzed', uploaded_at: '2024-10-20T10:00:00Z', analysis_result: { bureau: 'Equifax', score: 665, accounts_count: 11, disputable_items: 2, recommendations: [] } },
      { id: '3', user_id: '1', name: 'TransUnion_Report_Sep2024.pdf', type: 'credit_report', file_url: '', file_size: 2123456, status: 'analyzed', uploaded_at: '2024-09-15T10:00:00Z', analysis_result: { bureau: 'TransUnion', score: 682, accounts_count: 13, disputable_items: 1, recommendations: [] } },
    ]);
  };

  useEffect(() => { fetchDocuments(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchDocuments(); setRefreshing(false); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBureauColor = (bureau?: string) => {
    if (!bureau) return theme.colors.textSecondary;
    const lower = bureau.toLowerCase();
    return colors.bureaus[lower as keyof typeof colors.bureaus] || theme.colors.textSecondary;
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <TouchableOpacity style={styles.documentCard} onPress={() => router.push(`/document/${item.id}` as never)}>
      <View style={styles.docIcon}>
        <Ionicons name="document-text" size={32} color={getBureauColor(item.analysis_result?.bureau)} />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.docMeta}>{formatFileSize(item.file_size)} • {new Date(item.uploaded_at).toLocaleDateString()}</Text>
        {item.analysis_result && (
          <View style={styles.analysisRow}>
            <View style={[styles.scoreBadge, { backgroundColor: `${getBureauColor(item.analysis_result.bureau)}20` }]}>
              <Text style={[styles.scoreText, { color: getBureauColor(item.analysis_result.bureau) }]}>
                Score: {item.analysis_result.score}
              </Text>
            </View>
            <Text style={styles.itemsText}>{item.analysis_result.disputable_items} disputable items</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Credit Reports</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => router.push('/reports/upload' as never)}>
          <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
          <Text style={styles.uploadText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Bureau Comparison */}
      <View style={styles.comparisonCard}>
        <Text style={styles.cardTitle}>Bureau Comparison</Text>
        <View style={styles.bureauRow}>
          {['Experian', 'Equifax', 'TransUnion'].map((bureau, i) => {
            const doc = documents.find(d => d.analysis_result?.bureau === bureau);
            return (
              <View key={i} style={styles.bureauItem}>
                <Text style={[styles.bureauName, { color: colors.bureaus[bureau.toLowerCase() as keyof typeof colors.bureaus] }]}>{bureau}</Text>
                <Text style={styles.bureauScore}>{doc?.analysis_result?.score || '---'}</Text>
                <Text style={styles.bureauLabel}>Score</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Upload Prompt */}
      <TouchableOpacity style={styles.uploadPrompt} onPress={() => router.push('/reports/upload' as never)}>
        <View style={styles.uploadPromptIcon}>
          <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
        </View>
        <View style={styles.uploadPromptText}>
          <Text style={styles.uploadPromptTitle}>Upload New Report</Text>
          <Text style={styles.uploadPromptDesc}>Get AI-powered analysis of your credit report</Text>
        </View>
      </TouchableOpacity>

      {/* Documents List */}
      <Text style={styles.sectionTitle}>Recent Reports</Text>
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No reports uploaded yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  uploadText: { color: '#FFFFFF', fontWeight: '600', marginLeft: 6 },
  comparisonCard: { backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  bureauRow: { flexDirection: 'row', justifyContent: 'space-around' },
  bureauItem: { alignItems: 'center' },
  bureauName: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  bureauScore: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  bureauLabel: { fontSize: 11, color: theme.colors.textSecondary },
  uploadPrompt: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed' },
  uploadPromptIcon: { marginRight: theme.spacing.md },
  uploadPromptText: { flex: 1 },
  uploadPromptTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  uploadPromptDesc: { fontSize: 13, color: theme.colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: theme.spacing.lg, marginBottom: theme.spacing.sm },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
  documentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  docIcon: { width: 50, height: 50, borderRadius: 8, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: 2 },
  docMeta: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  analysisRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  scoreText: { fontSize: 11, fontWeight: '600' },
  itemsText: { fontSize: 11, color: theme.colors.warning },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
});

