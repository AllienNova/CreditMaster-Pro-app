import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { lightTheme } from '../../src/constants/theme';

const BUREAUS = [
  { id: 'experian', label: 'Experian', color: '#0066CC', icon: 'analytics-outline' },
  { id: 'equifax', label: 'Equifax', color: '#CC0000', icon: 'bar-chart-outline' },
  { id: 'transunion', label: 'TransUnion', color: '#00AA00', icon: 'stats-chart-outline' },
];

export default function UploadReportScreen() {
  const router = useRouter();
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedBureau) {
      Alert.alert('Required', 'Please select a credit bureau');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Required', 'Please select a file to upload');
      return;
    }

    setIsUploading(true);
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }
    setIsUploading(false);
    Alert.alert('Success', 'Your credit report has been uploaded and is being analyzed!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Report</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Select Bureau</Text>
        <Text style={styles.sectionDescription}>Which bureau is this report from?</Text>
        
        <View style={styles.bureauGrid}>
          {BUREAUS.map(bureau => (
            <TouchableOpacity
              key={bureau.id}
              style={[styles.bureauCard, selectedBureau === bureau.id && { borderColor: bureau.color, borderWidth: 2 }]}
              onPress={() => setSelectedBureau(bureau.id)}
            >
              <View style={[styles.bureauIcon, { backgroundColor: bureau.color + '20' }]}>
                <Ionicons name={bureau.icon as any} size={32} color={bureau.color} />
              </View>
              <Text style={styles.bureauLabel}>{bureau.label}</Text>
              {selectedBureau === bureau.id && (
                <View style={[styles.checkBadge, { backgroundColor: bureau.color }]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Upload File</Text>
        <Text style={styles.sectionDescription}>Upload your credit report PDF or image</Text>

        <TouchableOpacity style={styles.uploadArea} onPress={handlePickDocument}>
          {selectedFile ? (
            <View style={styles.fileInfo}>
              <Ionicons name="document" size={48} color={lightTheme.colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>{(selectedFile.size / 1024).toFixed(1)} KB</Text>
              <TouchableOpacity style={styles.changeButton} onPress={handlePickDocument}>
                <Text style={styles.changeButtonText}>Change File</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={64} color={lightTheme.colors.textSecondary} />
              <Text style={styles.uploadText}>Tap to select file</Text>
              <Text style={styles.uploadHint}>PDF or Image (max 10MB)</Text>
            </View>
          )}
        </TouchableOpacity>

        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, (!selectedBureau || !selectedFile || isUploading) && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={!selectedBureau || !selectedFile || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload & Analyze</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: lightTheme.colors.text, marginBottom: 4 },
  sectionDescription: { fontSize: 14, color: lightTheme.colors.textSecondary, marginBottom: 16 },
  bureauGrid: { flexDirection: 'row', gap: 12 },
  bureauCard: { flex: 1, backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: lightTheme.colors.border },
  bureauIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bureauLabel: { fontSize: 14, fontWeight: '600', color: lightTheme.colors.text },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadArea: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, borderWidth: 2, borderColor: lightTheme.colors.border, borderStyle: 'dashed', padding: 32, alignItems: 'center' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 16, fontWeight: '600', color: lightTheme.colors.text, marginTop: 16 },
  uploadHint: { fontSize: 14, color: lightTheme.colors.textSecondary, marginTop: 4 },
  fileInfo: { alignItems: 'center' },
  fileName: { fontSize: 16, fontWeight: '600', color: lightTheme.colors.text, marginTop: 12, maxWidth: 200 },
  fileSize: { fontSize: 14, color: lightTheme.colors.textSecondary, marginTop: 4 },
  changeButton: { marginTop: 12, padding: 8 },
  changeButtonText: { fontSize: 14, color: lightTheme.colors.primary, fontWeight: '600' },
  progressContainer: { marginTop: 16 },
  progressBar: { height: 8, backgroundColor: lightTheme.colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: lightTheme.colors.primary },
  progressText: { fontSize: 14, color: lightTheme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  footer: { padding: 16, backgroundColor: lightTheme.colors.surface, borderTopWidth: 1, borderTopColor: lightTheme.colors.border },
  uploadButton: { backgroundColor: lightTheme.colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.6 },
});

