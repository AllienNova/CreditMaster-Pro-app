/**
 * Order Entry Sheet Component
 *
 * Bottom sheet for placing orders on mobile.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

interface OrderEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  symbol?: string;
  defaultSymbol?: string;
  currentPrice?: number;
  suggestedSide?: OrderSide;
  defaultSide?: OrderSide;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  onOrderCreated?: (order: CreatedOrder) => void;
  isPaperTrading?: boolean;
}

interface CreatedOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderEntrySheet({
  visible,
  onClose,
  symbol: initialSymbol = '',
  defaultSymbol,
  currentPrice,
  suggestedSide,
  defaultSide,
  suggestedStopLoss,
  suggestedTakeProfit,
  onOrderCreated,
  isPaperTrading = false,
}: OrderEntrySheetProps) {
  const effectiveSymbol = defaultSymbol || initialSymbol;
  const effectiveSide = defaultSide || suggestedSide || 'buy';
  const [symbol, setSymbol] = useState(effectiveSymbol);
  const [side, setSide] = useState<OrderSide>(effectiveSide);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState(currentPrice?.toFixed(2) || '');
  const [stopLoss, setStopLoss] = useState(suggestedStopLoss?.toFixed(2) || '');
  const [takeProfit, setTakeProfit] = useState(
    suggestedTakeProfit?.toFixed(2) || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setSymbol(defaultSymbol || initialSymbol);
      setSide(defaultSide || suggestedSide || 'buy');
      setLimitPrice(currentPrice?.toFixed(2) || '');
      setStopLoss(suggestedStopLoss?.toFixed(2) || '');
      setTakeProfit(suggestedTakeProfit?.toFixed(2) || '');
      setError(null);
    }
  }, [
    visible,
    initialSymbol,
    defaultSymbol,
    currentPrice,
    suggestedSide,
    defaultSide,
    suggestedStopLoss,
    suggestedTakeProfit,
  ]);

  // Calculate estimated value
  const estimatedValue = React.useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price =
      orderType === 'limit' ? parseFloat(limitPrice) || 0 : currentPrice || 0;
    return qty * price;
  }, [quantity, limitPrice, orderType, currentPrice]);

  // Calculate risk
  const estimatedRisk = React.useMemo(() => {
    if (!stopLoss || !limitPrice || !quantity) return null;
    const qty = parseFloat(quantity) || 0;
    const entry = parseFloat(limitPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    return Math.abs(entry - stop) * qty;
  }, [quantity, limitPrice, stopLoss]);

  // Submit order
  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validation
    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Valid quantity is required');
      return;
    }

    if (orderType === 'limit') {
      const price = parseFloat(limitPrice);
      if (!price || price <= 0) {
        setError('Valid limit price is required');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          symbol: symbol.toUpperCase(),
          side,
          type: orderType,
          quantity: qty,
          limitPrice:
            orderType === 'limit' ? parseFloat(limitPrice) : undefined,
          stopLossPrice: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfitPrice: takeProfit ? parseFloat(takeProfit) : undefined,
          timeInForce: 'day',
        }),
      });

      const data = await response.json();

      if (data.success && data.data.order) {
        onOrderCreated?.(data.data.order);
        onClose();
      } else {
        setError(
          data.validation?.errors?.[0]?.message || 'Failed to create order'
        );
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    symbol,
    side,
    orderType,
    quantity,
    limitPrice,
    stopLoss,
    takeProfit,
    onOrderCreated,
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Order</Text>
              {isPaperTrading && (
                <Text style={styles.paperBadge}>Paper Trading</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Symbol Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Symbol</Text>
              <TextInput
                style={styles.input}
                value={symbol}
                onChangeText={(text) => setSymbol(text.toUpperCase())}
                placeholder="AAPL"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>

            {/* Side Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Side</Text>
              <View style={styles.sideButtons}>
                <TouchableOpacity
                  style={[
                    styles.sideButton,
                    side === 'buy' && styles.buyButtonActive,
                  ]}
                  onPress={() => setSide('buy')}
                >
                  <Text
                    style={[
                      styles.sideButtonText,
                      side === 'buy' && styles.sideButtonTextActive,
                    ]}
                  >
                    Buy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sideButton,
                    side === 'sell' && styles.sellButtonActive,
                  ]}
                  onPress={() => setSide('sell')}
                >
                  <Text
                    style={[
                      styles.sideButtonText,
                      side === 'sell' && styles.sideButtonTextActive,
                    ]}
                  >
                    Sell
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Type Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Order Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    orderType === 'market' && styles.typeButtonActive,
                  ]}
                  onPress={() => setOrderType('market')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      orderType === 'market' && styles.typeButtonTextActive,
                    ]}
                  >
                    Market
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    orderType === 'limit' && styles.typeButtonActive,
                  ]}
                  onPress={() => setOrderType('limit')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      orderType === 'limit' && styles.typeButtonTextActive,
                    ]}
                  >
                    Limit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.field}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="100"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            {/* Limit Price (for limit orders) */}
            {orderType === 'limit' && (
              <View style={styles.field}>
                <Text style={styles.label}>Limit Price</Text>
                <TextInput
                  style={styles.input}
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Stop Loss */}
            <View style={styles.field}>
              <Text style={styles.label}>Stop Loss (optional)</Text>
              <TextInput
                style={styles.input}
                value={stopLoss}
                onChangeText={setStopLoss}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Take Profit */}
            <View style={styles.field}>
              <Text style={styles.label}>Take Profit (optional)</Text>
              <TextInput
                style={styles.input}
                value={takeProfit}
                onChangeText={setTakeProfit}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Order Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Value</Text>
                <Text style={styles.summaryValue}>
                  ${estimatedValue.toFixed(2)}
                </Text>
              </View>
              {estimatedRisk !== null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Risk at Stop</Text>
                  <Text style={[styles.summaryValue, styles.riskValue]}>
                    ${estimatedRisk.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                side === 'buy' ? styles.buyButton : styles.sellButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {side === 'buy' ? 'Buy' : 'Sell'} {symbol || 'Symbol'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  paperBadge: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  sideButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  buyButtonActive: {
    backgroundColor: '#10B981',
  },
  sellButtonActive: {
    backgroundColor: '#EF4444',
  },
  sideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sideButtonTextActive: {
    color: '#FFFFFF',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  summary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  riskValue: {
    color: '#EF4444',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#10B981',
  },
  sellButton: {
    backgroundColor: '#EF4444',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OrderEntrySheet;
