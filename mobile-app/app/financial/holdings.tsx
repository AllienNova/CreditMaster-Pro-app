/**
 * CPFI Holdings Management Screen
 * View, add, edit, and delete investment holdings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import {
  investmentsApi,
  type Holding as ApiHolding,
  type AssetType,
} from '../../src/services/api';

interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  type: AssetType;
  sector?: string;
}

// Transform API holding to local format
function transformHolding(apiHolding: ApiHolding): Holding {
  return {
    id: apiHolding.id,
    symbol: apiHolding.symbol,
    name: apiHolding.name,
    shares: apiHolding.quantity,
    avgCost: apiHolding.average_cost,
    currentPrice: apiHolding.current_price,
    value: apiHolding.current_value,
    gainLoss: apiHolding.gain_loss,
    gainLossPercent: apiHolding.gain_loss_percent,
    type: apiHolding.asset_type,
    sector: apiHolding.sector,
  };
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bond', label: 'Bond' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'option', label: 'Option' },
  { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  stock: '#8B5CF6',
  etf: '#3B82F6',
  crypto: '#F59E0B',
  bond: '#22C55E',
  mutual_fund: '#EC4899',
  option: '#14B8A6',
  other: '#6B7280',
};

export default function HoldingsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    shares: '',
    avgCost: '',
    type: 'stock' as AssetType,
  });

  const fetchHoldings = useCallback(async () => {
    try {
      setError(null);
      const response = await investmentsApi.getHoldings();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load holdings');
      }
      setHoldings(response.data.holdings.map(transformHolding));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load holdings';
      setError(errorMessage);
      console.error('Holdings fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchHoldings().finally(() => setLoading(false));
  }, [fetchHoldings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHoldings();
    setRefreshing(false);
  }, [fetchHoldings]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchHoldings().finally(() => setLoading(false));
  }, [fetchHoldings]);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalGainLoss = holdings.reduce((s, h) => s + h.gainLoss, 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);

  const formatCurrency = (n: number) =>
    `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const resetForm = () =>
    setFormData({
      symbol: '',
      name: '',
      shares: '',
      avgCost: '',
      type: 'stock',
    });

  const handleAddHolding = async () => {
    if (!formData.symbol || !formData.shares || !formData.avgCost) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    try {
      setSaving(true);
      const response = await investmentsApi.createHolding({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || formData.symbol.toUpperCase(),
        asset_type: formData.type,
        quantity: parseFloat(formData.shares),
        purchase_price: parseFloat(formData.avgCost),
      });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create holding');
      }
      // Add the new holding to local state
      setHoldings([...holdings, transformHolding(response.data.holding)]);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create holding';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEditHolding = async () => {
    if (!editingHolding || !formData.shares || !formData.avgCost) return;
    try {
      setSaving(true);
      const response = await investmentsApi.updateHolding(editingHolding.id, {
        quantity: parseFloat(formData.shares),
        average_cost: parseFloat(formData.avgCost),
      });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update holding');
      }
      // Update local state
      setHoldings(
        holdings.map((h) =>
          h.id === editingHolding.id
            ? transformHolding(response.data!.holding)
            : h
        )
      );
      setEditingHolding(null);
      resetForm();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update holding';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHolding = (id: string) => {
    Alert.alert(
      'Delete Holding',
      'Are you sure you want to delete this holding?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await investmentsApi.deleteHolding(id);
              if (!response.success) {
                throw new Error(
                  response.error?.message || 'Failed to delete holding'
                );
              }
              setHoldings(holdings.filter((h) => h.id !== id));
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : 'Failed to delete holding';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (holding: Holding) => {
    setEditingHolding(holding);
    setFormData({
      symbol: holding.symbol,
      name: holding.name,
      shares: holding.shares.toString(),
      avgCost: holding.avgCost.toString(),
      type: holding.type,
    });
  };

  const getTypeIcon = (type: AssetType): keyof typeof Ionicons.glyphMap => {
    const icons: Record<AssetType, keyof typeof Ionicons.glyphMap> = {
      stock: 'trending-up',
      etf: 'pie-chart',
      crypto: 'logo-bitcoin',
      bond: 'document-text',
      mutual_fund: 'layers',
      option: 'options',
      other: 'cash',
    };
    return icons[type] || 'cash';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading holdings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Holdings</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Holdings</Text>
            <Text style={styles.subtitle}>{holdings.length} positions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalValue)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      totalGainLoss >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {totalGainLoss >= 0 ? '+' : '-'}
                {formatCurrency(totalGainLoss)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Return</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      totalGainLoss >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {formatPercent((totalGainLoss / totalCost) * 100)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Holdings List */}
        <View style={styles.section}>
          {holdings.map((h) => (
            <TouchableOpacity
              key={h.id}
              onPress={() =>
                router.push(`/financial/stock-analysis?symbol=${h.symbol}`)
              }
              onLongPress={() => openEditModal(h)}
            >
              <Card style={styles.holdingCard}>
                <View style={styles.holdingRow}>
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: `${TYPE_COLORS[h.type]}15` },
                    ]}
                  >
                    <Ionicons
                      name={getTypeIcon(h.type)}
                      size={20}
                      color={TYPE_COLORS[h.type]}
                    />
                  </View>
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingSymbol}>{h.symbol}</Text>
                    <Text style={styles.holdingName}>{h.name}</Text>
                    <Text style={styles.holdingShares}>
                      {h.shares} shares @ {formatCurrency(h.avgCost)}
                    </Text>
                  </View>
                  <View style={styles.holdingValue}>
                    <Text style={styles.valueText}>
                      {formatCurrency(h.value)}
                    </Text>
                    <Text
                      style={[
                        styles.gainLossText,
                        {
                          color:
                            h.gainLoss >= 0
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {h.gainLoss >= 0 ? '+' : '-'}
                      {formatCurrency(h.gainLoss)}
                    </Text>
                    <Text
                      style={[
                        styles.percentText,
                        {
                          color:
                            h.gainLoss >= 0
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {formatPercent(h.gainLossPercent)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteHolding(h.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>Long press a holding to edit</Text>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || !!editingHolding}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHolding ? 'Edit Holding' : 'Add Holding'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setEditingHolding(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Symbol *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.symbol}
                onChangeText={(t) => setFormData({ ...formData, symbol: t })}
                placeholder="AAPL"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="characters"
                editable={!editingHolding}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="Apple Inc."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Shares *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.shares}
                  onChangeText={(t) => setFormData({ ...formData, shares: t })}
                  placeholder="10"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Avg Cost *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.avgCost}
                  onChangeText={(t) => setFormData({ ...formData, avgCost: t })}
                  placeholder="150.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Asset Type</Text>
              <View style={styles.typeSelector}>
                {ASSET_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      formData.type === t.value && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, type: t.value })}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        formData.type === t.value && { color: '#fff' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={editingHolding ? handleEditHolding : handleAddHolding}
            >
              <Text style={styles.submitButtonText}>
                {editingHolding ? 'Save Changes' : 'Add Holding'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  addButton: { padding: theme.spacing.sm },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 4,
  },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  holdingCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  holdingRow: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingInfo: { flex: 1, marginLeft: 12 },
  holdingSymbol: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  holdingName: { fontSize: 12, color: theme.colors.textSecondary },
  holdingShares: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingValue: { alignItems: 'flex-end', marginRight: 8 },
  valueText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  gainLossText: { fontSize: 12, marginTop: 2 },
  percentText: { fontSize: 11 },
  deleteButton: { padding: 8 },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginVertical: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  formGroup: { marginBottom: theme.spacing.md },
  formLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  formRow: { flexDirection: 'row' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  typeChipText: { fontSize: 12, color: theme.colors.text },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
