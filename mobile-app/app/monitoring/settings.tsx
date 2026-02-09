/**
 * Fynvita Monitoring Settings Screen
 * Enable/disable bureaus, alert preferences, notifications
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useCreditStore } from '../../src/store/creditStore';

const BUREAUS = [
  { id: 'experian', name: 'Experian', color: '#0066CC' },
  { id: 'equifax', name: 'Equifax', color: '#C41230' },
  { id: 'transunion', name: 'TransUnion', color: '#00A3E0' },
];

const ALERT_TYPES = [
  { id: 'score_change', name: 'Score Changes', description: 'When your credit score changes', icon: 'trending-up' },
  { id: 'new_account', name: 'New Accounts', description: 'When a new account appears', icon: 'add-circle' },
  { id: 'inquiry', name: 'Hard Inquiries', description: 'When someone checks your credit', icon: 'search' },
  { id: 'payment', name: 'Payment Updates', description: 'Payment status changes', icon: 'card' },
  { id: 'balance', name: 'Balance Changes', description: 'Significant balance changes', icon: 'wallet' },
  { id: 'derogatory', name: 'Negative Items', description: 'Collections, late payments', icon: 'alert-circle' },
];

export default function MonitoringSettingsScreen() {
  const { monitoringStatus, toggleBureauMonitoring, updateAlertPreferences, toggleMonitoring } = useCreditStore();
  
  const [bureauSettings, setBureauSettings] = useState({
    experian: monitoringStatus?.bureaus?.experian?.enabled ?? true,
    equifax: monitoringStatus?.bureaus?.equifax?.enabled ?? true,
    transunion: monitoringStatus?.bureaus?.transunion?.enabled ?? true,
  });
  
  const [alertSettings, setAlertSettings] = useState({
    score_change: true,
    new_account: true,
    inquiry: true,
    payment: true,
    balance: true,
    derogatory: true,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    push: true,
    email: true,
    sms: false,
  });

  const handleBureauToggle = (bureauId: string, value: boolean) => {
    setBureauSettings(prev => ({ ...prev, [bureauId]: value }));
    toggleBureauMonitoring(bureauId, value);
  };

  const handleAlertToggle = (alertId: string, value: boolean) => {
    setAlertSettings(prev => ({ ...prev, [alertId]: value }));
    updateAlertPreferences({ [alertId]: value });
  };

  const handleNotificationToggle = (type: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [type]: value }));
  };

  const handlePauseMonitoring = () => {
    Alert.alert(
      'Pause Monitoring',
      'Are you sure you want to pause credit monitoring? You won\'t receive alerts until you resume.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause', style: 'destructive', onPress: () => toggleMonitoring(false) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Monitoring Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Bureau Monitoring */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Bureau Monitoring</Text>
          <Text style={styles.sectionDescription}>Choose which credit bureaus to monitor</Text>
          {BUREAUS.map((bureau) => (
            <View key={bureau.id} style={styles.settingRow}>
              <View style={[styles.bureauIcon, { backgroundColor: `${bureau.color}20` }]}>
                <Text style={[styles.bureauInitial, { color: bureau.color }]}>{bureau.name[0]}</Text>
              </View>
              <Text style={styles.settingLabel}>{bureau.name}</Text>
              <Switch
                value={bureauSettings[bureau.id as keyof typeof bureauSettings]}
                onValueChange={(value) => handleBureauToggle(bureau.id, value)}
                trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
                thumbColor={bureauSettings[bureau.id as keyof typeof bureauSettings] ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          ))}
        </Card>

        {/* Alert Types */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Alert Types</Text>
          <Text style={styles.sectionDescription}>Choose which alerts you want to receive</Text>
          {ALERT_TYPES.map((alert) => (
            <View key={alert.id} style={styles.settingRow}>
              <View style={styles.alertIcon}>
                <Ionicons name={alert.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.alertInfo}>
                <Text style={styles.settingLabel}>{alert.name}</Text>
                <Text style={styles.settingDescription}>{alert.description}</Text>
              </View>
              <Switch
                value={alertSettings[alert.id as keyof typeof alertSettings]}
                onValueChange={(value) => handleAlertToggle(alert.id, value)}
                trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
                thumbColor={alertSettings[alert.id as keyof typeof alertSettings] ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          ))}
        </Card>

        {/* Notification Channels */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          <Text style={styles.sectionDescription}>How you want to receive alerts</Text>
          <View style={styles.settingRow}>
            <Ionicons name="notifications" size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { marginLeft: 12 }]}>Push Notifications</Text>
            <Switch
              value={notificationSettings.push}
              onValueChange={(value) => handleNotificationToggle('push', value)}
              trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
              thumbColor={notificationSettings.push ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="mail" size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { marginLeft: 12 }]}>Email Alerts</Text>
            <Switch
              value={notificationSettings.email}
              onValueChange={(value) => handleNotificationToggle('email', value)}
              trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
              thumbColor={notificationSettings.email ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="chatbubble" size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { marginLeft: 12 }]}>SMS Alerts</Text>
            <Switch
              value={notificationSettings.sms}
              onValueChange={(value) => handleNotificationToggle('sms', value)}
              trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}50` }}
              thumbColor={notificationSettings.sms ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Pause Monitoring */}
        <TouchableOpacity style={styles.pauseButton} onPress={handlePauseMonitoring}>
          <Ionicons name="pause-circle" size={20} color="#EF4444" />
          <Text style={styles.pauseButtonText}>Pause All Monitoring</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  card: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  sectionDescription: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  bureauIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  bureauInitial: { fontSize: 16, fontWeight: '700' },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  alertInfo: { flex: 1 },
  settingLabel: { flex: 1, fontSize: 15, color: theme.colors.text },
  settingDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  pauseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, paddingVertical: theme.spacing.md, backgroundColor: '#FEE2E2', borderRadius: theme.borderRadius.lg },
  pauseButtonText: { fontSize: 15, fontWeight: '500', color: '#EF4444', marginLeft: 8 },
});

