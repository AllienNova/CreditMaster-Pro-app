import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';

interface SettingItem {
  id: string;
  label: string;
  icon: string;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  description?: string;
}

const SETTINGS_SECTIONS = [
  {
    title: 'Notifications',
    items: [
      { id: 'push', label: 'Push Notifications', icon: 'notifications-outline', type: 'toggle', value: true },
      { id: 'email', label: 'Email Notifications', icon: 'mail-outline', type: 'toggle', value: true },
      { id: 'sms', label: 'SMS Alerts', icon: 'chatbubble-outline', type: 'toggle', value: false },
      { id: 'score_alerts', label: 'Score Change Alerts', icon: 'trending-up-outline', type: 'toggle', value: true },
      { id: 'dispute_updates', label: 'Dispute Updates', icon: 'document-text-outline', type: 'toggle', value: true },
    ],
  },
  {
    title: 'Security',
    items: [
      { id: 'biometric', label: 'Biometric Login', icon: 'finger-print-outline', type: 'toggle', value: true, description: 'Use Face ID or fingerprint' },
      { id: 'two_factor', label: 'Two-Factor Auth', icon: 'shield-checkmark-outline', type: 'link' },
      { id: 'change_password', label: 'Change Password', icon: 'key-outline', type: 'link' },
      { id: 'sessions', label: 'Active Sessions', icon: 'phone-portrait-outline', type: 'link' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { id: 'data_sharing', label: 'Data Sharing', icon: 'share-outline', type: 'toggle', value: false },
      { id: 'analytics', label: 'Usage Analytics', icon: 'analytics-outline', type: 'toggle', value: true },
      { id: 'download_data', label: 'Download My Data', icon: 'download-outline', type: 'link' },
      { id: 'delete_account', label: 'Delete Account', icon: 'trash-outline', type: 'action' },
    ],
  },
  {
    title: 'App',
    items: [
      { id: 'dark_mode', label: 'Dark Mode', icon: 'moon-outline', type: 'toggle', value: false },
      { id: 'language', label: 'Language', icon: 'language-outline', type: 'link' },
      { id: 'clear_cache', label: 'Clear Cache', icon: 'trash-bin-outline', type: 'action' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push: true, email: true, sms: false, score_alerts: true, dispute_updates: true,
    biometric: true, data_sharing: false, analytics: true, dark_mode: false,
  });

  const handleToggle = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAction = (id: string) => {
    if (id === 'delete_account') {
      Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete account') },
      ]);
    } else if (id === 'clear_cache') {
      Alert.alert('Clear Cache', 'Cache cleared successfully!');
    }
  };

  const handleLink = (id: string) => {
    // Navigate to specific settings pages
    console.log('Navigate to:', id);
  };

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => {
        if (item.type === 'toggle') handleToggle(item.id);
        else if (item.type === 'action') handleAction(item.id);
        else handleLink(item.id);
      }}
      activeOpacity={item.type === 'toggle' ? 1 : 0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, item.id === 'delete_account' && styles.dangerIcon]}>
          <Ionicons name={item.icon as any} size={22} color={item.id === 'delete_account' ? '#EF4444' : lightTheme.colors.primary} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, item.id === 'delete_account' && styles.dangerText]}>{item.label}</Text>
          {item.description && <Text style={styles.settingDescription}>{item.description}</Text>}
        </View>
      </View>
      {item.type === 'toggle' ? (
        <Switch
          value={settings[item.id]}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{ false: lightTheme.colors.border, true: lightTheme.colors.primary + '60' }}
          thumbColor={settings[item.id] ? lightTheme.colors.primary : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={lightTheme.colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {SETTINGS_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(item => renderSettingItem(item as SettingItem))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.version}>CreditMaster Pro v1.0.0</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLink}>Terms of Service</Text></TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  content: { flex: 1 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: lightTheme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 8 },
  sectionContent: { backgroundColor: lightTheme.colors.surface },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: lightTheme.colors.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: lightTheme.colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  dangerIcon: { backgroundColor: '#FEE2E2' },
  settingInfo: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 16, color: lightTheme.colors.text },
  settingDescription: { fontSize: 12, color: lightTheme.colors.textSecondary, marginTop: 2 },
  dangerText: { color: '#EF4444' },
  footer: { alignItems: 'center', padding: 24, marginTop: 24 },
  version: { fontSize: 14, color: lightTheme.colors.textSecondary },
  footerLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footerLink: { fontSize: 14, color: lightTheme.colors.primary },
  footerDivider: { marginHorizontal: 8, color: lightTheme.colors.textSecondary },
});

