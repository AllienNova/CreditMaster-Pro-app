/**
 * CPFI Onboarding Connect Accounts Screen
 * Connect credit bureaus and bank accounts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

const BUREAUS = [
  { id: 'experian', name: 'Experian', color: '#0066CC', description: 'Connect to pull your Experian credit report' },
  { id: 'equifax', name: 'Equifax', color: '#C41230', description: 'Connect to pull your Equifax credit report' },
  { id: 'transunion', name: 'TransUnion', color: '#00A3E0', description: 'Connect to pull your TransUnion credit report' },
];

export default function OnboardingConnectScreen() {
  const [connectedBureaus, setConnectedBureaus] = useState<string[]>([]);
  const [bankConnected, setBankConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleConnectBureau = async (bureauId: string) => {
    setIsConnecting(bureauId);
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    setConnectedBureaus(prev => [...prev, bureauId]);
    setIsConnecting(null);
  };

  const handleConnectBank = async () => {
    setIsConnecting('bank');
    // Simulate Plaid connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBankConnected(true);
    setIsConnecting(null);
  };

  const handleContinue = () => {
    router.push('/onboarding/complete');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Account Connection?',
      'You can connect your accounts later from Settings. Some features may be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => router.push('/onboarding/complete') },
      ]
    );
  };

  const progress = 3 / 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step 3 of 4</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Connect your accounts</Text>
          <Text style={styles.subtitle}>Link your credit bureaus and bank to unlock all features</Text>

          {/* Credit Bureaus */}
          <Text style={styles.sectionTitle}>Credit Bureaus</Text>
          {BUREAUS.map((bureau) => {
            const isConnected = connectedBureaus.includes(bureau.id);
            const isLoading = isConnecting === bureau.id;
            return (
              <Card key={bureau.id} style={styles.connectionCard}>
                <View style={styles.connectionRow}>
                  <View style={[styles.bureauIcon, { backgroundColor: `${bureau.color}20` }]}>
                    <Text style={[styles.bureauInitial, { color: bureau.color }]}>{bureau.name[0]}</Text>
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{bureau.name}</Text>
                    <Text style={styles.connectionDescription}>{bureau.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.connectButton, isConnected && styles.connectedButton]}
                    onPress={() => !isConnected && handleConnectBureau(bureau.id)}
                    disabled={isConnected || isLoading}
                  >
                    {isLoading ? (
                      <Text style={styles.connectButtonText}>...</Text>
                    ) : isConnected ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : (
                      <Text style={styles.connectButtonText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}

          {/* Bank Account */}
          <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Bank Account (Optional)</Text>
          <Card style={styles.connectionCard}>
            <View style={styles.connectionRow}>
              <View style={[styles.bureauIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="business" size={24} color="#10B981" />
              </View>
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionName}>Link Bank Account</Text>
                <Text style={styles.connectionDescription}>Track spending and get financial insights</Text>
              </View>
              <TouchableOpacity
                style={[styles.connectButton, bankConnected && styles.connectedButton]}
                onPress={() => !bankConnected && handleConnectBank()}
                disabled={bankConnected || isConnecting === 'bank'}
              >
                {isConnecting === 'bank' ? (
                  <Text style={styles.connectButtonText}>...</Text>
                ) : bankConnected ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.securityText}>Bank-level encryption protects your data. We never store your login credentials.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.connectedCount}>{connectedBureaus.length} of 3 bureaus connected</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { padding: 4 },
  skipText: { fontSize: 16, color: theme.colors.primary },
  progressContainer: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
  content: { paddingHorizontal: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  connectionCard: { marginBottom: theme.spacing.sm },
  connectionRow: { flexDirection: 'row', alignItems: 'center' },
  bureauIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  bureauInitial: { fontSize: 20, fontWeight: '700' },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  connectionDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  connectButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.md },
  connectedButton: { backgroundColor: '#10B981' },
  connectButtonText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#D1FAE520', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  securityText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, marginLeft: 10, lineHeight: 18 },
  footer: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.lg },
  continueButtonText: { fontSize: 18, fontWeight: '600', color: '#fff', marginRight: 8 },
  connectedCount: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 12 },
});

