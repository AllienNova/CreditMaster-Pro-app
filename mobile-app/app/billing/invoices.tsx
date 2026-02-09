/**
 * Fynvita Invoices Screen
 * View all billing invoices
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Invoice { id: string; date: string; amount: number; status: 'paid' | 'pending' | 'failed'; description: string; }

const INVOICES: Invoice[] = [
  { id: 'INV-001', date: '2024-12-15', amount: 29.99, status: 'pending', description: 'Pro Plan - December 2024' },
  { id: 'INV-002', date: '2024-11-15', amount: 29.99, status: 'paid', description: 'Pro Plan - November 2024' },
  { id: 'INV-003', date: '2024-10-15', amount: 29.99, status: 'paid', description: 'Pro Plan - October 2024' },
  { id: 'INV-004', date: '2024-09-15', amount: 29.99, status: 'paid', description: 'Pro Plan - September 2024' },
  { id: 'INV-005', date: '2024-08-15', amount: 29.99, status: 'paid', description: 'Pro Plan - August 2024' },
  { id: 'INV-006', date: '2024-07-15', amount: 9.99, status: 'paid', description: 'Basic Plan - July 2024' },
  { id: 'INV-007', date: '2024-06-15', amount: 9.99, status: 'paid', description: 'Basic Plan - June 2024' },
];

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'failed': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const filteredInvoices = filter ? INVOICES.filter(i => i.status === filter) : INVOICES;
  const totalPaid = INVOICES.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>Billing history</Text>
          </View>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{INVOICES.length}</Text>
              <Text style={styles.summaryLabel}>Total Invoices</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>${totalPaid.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Paid</Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'paid', 'pending', 'failed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, (filter === status || (status === 'All' && !filter)) && styles.filterChipActive]}
              onPress={() => setFilter(status === 'All' ? null : status)}
            >
              <Text style={[styles.filterText, (filter === status || (status === 'All' && !filter)) && styles.filterTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invoices List */}
        <View style={styles.invoicesList}>
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceIdBadge}>
                  <Text style={styles.invoiceId}>{invoice.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(invoice.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>{invoice.status}</Text>
                </View>
              </View>
              <Text style={styles.invoiceDesc}>{invoice.description}</Text>
              <View style={styles.invoiceFooter}>
                <Text style={styles.invoiceDate}>{invoice.date}</Text>
                <Text style={styles.invoiceAmount}>${invoice.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.invoiceActions}>
                <TouchableOpacity style={styles.invoiceAction}>
                  <Ionicons name="eye-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.invoiceAction}>
                  <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Download</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  exportButton: { padding: theme.spacing.sm },
  summaryCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  filterRow: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 16, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  invoicesList: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  invoiceCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceIdBadge: { backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  invoiceId: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  invoiceDesc: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  invoiceDate: { fontSize: 12, color: theme.colors.textSecondary },
  invoiceAmount: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  invoiceActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  invoiceAction: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionText: { fontSize: 13, color: theme.colors.primary, marginLeft: 4 },
});

