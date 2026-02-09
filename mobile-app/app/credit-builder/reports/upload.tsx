/**
 * Fynvita Credit Report Upload Screen
 * Upload and analyze credit reports from all bureaus
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { lightTheme as theme } from '../../../src/constants/theme';
import { Card } from '../../../src/components/Card';

interface UploadedReport {
  id: string;
  bureau: 'experian' | 'equifax' | 'transunion';
  filename: string;
  uploadDate: string;
  status: 'uploading' | 'processing' | 'analyzed' | 'error';
  size: string;
}

const BUREAUS = [
  { id: 'experian', name: 'Experian', color: '#0066CC', icon: '🔵' },
  { id: 'equifax', name: 'Equifax', color: '#CC0000', icon: '🔴' },
  { id: 'transunion', name: 'TransUnion', color: '#00AA00', icon: '🟢' },
];

export default function ReportUploadScreen() {
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [selectedBureau, setSelectedBureau] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDocumentPick = async () => {
    if (!selectedBureau) {
      Alert.alert('Select Bureau', 'Please select which bureau this report is from.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      simulateUpload(file.name, file.size || 0);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleCameraCapture = async () => {
    if (!selectedBureau) {
      Alert.alert('Select Bureau', 'Please select which bureau this report is from.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture report pages.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      simulateUpload('credit_report_scan.jpg', 1500000);
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const simulateUpload = (filename: string, size: number) => {
    setIsUploading(true);
    const newReport: UploadedReport = {
      id: Date.now().toString(),
      bureau: selectedBureau as 'experian' | 'equifax' | 'transunion',
      filename,
      uploadDate: new Date().toISOString(),
      status: 'uploading',
      size: formatFileSize(size),
    };

    setUploadedReports(prev => [newReport, ...prev]);

    // Simulate upload progress
    setTimeout(() => {
      setUploadedReports(prev => prev.map(r => r.id === newReport.id ? { ...r, status: 'processing' } : r));
    }, 1500);

    setTimeout(() => {
      setUploadedReports(prev => prev.map(r => r.id === newReport.id ? { ...r, status: 'analyzed' } : r));
      setIsUploading(false);
      setSelectedBureau(null);
    }, 3500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusInfo = (status: UploadedReport['status']) => {
    switch (status) {
      case 'uploading': return { icon: 'cloud-upload', color: theme.colors.primary, text: 'Uploading...' };
      case 'processing': return { icon: 'hourglass', color: '#F59E0B', text: 'Analyzing...' };
      case 'analyzed': return { icon: 'checkmark-circle', color: theme.colors.success, text: 'Analyzed' };
      case 'error': return { icon: 'alert-circle', color: theme.colors.error, text: 'Error' };
    }
  };

  const getBureauInfo = (bureauId: string) => {
    return BUREAUS.find(b => b.id === bureauId) || BUREAUS[0];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Upload Report</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={32} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Upload Your Credit Report</Text>
              <Text style={styles.infoSubtitle}>We'll analyze it for errors and opportunities</Text>
            </View>
          </View>
        </Card>

        {/* Bureau Selection */}
        <Text style={styles.sectionTitle}>Select Bureau</Text>
        <View style={styles.bureauGrid}>
          {BUREAUS.map((bureau) => (
            <TouchableOpacity
              key={bureau.id}
              onPress={() => setSelectedBureau(bureau.id)}
              activeOpacity={0.7}
            >
              <Card style={[styles.bureauCard, selectedBureau === bureau.id && { borderColor: bureau.color, borderWidth: 2 }]}>
                <Text style={styles.bureauIcon}>{bureau.icon}</Text>
                <Text style={styles.bureauName}>{bureau.name}</Text>
                {selectedBureau === bureau.id && (
                  <Ionicons name="checkmark-circle" size={20} color={bureau.color} style={styles.bureauCheck} />
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload Options */}
        <Text style={styles.sectionTitle}>Upload Method</Text>
        <View style={styles.uploadOptions}>
          <TouchableOpacity
            style={[styles.uploadOption, !selectedBureau && styles.uploadOptionDisabled]}
            onPress={handleDocumentPick}
            disabled={isUploading || !selectedBureau}
          >
            <View style={styles.uploadIconContainer}>
              <Ionicons name="document-attach" size={28} color={selectedBureau ? theme.colors.primary : theme.colors.textSecondary} />
            </View>
            <Text style={[styles.uploadOptionTitle, !selectedBureau && styles.textDisabled]}>Choose File</Text>
            <Text style={styles.uploadOptionSubtitle}>PDF or Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadOption, !selectedBureau && styles.uploadOptionDisabled]}
            onPress={handleCameraCapture}
            disabled={isUploading || !selectedBureau}
          >
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera" size={28} color={selectedBureau ? theme.colors.primary : theme.colors.textSecondary} />
            </View>
            <Text style={[styles.uploadOptionTitle, !selectedBureau && styles.textDisabled]}>Take Photo</Text>
            <Text style={styles.uploadOptionSubtitle}>Scan Pages</Text>
          </TouchableOpacity>
        </View>

        {/* Uploaded Reports */}
        {uploadedReports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Uploaded Reports</Text>
            {uploadedReports.map((report) => {
              const bureau = getBureauInfo(report.bureau);
              const status = getStatusInfo(report.status);

              return (
                <Card key={report.id} style={styles.reportCard}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportBureauIcon}>{bureau.icon}</Text>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportFilename} numberOfLines={1}>{report.filename}</Text>
                      <Text style={styles.reportMeta}>{bureau.name} • {report.size}</Text>
                    </View>
                    <View style={styles.reportStatus}>
                      {report.status === 'uploading' || report.status === 'processing' ? (
                        <ActivityIndicator size="small" color={status.color} />
                      ) : (
                        <Ionicons name={status.icon as keyof typeof Ionicons.glyphMap} size={24} color={status.color} />
                      )}
                      <Text style={[styles.reportStatusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                  </View>

                  {report.status === 'analyzed' && (
                    <TouchableOpacity
                      style={styles.viewResultsButton}
                      onPress={() => router.push('/credit-builder')}
                    >
                      <Text style={styles.viewResultsText}>View Analysis Results</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Best Results</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.tipText}>Use the full report, not a summary</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.tipText}>Ensure all pages are included</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.tipText}>Make sure text is readable</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.tipText}>Reports should be less than 30 days old</Text>
          </View>
        </Card>

        {/* Get Free Report CTA */}
        <TouchableOpacity style={styles.ctaButton}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Don't have a report?</Text>
            <Text style={styles.ctaSubtitle}>Get your free annual credit report</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
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
  infoCard: { marginBottom: theme.spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoContent: { marginLeft: 16, flex: 1 },
  infoTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  infoSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  bureauGrid: { flexDirection: 'row', gap: 12, marginBottom: theme.spacing.lg },
  bureauCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  bureauIcon: { fontSize: 28, marginBottom: 8 },
  bureauName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  bureauCheck: { position: 'absolute', top: 8, right: 8 },
  uploadOptions: { flexDirection: 'row', gap: 12, marginBottom: theme.spacing.lg },
  uploadOption: { flex: 1, alignItems: 'center', padding: 20, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border, borderStyle: 'dashed' },
  uploadOptionDisabled: { opacity: 0.5 },
  uploadIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  uploadOptionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  uploadOptionSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  textDisabled: { color: theme.colors.textSecondary },
  reportCard: { marginBottom: theme.spacing.sm },
  reportRow: { flexDirection: 'row', alignItems: 'center' },
  reportBureauIcon: { fontSize: 24, marginRight: 12 },
  reportInfo: { flex: 1 },
  reportFilename: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  reportMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  reportStatus: { alignItems: 'center' },
  reportStatusText: { fontSize: 11, marginTop: 4 },
  viewResultsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  viewResultsText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginRight: 4 },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.colors.primary + '10', borderRadius: 12, marginTop: theme.spacing.lg },
  ctaContent: { flex: 1 },
  ctaTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  ctaSubtitle: { fontSize: 13, color: theme.colors.primary, marginTop: 2 },
});
