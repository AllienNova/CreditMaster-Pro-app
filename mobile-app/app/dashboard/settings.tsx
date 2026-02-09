/**
 * Fynvita Settings Dashboard Screen
 * User settings, notifications, security, and billing
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface UserSettings {
  fullName: string;
  email: string;
  phone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    disputeUpdates: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
  };
}

const INITIAL_SETTINGS: UserSettings = {
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1 (555) 123-4567',
  notifications: {
    email: true,
    sms: false,
    disputeUpdates: true,
    weeklyReport: true,
    marketingEmails: false,
  },
};

type TabType = 'profile' | 'notifications' | 'security' | 'billing';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'notifications', label: 'Alerts', icon: 'notifications' },
    { id: 'security', label: 'Security', icon: 'shield-checkmark' },
    { id: 'billing', label: 'Billing', icon: 'card' },
  ];

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const updateNotification = (key: keyof UserSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'A password reset link has been sent to your email.');
  };

  const handleEnable2FA = () => {
    Alert.alert('Two-Factor Authentication', 'Follow the link to set up 2FA for your account.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={activeTab === tab.id ? '#fff' : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={settings.fullName}
                onChangeText={(text) => setSettings({ ...settings, fullName: text })}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={settings.email}
                onChangeText={(text) => setSettings({ ...settings, email: text })}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={settings.phone}
                onChangeText={(text) => setSettings({ ...settings, phone: text })}
                placeholder="Enter your phone"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </Card>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>

            {[
              { key: 'email' as const, label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'sms' as const, label: 'SMS Notifications', desc: 'Receive text message alerts' },
              { key: 'disputeUpdates' as const, label: 'Dispute Updates', desc: 'Status change notifications' },
              { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Weekly progress summary' },
              { key: 'marketingEmails' as const, label: 'Marketing Emails', desc: 'Promotional offers and tips' },
            ].map((item) => (
              <View key={item.key} style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>{item.label}</Text>
                  <Text style={styles.switchDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={settings.notifications[item.key]}
                  onValueChange={() => updateNotification(item.key)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                  thumbColor={settings.notifications[item.key] ? theme.colors.primary : '#f4f4f4'}
                />
              </View>
            ))}
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Security Settings</Text>

            <TouchableOpacity style={styles.securityButton} onPress={handleChangePassword}>
              <View style={styles.securityButtonContent}>
                <Ionicons name="key-outline" size={22} color={theme.colors.text} />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>Change Password</Text>
                  <Text style={styles.securityButtonDesc}>Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.securityButton} onPress={handleEnable2FA}>
              <View style={styles.securityButtonContent}>
                <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.text} />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>Two-Factor Authentication</Text>
                  <Text style={styles.securityButtonDesc}>Add extra security layer</Text>
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Recommended</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.securityButton}>
              <View style={styles.securityButtonContent}>
                <Ionicons name="phone-portrait-outline" size={22} color={theme.colors.text} />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>Active Sessions</Text>
                  <Text style={styles.securityButtonDesc}>Manage logged in devices</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Billing & Subscription</Text>

            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planLabel}>Current Plan</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>Premium</Text>
                </View>
              </View>
              <Text style={styles.planPrice}>$79/month</Text>
              <Text style={styles.planRenewal}>Renews Dec 15, 2024</Text>
            </View>

            <View style={styles.billingActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/pricing')}
              >
                <Text style={styles.primaryButtonText}>Upgrade Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="card-outline" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonText}>Manage Payment Method</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton}>
                <Ionicons name="receipt-outline" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonText}>View Billing History</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
          {saved && (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={styles.savedText}>Changes saved</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },

  tabsContainer: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  tabsContent: { gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.surface, gap: 6 },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff' },

  scrollView: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.lg },

  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  switchDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  securityButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  securityButtonContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityButtonInfo: { flex: 1 },
  securityButtonLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  securityButtonDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: theme.colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },

  planCard: { backgroundColor: theme.colors.primary + '10', padding: 16, borderRadius: 12, marginBottom: 16 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontSize: 13, color: theme.colors.textSecondary },
  planBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  planBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  planPrice: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  planRenewal: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },

  billingActions: { gap: 12 },
  primaryButton: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: '500', color: theme.colors.text },

  saveContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { fontSize: 14, color: theme.colors.success, fontWeight: '500' },
});
