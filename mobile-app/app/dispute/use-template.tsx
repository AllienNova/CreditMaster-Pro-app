import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';
import { disputesAPI, DisputeTemplate } from '../../services/api';

const PLACEHOLDER_LABELS: Record<string, string> = {
  YOUR_NAME: 'Your Full Name',
  YOUR_ADDRESS: 'Your Address',
  YOUR_SSN_LAST_4: 'Last 4 of SSN',
  CREDITOR_NAME: 'Creditor/Company Name',
  ACCOUNT_NUMBER: 'Account Number (last 4)',
  INQUIRY_DATE: 'Date of Inquiry',
  ORIGINAL_DATE: 'Original Account Date',
  PAYMENT_DATE: 'Payment Date',
  AMOUNT_PAID: 'Amount Paid',
  COLLECTION_AGENCY: 'Collection Agency Name',
  MEDICAL_PROVIDER: 'Medical Provider Name',
  LOAN_SERVICER: 'Loan Servicer Name',
  REHABILITATION_DATE: 'Rehabilitation Completion Date',
  CASE_NUMBER: 'Bankruptcy Case Number',
  DISCHARGE_DATE: 'Discharge Date',
  WRONG_ACCOUNT: 'Incorrect Account Name',
  INCORRECT_MONTH: 'Month Incorrectly Reported',
  AMOUNT: 'Amount',
  ACCOUNT_NAME: 'Account Name',
};

export default function UseTemplateScreen() {
  const router = useRouter();
  const { templateId, templateName } = useLocalSearchParams<{ templateId: string; templateName: string }>();
  const [template, setTemplate] = useState<DisputeTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    setLoading(true);
    const { data } = await disputesAPI.getTemplate(templateId || '');
    if (data?.template) {
      setTemplate(data.template);
      // Initialize placeholder values
      const initial: Record<string, string> = {};
      data.template.placeholders.forEach((p: string) => { initial[p] = ''; });
      setPlaceholderValues(initial);
    }
    setLoading(false);
  };

  const handleGenerateLetter = async () => {
    // Validate all placeholders are filled
    const emptyFields = Object.entries(placeholderValues).filter(([_, v]) => !v.trim());
    if (emptyFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setGenerating(true);
    const { data, error } = await disputesAPI.generateFromTemplate(templateId || '', placeholderValues);
    
    if (error) {
      Alert.alert('Error', error);
    } else if (data?.letter) {
      setGeneratedLetter(data.letter);
    }
    setGenerating(false);
  };

  const handleSaveLetter = () => {
    Alert.alert('Success', 'Your dispute letter has been saved!', [
      { text: 'View Disputes', onPress: () => router.replace('/(tabs)/disputes' as never) },
      { text: 'Create Another', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={lightTheme.colors.primary} />
      </View>
    );
  }

  if (generatedLetter) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setGeneratedLetter(null)}>
            <Ionicons name="arrow-back" size={24} color={lightTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generated Letter</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="share-outline" size={24} color={lightTheme.colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.letterContainer}>
          <Text style={styles.letterText}>{generatedLetter}</Text>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setGeneratedLetter(null)}>
            <Ionicons name="create-outline" size={20} color={lightTheme.colors.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveLetter}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Save & Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{templateName || 'Use Template'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Template Info */}
        {template && (
          <View style={styles.templateInfo}>
            <View style={styles.successBadge}>
              <Text style={styles.successText}>{template.successRate}% success rate</Text>
            </View>
            <Text style={styles.scenario}>{template.scenario}</Text>
          </View>
        )}

        {/* Required Documents */}
        {template?.requiredDocuments && template.requiredDocuments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📎 Required Documents</Text>
            {template.requiredDocuments.map((doc, i) => (
              <View key={i} style={styles.docItem}>
                <Ionicons name="document-outline" size={16} color={lightTheme.colors.textSecondary} />
                <Text style={styles.docText}>{doc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Placeholder Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Fill in Your Details</Text>
          {template?.placeholders.map((placeholder) => (
            <View key={placeholder} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {PLACEHOLDER_LABELS[placeholder] || placeholder.replace(/_/g, ' ')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${PLACEHOLDER_LABELS[placeholder]?.toLowerCase() || placeholder.toLowerCase()}`}
                value={placeholderValues[placeholder] || ''}
                onChangeText={(text) => setPlaceholderValues(prev => ({ ...prev, [placeholder]: text }))}
                placeholderTextColor={lightTheme.colors.textSecondary}
              />
            </View>
          ))}
        </View>

        {/* Best Practices */}
        {template?.bestPractices && template.bestPractices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Best Practices</Text>
            {template.bestPractices.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color={lightTheme.colors.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.generateButton, generating && styles.buttonDisabled]} 
          onPress={handleGenerateLetter}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating...' : 'Generate Letter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text, flex: 1, marginHorizontal: 16 },
  content: { flex: 1, padding: 16 },
  templateInfo: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  successBadge: { alignSelf: 'flex-start', backgroundColor: '#16A34A20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  successText: { color: '#16A34A', fontSize: 13, fontWeight: '600' },
  scenario: { fontSize: 14, color: lightTheme.colors.textSecondary, lineHeight: 20 },
  section: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: lightTheme.colors.text, marginBottom: 12 },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  docText: { fontSize: 14, color: lightTheme.colors.textSecondary },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: lightTheme.colors.text, marginBottom: 6 },
  input: { backgroundColor: lightTheme.colors.background, borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: lightTheme.colors.border },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipText: { flex: 1, fontSize: 14, color: lightTheme.colors.textSecondary, lineHeight: 20 },
  footer: { padding: 16, backgroundColor: lightTheme.colors.surface, borderTopWidth: 1, borderTopColor: lightTheme.colors.border },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: lightTheme.colors.primary, padding: 16, borderRadius: 12, gap: 8 },
  generateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  letterContainer: { flex: 1, padding: 16 },
  letterText: { fontSize: 14, color: lightTheme.colors.text, lineHeight: 22, fontFamily: 'monospace' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: lightTheme.colors.primary, gap: 6, flex: 1, marginRight: 8 },
  secondaryButtonText: { color: lightTheme.colors.primary, fontSize: 15, fontWeight: '600' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: lightTheme.colors.primary, padding: 14, borderRadius: 12, gap: 6, flex: 2 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

