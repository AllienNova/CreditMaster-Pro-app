/**
 * Orders Screen
 * Order management with creation, viewing, and cancellation
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../../src/constants/theme';
import { useTradingStore } from '../../src/store/tradingStore';
import { OrderEntrySheet } from '../../src/components/trading/OrderEntrySheet';
import type { Order, OrderStatus } from '../../src/services/api/trading';

// ============================================================================
// TYPES
// ============================================================================

type FilterTab = 'all' | 'open' | 'filled' | 'canceled';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'filled':
      return '#10B981';
    case 'partially_filled':
      return '#3B82F6';
    case 'canceled':
    case 'rejected':
    case 'expired':
      return '#EF4444';
    case 'pending':
    case 'new':
    case 'accepted':
    default:
      return '#F59E0B';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================================
// COMPONENTS
// ============================================================================

function FilterTabs({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
}) {
  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'filled', label: 'Filled' },
    { id: 'canceled', label: 'Canceled' },
  ];

  return (
    <View style={styles.filterTabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.filterTab, activeTab === tab.id && styles.filterTabActive]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text
            style={[
              styles.filterTabText,
              activeTab === tab.id && styles.filterTabTextActive,
            ]}
          >
            {tab.label}
          </Text>
          {counts[tab.id] > 0 && (
            <View
              style={[
                styles.filterTabBadge,
                activeTab === tab.id && styles.filterTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  activeTab === tab.id && styles.filterTabBadgeTextActive,
                ]}
              >
                {counts[tab.id]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OrderCard({
  order,
  onCancel,
}: {
  order: Order;
  onCancel: (orderId: string) => void;
}) {
  const canCancel = ['new', 'pending', 'accepted'].includes(order.status);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel this ${order.side} order for ${order.symbol}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(order.id) },
      ]
    );
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderSymbolContainer}>
          <Text style={styles.orderSymbol}>{order.symbol}</Text>
          <View
            style={[
              styles.orderSideBadge,
              { backgroundColor: order.side === 'buy' ? '#10B98120' : '#EF444420' },
            ]}
          >
            <Text
              style={[
                styles.orderSideBadgeText,
                { color: order.side === 'buy' ? '#10B981' : '#EF4444' },
              ]}
            >
              {order.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.orderStatusBadge,
            { backgroundColor: `${getStatusColor(order.status)}20` },
          ]}
        >
          <Text
            style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}
          >
            {order.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Text style={styles.orderDetailLabel}>Type</Text>
          <Text style={styles.orderDetailValue}>{order.type.toUpperCase()}</Text>
        </View>
        <View style={styles.orderDetailRow}>
          <Text style={styles.orderDetailLabel}>Quantity</Text>
          <Text style={styles.orderDetailValue}>
            {order.filledQuantity
              ? `${order.filledQuantity} / ${order.quantity}`
              : order.quantity}
          </Text>
        </View>
        <View style={styles.orderDetailRow}>
          <Text style={styles.orderDetailLabel}>Price</Text>
          <Text style={styles.orderDetailValue}>
            {order.limitPrice ? `$${order.limitPrice.toFixed(2)}` : 'Market'}
          </Text>
        </View>
        {order.avgFilledPrice && (
          <View style={styles.orderDetailRow}>
            <Text style={styles.orderDetailLabel}>Filled Price</Text>
            <Text style={styles.orderDetailValue}>
              ${order.avgFilledPrice.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTime}>{formatDate(order.createdAt)}</Text>
        {canCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showOrderEntry, setShowOrderEntry] = useState(false);

  const {
    orders,
    openOrders,
    isLoading,
    isRefreshing,
    error,
    fetchOrders,
    cancelOrder,
    cancelAllOrders,
    refreshAll,
  } = useTradingStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'open':
        return ['new', 'pending', 'accepted', 'partially_filled'].includes(order.status);
      case 'filled':
        return order.status === 'filled';
      case 'canceled':
        return ['canceled', 'rejected', 'expired'].includes(order.status);
      default:
        return true;
    }
  });

  // Count orders by status
  const counts: Record<FilterTab, number> = {
    all: orders.length,
    open: orders.filter((o) =>
      ['new', 'pending', 'accepted', 'partially_filled'].includes(o.status)
    ).length,
    filled: orders.filter((o) => o.status === 'filled').length,
    canceled: orders.filter((o) =>
      ['canceled', 'rejected', 'expired'].includes(o.status)
    ).length,
  };

  const handleCancelAll = () => {
    if (openOrders.length === 0) return;

    Alert.alert(
      'Cancel All Orders',
      `Are you sure you want to cancel all ${openOrders.length} open orders?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel All', style: 'destructive', onPress: cancelAllOrders },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Orders',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowOrderEntry(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Filter Tabs */}
      <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* Cancel All Button */}
      {openOrders.length > 0 && activeTab !== 'filled' && activeTab !== 'canceled' && (
        <TouchableOpacity style={styles.cancelAllButton} onPress={handleCancelAll}>
          <Ionicons name="close-circle" size={18} color="#EF4444" />
          <Text style={styles.cancelAllButtonText}>
            Cancel All ({openOrders.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading && orders.length === 0 ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Orders</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'all'
                ? "You haven't placed any orders yet"
                : `No ${activeTab} orders`}
            </Text>
            {activeTab === 'all' && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowOrderEntry(true)}
              >
                <Text style={styles.emptyStateButtonText}>Place Order</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} onCancel={cancelOrder} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Order Entry Sheet */}
      <OrderEntrySheet
        visible={showOrderEntry}
        onClose={() => setShowOrderEntry(false)}
        onOrderCreated={() => {
          setShowOrderEntry(false);
          fetchOrders();
        }}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerButton: {
    padding: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterTabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTabBadgeTextActive: {
    color: '#FFFFFF',
  },
  cancelAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  cancelAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ordersList: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderSymbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  orderSideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderSideBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderDetailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  orderDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
});
