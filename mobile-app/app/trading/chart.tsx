/**
 * Trading Chart Screen
 * Full-screen chart with indicators and order entry
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { useTradingStore } from "../../src/store/tradingStore";
import { OrderEntrySheet } from "../../src/components/trading/OrderEntrySheet";
import { LineChart } from "../../src/components/charts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// TYPES
// ============================================================================

type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1D";

interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatPrice = (price: number): string => {
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  }
  return volume.toString();
};

const formatChange = (
  current: number,
  previous: number,
): { value: string; percent: string; isPositive: boolean } => {
  const change = current - previous;
  const percentChange = (change / previous) * 100;
  const isPositive = change >= 0;
  return {
    value: `${isPositive ? "+" : ""}$${Math.abs(change).toFixed(2)}`,
    percent: `${isPositive ? "+" : ""}${percentChange.toFixed(2)}%`,
    isPositive,
  };
};

// Generate mock chart data
const generateMockData = (
  symbol: string,
  timeframe: TimeFrame,
): PriceData[] => {
  const data: PriceData[] = [];
  const now = new Date();
  let basePrice = 150 + Math.random() * 100;

  const points =
    timeframe === "1m"
      ? 60
      : timeframe === "5m"
        ? 60
        : timeframe === "15m"
          ? 48
          : timeframe === "1h"
            ? 24
            : timeframe === "4h"
              ? 30
              : 60;
  const intervalMs =
    timeframe === "1m"
      ? 60000
      : timeframe === "5m"
        ? 300000
        : timeframe === "15m"
          ? 900000
          : timeframe === "1h"
            ? 3600000
            : timeframe === "4h"
              ? 14400000
              : 86400000;

  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMs);
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * 0.5;
    const low = Math.min(open, close) - Math.random() * 0.5;
    const volume = Math.floor(100000 + Math.random() * 900000);

    data.push({
      time: time.toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return data;
};

// ============================================================================
// COMPONENTS
// ============================================================================

function TimeFrameSelector({
  activeTimeFrame,
  onTimeFrameChange,
}: {
  activeTimeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
}) {
  const timeFrames: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1D"];

  return (
    <View style={styles.timeFrameContainer}>
      {timeFrames.map((tf) => (
        <TouchableOpacity
          key={tf}
          style={[
            styles.timeFrameButton,
            activeTimeFrame === tf && styles.timeFrameButtonActive,
          ]}
          onPress={() => onTimeFrameChange(tf)}
        >
          <Text
            style={[
              styles.timeFrameText,
              activeTimeFrame === tf && styles.timeFrameTextActive,
            ]}
          >
            {tf}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PriceHeader({
  symbol,
  currentPrice,
  previousClose,
  high,
  low,
  volume,
}: {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  high: number;
  low: number;
  volume: number;
}) {
  const change = formatChange(currentPrice, previousClose);

  return (
    <View style={styles.priceHeader}>
      <View style={styles.priceMainContainer}>
        <Text style={styles.symbolText}>{symbol}</Text>
        <Text style={styles.priceText}>{formatPrice(currentPrice)}</Text>
        <View style={styles.changeContainer}>
          <Text
            style={[
              styles.changeText,
              { color: change.isPositive ? "#10B981" : "#EF4444" },
            ]}
          >
            {change.value}
          </Text>
          <Text
            style={[
              styles.changeText,
              { color: change.isPositive ? "#10B981" : "#EF4444" },
            ]}
          >
            ({change.percent})
          </Text>
        </View>
      </View>
      <View style={styles.priceStatsContainer}>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>High</Text>
          <Text style={styles.priceStatValue}>{formatPrice(high)}</Text>
        </View>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>Low</Text>
          <Text style={styles.priceStatValue}>{formatPrice(low)}</Text>
        </View>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>Volume</Text>
          <Text style={styles.priceStatValue}>{formatVolume(volume)}</Text>
        </View>
      </View>
    </View>
  );
}

function ChartPlaceholder({
  data,
  isLoading,
}: {
  data: PriceData[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.chartPlaceholder}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.chartLoadingText}>Loading chart data...</Text>
      </View>
    );
  }

  // Convert data for LineChart
  const chartData = data.map((d) => ({
    label: new Date(d.time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: d.close,
  }));

  const lastPrice = data[data.length - 1]?.close ?? 0;
  const firstPrice = data[0]?.close ?? 0;
  const isPositive = lastPrice >= firstPrice;

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={chartData}
        height={280}
        width={SCREEN_WIDTH - 32}
        color={isPositive ? "#10B981" : "#EF4444"}
        showDots={false}
        showGrid={true}
      />
    </View>
  );
}

function QuickTradeButtons({
  onBuy,
  onSell,
}: {
  onBuy: () => void;
  onSell: () => void;
}) {
  return (
    <View style={styles.quickTradeContainer}>
      <TouchableOpacity
        style={[styles.quickTradeButton, styles.buyButton]}
        onPress={onBuy}
      >
        <Ionicons name="trending-up" size={20} color="#FFFFFF" />
        <Text style={styles.quickTradeButtonText}>Buy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quickTradeButton, styles.sellButton]}
        onPress={onSell}
      >
        <Ionicons name="trending-down" size={20} color="#FFFFFF" />
        <Text style={styles.quickTradeButtonText}>Sell</Text>
      </TouchableOpacity>
    </View>
  );
}

function IndicatorPanel() {
  return (
    <View style={styles.indicatorPanel}>
      <Text style={styles.indicatorTitle}>Technical Indicators</Text>
      <View style={styles.indicatorGrid}>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>RSI (14)</Text>
          <Text style={[styles.indicatorValue, { color: "#F59E0B" }]}>
            54.32
          </Text>
          <Text style={styles.indicatorStatus}>Neutral</Text>
        </View>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>MACD</Text>
          <Text style={[styles.indicatorValue, { color: "#10B981" }]}>
            +0.45
          </Text>
          <Text style={styles.indicatorStatus}>Bullish</Text>
        </View>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>SMA 20</Text>
          <Text style={styles.indicatorValue}>$175.50</Text>
          <Text style={styles.indicatorStatus}>Above</Text>
        </View>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>SMA 50</Text>
          <Text style={styles.indicatorValue}>$168.25</Text>
          <Text style={styles.indicatorStatus}>Above</Text>
        </View>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>Volume</Text>
          <Text style={[styles.indicatorValue, { color: "#10B981" }]}>
            1.5x Avg
          </Text>
          <Text style={styles.indicatorStatus}>High</Text>
        </View>
        <View style={styles.indicatorItem}>
          <Text style={styles.indicatorLabel}>ATR (14)</Text>
          <Text style={styles.indicatorValue}>$2.35</Text>
          <Text style={styles.indicatorStatus}>Normal</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradingChartScreen() {
  const params = useLocalSearchParams<{ symbol?: string }>();
  const symbol = params.symbol || "AAPL";

  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1h");
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");

  const { setSelectedSymbol } = useTradingStore();

  useEffect(() => {
    setSelectedSymbol(symbol);
    loadChartData();
  }, [symbol, timeFrame]);

  const loadChartData = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const data = generateMockData(symbol, timeFrame);
      setChartData(data);
      setIsLoading(false);
    }, 500);
  }, [symbol, timeFrame]);

  const handleBuy = () => {
    setOrderSide("buy");
    setShowOrderEntry(true);
  };

  const handleSell = () => {
    setOrderSide("sell");
    setShowOrderEntry(true);
  };

  // Calculate stats from data
  const currentPrice = chartData[chartData.length - 1]?.close ?? 0;
  const previousClose = chartData[chartData.length - 2]?.close ?? currentPrice;
  const high = Math.max(...chartData.map((d) => d.high), 0);
  const low = Math.min(
    ...chartData.filter((d) => d.low > 0).map((d) => d.low),
    currentPrice,
  );
  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: symbol,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons
                  name="star-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Price Header */}
        <PriceHeader
          symbol={symbol}
          currentPrice={currentPrice}
          previousClose={previousClose}
          high={high}
          low={low}
          volume={totalVolume}
        />

        {/* Time Frame Selector */}
        <TimeFrameSelector
          activeTimeFrame={timeFrame}
          onTimeFrameChange={setTimeFrame}
        />

        {/* Chart */}
        <ChartPlaceholder data={chartData} isLoading={isLoading} />

        {/* Quick Trade Buttons */}
        <QuickTradeButtons onBuy={handleBuy} onSell={handleSell} />

        {/* Indicators */}
        <IndicatorPanel />
      </ScrollView>

      {/* Order Entry Sheet */}
      <OrderEntrySheet
        visible={showOrderEntry}
        onClose={() => setShowOrderEntry(false)}
        onOrderCreated={() => {
          setShowOrderEntry(false);
        }}
        defaultSymbol={symbol}
        defaultSide={orderSide}
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
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  priceHeader: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  priceMainContainer: {
    marginBottom: 16,
  },
  symbolText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
  },
  changeContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  changeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  priceStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  priceStat: {
    alignItems: "center",
  },
  priceStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  priceStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  timeFrameContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  timeFrameButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeFrameText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  timeFrameTextActive: {
    color: "#FFFFFF",
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  chartPlaceholder: {
    height: 300,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  chartLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quickTradeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quickTradeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyButton: {
    backgroundColor: "#10B981",
  },
  sellButton: {
    backgroundColor: "#EF4444",
  },
  quickTradeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  indicatorPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
  },
  indicatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  indicatorItem: {
    width: "33.33%",
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  indicatorLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  indicatorStatus: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
