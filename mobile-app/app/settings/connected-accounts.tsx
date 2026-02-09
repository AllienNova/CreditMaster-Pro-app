/**
 * Fynvita Connected Accounts Settings Screen
 * Manage linked financial accounts and credit bureaus
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface ConnectedAccount {
  id: string;
  name: string;
  type: 'bank' | 'credit_bureau' | 'investment';
  institution: string;
  status: 'connected' | 'needs_attention' | 'disconnected';
  lastSync: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  { id: '1', name: 'Experian', type: 'credit_bureau', institution: 'Experian', status: 'connected', lastSync: '2 hours ago', icon: 'shield-checkmark' },
  { id: '2', name: 'Equifax', type: 'credit_bureau', institution: 'Equifax', status: 'connected', lastSync: '2 hours ago', icon: 'shield-checkmark' },
  { id: '3', name: 'TransUnion', type: 'credit_bureau', institution: 'TransUnion', status: 'needs_attention', lastSync: '3 days ago', icon: 'shield-checkmark' },
  { id: '4', name: 'Chase Checking', type: 'bank', institution: 'Chase', status: 'connected', lastSync: '5 min ago', icon: 'wallet' },
  { id: '5', name: 'Marcus Savings', type: 'bank', institution: 'Goldman Sachs', status: 'connected', lastSync: '1 hour ago', icon: 'cash' },
  { id: '6', name: 'Fidelity 401(k)', type: 'investment', institution: 'Fidelity', status: 'connected', lastSync: '1 day ago', icon: 'trending-up' },
];

const getStatusColor = (status: ConnectedAccount['status']): string => {
  const colors: Record<ConnectedAccount['status'], string> = {
    connected: '#22C55E', needs_attention: '#F59E0B', disconnected: '#EF4444'
  };
  return colors[status];
};

const getStatusLabel = (status: ConnectedAccount['status']): string => {
  const labels: Record<ConnectedAccount['status'], string> = {
    connected: 'Connected', needs_attention: 'Needs Attention', disconnected: 'Disconnected'
  };
  return labels[status];
};

export default function ConnectedAccountsScreen() {
  const [accounts, setAccounts] = useState(CONNECTED_ACCOUNTS);

  const handleDisconnect = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect ${account?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {
          setAccounts(accounts.filter(a => a.id !== accountId));
        }},
      ]
    );
  };

  const handleReconnect = (accountId: string) => {
    const newAccounts = accounts.map(a => 
      a.id === accountId ? { ...a, status: 'connected' as const, lastSync: 'Just now' } : a
    );
    setAccounts(newAccounts);
  };

  const creditBureaus = accounts.filter(a => a.type === 'credit_bureau');
  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const investmentAccounts = accounts.filter(a => a.type === 'investment');

  const renderAccount = (account: ConnectedAccount) => {
    const statusColor = getStatusColor(account.status);
    return (
      <Card key={account.id} style={styles.accountCard}>
        <View style={styles.accountRow}>
          <View style={[styles.accountIcon, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={account.icon} size={22} color={statusColor} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountInstitution}>{account.institution}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(account.status)}</Text>
              <Text style={styles.syncText}>• Synced {account.lastSync}</Text>
            </View>
          </View>
        </View>
        <View style={styles.accountActions}>
          {account.status === 'needs_attention' && (
            <TouchableOpacity style={styles.reconnectButton} onPress={() => handleReconnect(account.id)}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.disconnectButton} onPress={() => handleDisconnect(account.id)}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </Card>
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
          <Text style={styles.title}>Connected Accounts</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Credit Bureaus */}
        <Text style={styles.sectionTitle}>Credit Bureaus</Text>
        {creditBureaus.map(renderAccount)}

        {/* Bank Accounts */}
        <Text style={styles.sectionTitle}>Bank Accounts</Text>
        {bankAccounts.map(renderAccount)}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Link Bank Account</Text>
        </TouchableOpacity>

        {/* Investment Accounts */}
        <Text style={styles.sectionTitle}>Investment Accounts</Text>
        {investmentAccounts.map(renderAccount)}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Link Investment Account</Text>
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
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: 'row', alignItems: 'flex-start' },
  accountIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  accountInstitution: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  syncText: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },
  accountActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  reconnectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
  reconnectText: { fontSize: 12, fontWeight: '600', color: '#fff', marginLeft: 4 },
  disconnectButton: { paddingHorizontal: 12, paddingVertical: 6 },
  disconnectText: { fontSize: 12, fontWeight: '500', color: '#EF4444' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed', borderRadius: 12, marginTop: theme.spacing.sm },
  addButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginLeft: 8 },
});

