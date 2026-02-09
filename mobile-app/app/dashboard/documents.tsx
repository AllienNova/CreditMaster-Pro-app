/**
 * Fynvita Documents Dashboard Screen
 * Document management and upload
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Document {
  id: string;
  name: string;
  type: 'credit_report' | 'dispute_response' | 'identity' | 'other';
  size: number;
  uploadedAt: string;
  status: 'processing' | 'analyzed' | 'processed' | 'verified' | 'error';
}

const MOCK_DOCUMENTS: Document[] = [
  { id: '1', name: 'Experian_Credit_Report_Nov2024.pdf', type: 'credit_report', size: 2456789, uploadedAt: '2024-11-15T10:00:00Z', status: 'analyzed' },
  { id: '2', name: 'Equifax_Report_Oct2024.pdf', type: 'credit_report', size: 1987654, uploadedAt: '2024-10-20T14:30:00Z', status: 'analyzed' },
  { id: '3', name: 'Dispute_Response_Experian.pdf', type: 'dispute_response', size: 456789, uploadedAt: '2024-11-01T09:15:00Z', status: 'processed' },
  { id: '4', name: 'Identity_Verification.jpg', type: 'identity', size: 234567, uploadedAt: '2024-09-10T16:45:00Z', status: 'verified' },
];

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    setTimeout(() => {
      setDocuments(MOCK_DOCUMENTS);
      setLoading(false);
    }, 500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const file = result.assets[0];

        // Simulate upload
        setTimeout(() => {
          const newDoc: Document = {
            id: Date.now().toString(),
            name: file.name,
            type: 'credit_report',
            size: file.size || 0,
            uploadedAt: new Date().toISOString(),
            status: 'processing',
          };
          setDocuments(prev => [newDoc, ...prev]);
          setUploading(false);
          Alert.alert('Upload Complete', 'Your document is being processed.');
        }, 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload document');
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_report': return 'document-text';
      case 'dispute_response': return 'chatbox-ellipses';
      case 'identity': return 'card';
      default: return 'document';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': case 'verified': return theme.colors.success;
      case 'processed': return theme.colors.primary;
      case 'processing': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          setDocuments(prev => prev.filter(d => d.id !== id));
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Documents</Text>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadingButton]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <Text style={styles.uploadButtonText}>Uploading...</Text>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload Area */}
        <TouchableOpacity style={styles.uploadArea} onPress={handleUpload} disabled={uploading}>
          <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.primary} />
          <Text style={styles.uploadTitle}>Drag & drop or tap to upload</Text>
          <Text style={styles.uploadSubtitle}>PDF, JPG, PNG (max 10MB)</Text>
        </TouchableOpacity>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Uploaded Documents ({documents.length})</Text>

          {documents.map((doc) => (
            <Card key={doc.id} style={styles.documentCard}>
              <View style={styles.docRow}>
                <View style={styles.docIcon}>
                  <Ionicons
                    name={getTypeIcon(doc.type) as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docMeta}>
                    {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(doc.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                    {doc.status}
                  </Text>
                </View>
              </View>
              <View style={styles.docActions}>
                <TouchableOpacity style={styles.docActionButton}>
                  <Ionicons name="eye-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.docActionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.docActionButton}>
                  <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.docActionText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.docActionButton}
                  onPress={() => handleDelete(doc.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  <Text style={[styles.docActionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          {documents.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No documents uploaded yet</Text>
              <Text style={styles.emptySubtitle}>Upload your credit reports to get started</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, paddingBottom: 0 },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  uploadingButton: { opacity: 0.7 },
  uploadButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scrollView: { flex: 1, padding: theme.spacing.lg },

  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
  },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
  uploadSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },

  documentsSection: {},
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },

  documentCard: { marginBottom: theme.spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center' },
  docIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  docMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  docActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 16 },
  docActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docActionText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
});
