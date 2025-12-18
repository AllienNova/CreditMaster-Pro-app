/**
 * CPFI Admin User Management Screen
 * View and manage users
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface User {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Basic' | 'Premium' | 'Enterprise';
  status: 'Active' | 'Inactive' | 'Suspended';
  creditScore: number;
  joinDate: string;
}

const USERS: User[] = [
  { id: '1', name: 'John Smith', email: 'john@example.com', plan: 'Premium', status: 'Active', creditScore: 720, joinDate: '2024-01-15' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', plan: 'Basic', status: 'Active', creditScore: 680, joinDate: '2024-02-20' },
  { id: '3', name: 'Mike Wilson', email: 'mike@example.com', plan: 'Enterprise', status: 'Active', creditScore: 750, joinDate: '2023-11-10' },
  { id: '4', name: 'Emily Davis', email: 'emily@example.com', plan: 'Free', status: 'Inactive', creditScore: 620, joinDate: '2024-03-05' },
  { id: '5', name: 'Robert Brown', email: 'robert@example.com', plan: 'Premium', status: 'Suspended', creditScore: 690, joinDate: '2024-01-28' },
];

export default function AdminUsersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filters = ['all', 'Active', 'Inactive', 'Suspended'];

  const filteredUsers = USERS.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || user.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#22C55E';
      case 'Inactive': return '#F59E0B';
      case 'Suspended': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise': return '#8B5CF6';
      case 'Premium': return theme.colors.primary;
      case 'Basic': return '#3B82F6';
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity><Ionicons name="filter" size={24} color={theme.colors.text} /></TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor={theme.colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filters.map((filter) => (
          <TouchableOpacity key={filter} style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]} onPress={() => setSelectedFilter(filter)}>
            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'All Users' : filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}><Text style={styles.statValue}>{USERS.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statItem}><Text style={[styles.statValue, { color: '#22C55E' }]}>{USERS.filter(u => u.status === 'Active').length}</Text><Text style={styles.statLabel}>Active</Text></View>
        <View style={styles.statItem}><Text style={[styles.statValue, { color: '#F59E0B' }]}>{USERS.filter(u => u.status === 'Inactive').length}</Text><Text style={styles.statLabel}>Inactive</Text></View>
        <View style={styles.statItem}><Text style={[styles.statValue, { color: '#EF4444' }]}>{USERS.filter(u => u.status === 'Suspended').length}</Text><Text style={styles.statLabel}>Suspended</Text></View>
      </View>

      {/* Users List */}
      <FlatList data={filteredUsers} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} renderItem={({ item }) => (
        <Card style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatarCircle}><Text style={styles.avatarText}>{item.name.split(' ').map(n => n[0]).join('')}</Text></View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Plan</Text>
              <Text style={[styles.detailValue, { color: getPlanColor(item.plan) }]}>{item.plan}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Score</Text>
              <Text style={styles.detailValue}>{item.creditScore}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Joined</Text>
              <Text style={styles.detailValue}>{item.joinDate}</Text>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}><Ionicons name="eye" size={18} color={theme.colors.primary} /><Text style={styles.actionText}>View</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Ionicons name="mail" size={18} color={theme.colors.primary} /><Text style={styles.actionText}>Email</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
        </Card>
      )} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="people" size={48} color={theme.colors.textSecondary} /><Text style={styles.emptyTitle}>No users found</Text></View>} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, marginLeft: 8 },
  filterScroll: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: theme.spacing.sm, marginHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: theme.spacing.sm },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  listContent: { padding: theme.spacing.lg, paddingTop: 0 },
  userCard: { marginBottom: theme.spacing.sm },
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  userEmail: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  userDetails: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: theme.spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { fontSize: 13, color: theme.colors.primary, marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
});

