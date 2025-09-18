import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface CreditReport {
  id: string;
  bureau: string;
  uploadDate: string;
  status: 'processing' | 'completed' | 'error';
  score?: number;
  itemsFound?: number;
}

const CreditReportsScreen = () => {
  const [reports, setReports] = useState<CreditReport[]>([
    {
      id: '1',
      bureau: 'Experian',
      uploadDate: '2024-01-15',
      status: 'completed',
      score: 650,
      itemsFound: 8,
    },
    {
      id: '2',
      bureau: 'Equifax',
      uploadDate: '2024-01-14',
      status: 'completed',
      score: 645,
      itemsFound: 6,
    },
    {
      id: '3',
      bureau: 'TransUnion',
      uploadDate: '2024-01-13',
      status: 'processing',
    },
  ]);

  const [uploading, setUploading] = useState(false);

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        
        // Simulate upload and processing
        const newReport: CreditReport = {
          id: Date.now().toString(),
          bureau: 'Auto-detected',
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'processing',
        };

        setReports(prev => [newReport, ...prev]);

        // Simulate processing completion
        setTimeout(() => {
          setReports(prev => 
            prev.map(report => 
              report.id === newReport.id 
                ? { 
                    ...report, 
                    status: 'completed' as const,
                    score: Math.floor(Math.random() * 200) + 550,
                    itemsFound: Math.floor(Math.random() * 10) + 3,
                    bureau: ['Experian', 'Equifax', 'TransUnion'][Math.floor(Math.random() * 3)]
                  }
                : report
            )
          );
          setUploading(false);
          Alert.alert(
            'Upload Complete',
            'Your credit report has been processed successfully!'
          );
        }, 3000);
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
    }
  };

  const handleCameraUpload = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to scan credit reports.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setUploading(true);
        
        // Simulate upload and processing
        const newReport: CreditReport = {
          id: Date.now().toString(),
          bureau: 'Scanned Document',
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'processing',
        };

        setReports(prev => [newReport, ...prev]);

        // Simulate processing completion
        setTimeout(() => {
          setReports(prev => 
            prev.map(report => 
              report.id === newReport.id 
                ? { 
                    ...report, 
                    status: 'completed' as const,
                    score: Math.floor(Math.random() * 200) + 550,
                    itemsFound: Math.floor(Math.random() * 10) + 3,
                    bureau: ['Experian', 'Equifax', 'TransUnion'][Math.floor(Math.random() * 3)]
                  }
                : report
            )
          );
          setUploading(false);
          Alert.alert(
            'Scan Complete',
            'Your credit report has been processed successfully!'
          );
        }, 3000);
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Camera Error', 'Failed to capture image. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'processing':
        return 'time';
      case 'error':
        return 'alert-circle';
      default:
        return 'document';
    }
  };

  const getBureauIcon = (bureau: string) => {
    switch (bureau.toLowerCase()) {
      case 'experian':
        return 'business';
      case 'equifax':
        return 'shield-checkmark';
      case 'transunion':
        return 'analytics';
      default:
        return 'document-text';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Credit Reports</Text>
          <Text style={styles.subtitle}>
            Upload and manage your credit reports from all three bureaus
          </Text>
        </View>

        {/* Upload Section */}
        <Card style={styles.uploadCard}>
          <Text style={styles.sectionTitle}>Upload New Report</Text>
          <Text style={styles.uploadDescription}>
            Upload credit reports from Experian, Equifax, or TransUnion for AI analysis
          </Text>

          <View style={styles.uploadButtons}>
            <Button
              title="Choose File"
              onPress={handleDocumentUpload}
              variant="primary"
              style={styles.uploadButton}
              loading={uploading}
              icon={<Ionicons name="document" size={16} color="#ffffff" />}
            />
            
            <Button
              title="Scan with Camera"
              onPress={handleCameraUpload}
              variant="outline"
              style={styles.uploadButton}
              loading={uploading}
              icon={<Ionicons name="camera" size={16} color="#667eea" />}
            />
          </View>

          <View style={styles.uploadInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
              <Text style={styles.infoText}>Bank-level security</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={styles.infoText}>AI processing in seconds</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="eye-off" size={16} color="#667eea" />
              <Text style={styles.infoText}>Your data stays private</Text>
            </View>
          </View>
        </Card>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Your Reports</Text>
          
          {reports.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <Ionicons name="document-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Reports Yet</Text>
                <Text style={styles.emptyDescription}>
                  Upload your first credit report to get started with AI-powered analysis
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.reportsList}>
              {reports.map((report) => (
                <Card key={report.id} style={styles.reportCard} onPress={() => {}}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <View style={styles.reportTitleRow}>
                        <Ionicons 
                          name={getBureauIcon(report.bureau)} 
                          size={20} 
                          color="#667eea" 
                        />
                        <Text style={styles.reportBureau}>{report.bureau}</Text>
                      </View>
                      <Text style={styles.reportDate}>
                        Uploaded {new Date(report.uploadDate).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View style={styles.reportStatus}>
                      <Ionicons 
                        name={getStatusIcon(report.status)} 
                        size={20} 
                        color={getStatusColor(report.status)} 
                      />
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(report.status) }
                      ]}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {report.status === 'completed' && (
                    <View style={styles.reportDetails}>
                      <View style={styles.reportStat}>
                        <Text style={styles.statValue}>{report.score}</Text>
                        <Text style={styles.statLabel}>Credit Score</Text>
                      </View>
                      <View style={styles.reportStat}>
                        <Text style={styles.statValue}>{report.itemsFound}</Text>
                        <Text style={styles.statLabel}>Items Found</Text>
                      </View>
                      <View style={styles.reportActions}>
                        <TouchableOpacity style={styles.actionButton}>
                          <Ionicons name="eye" size={16} color="#667eea" />
                          <Text style={styles.actionText}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                          <Ionicons name="analytics" size={16} color="#667eea" />
                          <Text style={styles.actionText}>Analyze</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {report.status === 'processing' && (
                    <View style={styles.processingIndicator}>
                      <Text style={styles.processingText}>
                        AI is analyzing your credit report...
                      </Text>
                      <View style={styles.progressBar}>
                        <View style={styles.progressFill} />
                      </View>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Tips Section */}
        <Card style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>
              • Upload reports from all three bureaus for complete analysis
            </Text>
            <Text style={styles.tip}>
              • Ensure documents are clear and readable for best AI accuracy
            </Text>
            <Text style={styles.tip}>
              • Upload updated reports monthly to track your progress
            </Text>
            <Text style={styles.tip}>
              • PDF format provides the most accurate text extraction
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  uploadCard: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
  },
  uploadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
  },
  reportsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  emptyCard: {
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  reportsList: {
    gap: 16,
  },
  reportCard: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reportBureau: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  reportDate: {
    fontSize: 14,
    color: '#64748b',
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reportStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  processingIndicator: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  processingText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  tipsCard: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default CreditReportsScreen;

