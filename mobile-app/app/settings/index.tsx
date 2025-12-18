/**
 * CPFI Settings Dashboard
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';

export default function SettingsScreen() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: 'person', title: 'Profile', route: '/settings/profile' },
        { icon: 'notifications', title: 'Notifications', route: '/settings/notifications' },
        { icon: 'shield', title: 'Privacy & Security', route: '/settings/privacy' },
      ],
    },
    {
      title: 'Connections',
      items: [
        { icon: 'link', title: 'Connected Accounts', route: '/settings/connected-accounts' },
        { icon: 'card', title: 'Billing & Subscription', route: '/settings/billing' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'color-palette', title: 'Appearance', route: '/settings/appearance' },
        { icon: 'download', title: 'Export Data', route: '/settings/data-export' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', title: 'Help & Support', route: '/help' },
        { icon: 'document-text', title: 'Terms of Service', route: '/help/guides?id=terms' },
        { icon: 'lock-closed', title: 'Privacy Policy', route: '/help/guides?id=privacy' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.settingItem, itemIndex === group.items.length - 1 && styles.lastItem]}
                  onPress={() => router.push(item.route as never)}
                >
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.colors.textSecondary} />
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { padding: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  settingsGroup: { marginBottom: theme.spacing.lg },
  groupTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  groupItems: { backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.lg },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lastItem: { borderBottomWidth: 0 },
  settingTitle: { flex: 1, fontSize: 16, color: theme.colors.text, marginLeft: theme.spacing.md },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginTop: theme.spacing.lg },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#EF4444', marginLeft: theme.spacing.sm },
  version: { textAlign: 'center', fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xl },
});

