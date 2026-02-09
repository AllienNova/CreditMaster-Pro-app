/**
 * Fynvita Notification Settings Screen
 * Manage notification preferences
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface NotificationGroup {
  title: string;
  settings: NotificationSetting[];
}

export default function NotificationSettingsScreen() {
  const [groups, setGroups] = useState<NotificationGroup[]>([
    {
      title: 'Credit Alerts',
      settings: [
        { id: 'score_change', title: 'Score Changes', description: 'Get notified when your credit score changes', enabled: true },
        { id: 'new_account', title: 'New Accounts', description: 'Alert when new accounts appear on your report', enabled: true },
        { id: 'hard_inquiry', title: 'Hard Inquiries', description: 'Notify when someone checks your credit', enabled: true },
        { id: 'derogatory', title: 'Negative Items', description: 'Alert for new negative items on your report', enabled: true },
      ],
    },
    {
      title: 'Dispute Updates',
      settings: [
        { id: 'dispute_status', title: 'Status Changes', description: 'Updates on your dispute progress', enabled: true },
        { id: 'dispute_resolved', title: 'Resolution Alerts', description: 'Notify when disputes are resolved', enabled: true },
        { id: 'dispute_reminder', title: 'Follow-up Reminders', description: 'Reminders to follow up on disputes', enabled: false },
      ],
    },
    {
      title: 'Financial Alerts',
      settings: [
        { id: 'bill_due', title: 'Bill Reminders', description: 'Remind before bills are due', enabled: true },
        { id: 'low_balance', title: 'Low Balance', description: 'Alert when account balance is low', enabled: true },
        { id: 'large_transaction', title: 'Large Transactions', description: 'Notify for transactions over $500', enabled: false },
        { id: 'budget_exceeded', title: 'Budget Alerts', description: 'Alert when you exceed budget limits', enabled: true },
      ],
    },
    {
      title: 'Marketing & Tips',
      settings: [
        { id: 'tips', title: 'Credit Tips', description: 'Weekly tips to improve your credit', enabled: true },
        { id: 'offers', title: 'Personalized Offers', description: 'Credit card and loan recommendations', enabled: false },
        { id: 'newsletter', title: 'Newsletter', description: 'Monthly newsletter with insights', enabled: false },
      ],
    },
  ]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const toggleSetting = (groupIndex: number, settingId: string) => {
    const newGroups = [...groups];
    const setting = newGroups[groupIndex].settings.find(s => s.id === settingId);
    if (setting) {
      setting.enabled = !setting.enabled;
      setGroups(newGroups);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Delivery Methods */}
        <Text style={styles.sectionTitle}>Delivery Methods</Text>
        <Card style={styles.card}>
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}><Ionicons name="phone-portrait" size={20} color={theme.colors.primary} /></View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Push Notifications</Text>
              <Text style={styles.methodDescription}>Receive alerts on your device</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}><Ionicons name="mail" size={20} color={theme.colors.primary} /></View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Email Notifications</Text>
              <Text style={styles.methodDescription}>Receive alerts via email</Text>
            </View>
            <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}><Ionicons name="chatbubble" size={20} color={theme.colors.primary} /></View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>SMS Notifications</Text>
              <Text style={styles.methodDescription}>Receive text message alerts</Text>
            </View>
            <Switch value={smsEnabled} onValueChange={setSmsEnabled} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
          </View>
        </Card>

        {/* Notification Groups */}
        {groups.map((group, groupIndex) => (
          <View key={group.title}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <Card style={styles.card}>
              {group.settings.map((setting, settingIndex) => (
                <View key={setting.id}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>{setting.title}</Text>
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                    </View>
                    <Switch value={setting.enabled} onValueChange={() => toggleSetting(groupIndex, setting.id)} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
                  </View>
                  {settingIndex < group.settings.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ))}

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
  methodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  methodIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  methodDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  settingDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});

