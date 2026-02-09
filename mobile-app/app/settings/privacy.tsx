/**
 * Fynvita Privacy & Security Settings Screen
 * Manage privacy and security preferences
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

export default function PrivacySettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [dataSharing, setDataSharing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'You will receive an email with instructions to change your password.');
  };

  const handleEnable2FA = () => {
    if (!twoFactorEnabled) {
      Alert.alert('Enable 2FA', 'Set up two-factor authentication for extra security?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: () => setTwoFactorEnabled(true) },
      ]);
    } else {
      setTwoFactorEnabled(false);
    }
  };

  const handleDownloadData = () => {
    Alert.alert('Download Your Data', 'We will prepare your data and send a download link to your email within 24 hours.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy & Security</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#22C55E15' }]}>
              <Ionicons name="finger-print" size={20} color="#22C55E" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Biometric Login</Text>
              <Text style={styles.settingDescription}>Use Face ID or fingerprint to sign in</Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
              <Text style={styles.settingDescription}>Add an extra layer of security</Text>
            </View>
            <Switch value={twoFactorEnabled} onValueChange={handleEnable2FA} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
            <View style={[styles.settingIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="key" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingDescription}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Session */}
        <Text style={styles.sectionTitle}>Session</Text>
        <Card style={styles.card}>
          <Text style={styles.timeoutLabel}>Auto-lock after inactivity</Text>
          <View style={styles.timeoutOptions}>
            {['5', '15', '30', '60'].map((mins) => (
              <TouchableOpacity key={mins} style={[styles.timeoutOption, sessionTimeout === mins && styles.timeoutOptionActive]} onPress={() => setSessionTimeout(mins)}>
                <Text style={[styles.timeoutText, sessionTimeout === mins && styles.timeoutTextActive]}>{mins} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Data Privacy */}
        <Text style={styles.sectionTitle}>Data Privacy</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Share Data with Partners</Text>
              <Text style={styles.settingDescription}>Allow sharing anonymized data for better offers</Text>
            </View>
            <Switch value={dataSharing} onValueChange={setDataSharing} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Analytics</Text>
              <Text style={styles.settingDescription}>Help us improve by sharing usage data</Text>
            </View>
            <Switch value={analyticsEnabled} onValueChange={setAnalyticsEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Marketing Communications</Text>
              <Text style={styles.settingDescription}>Receive promotional emails and offers</Text>
            </View>
            <Switch value={marketingEnabled} onValueChange={setMarketingEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
        </Card>

        {/* Your Data */}
        <Text style={styles.sectionTitle}>Your Data</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.dataRow} onPress={handleDownloadData}>
            <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.dataText}>Download Your Data</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dataRow}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.dataText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>

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
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  card: { marginBottom: theme.spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  settingDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  timeoutLabel: { fontSize: 14, color: theme.colors.text, marginBottom: theme.spacing.sm },
  timeoutOptions: { flexDirection: 'row' },
  timeoutOption: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.background, marginHorizontal: 2, borderRadius: 8 },
  timeoutOptionActive: { backgroundColor: theme.colors.primary },
  timeoutText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  timeoutTextActive: { color: '#fff' },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dataText: { flex: 1, fontSize: 15, color: theme.colors.text, marginLeft: 12 },
});

