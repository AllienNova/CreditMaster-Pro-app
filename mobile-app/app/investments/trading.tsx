/**
 * Trading Screen
 * Professional trading interface with real-time charts and trade execution
 */

import React, { useState, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { TradingChartScreen } from "../../src/components/trading/TradingChartScreen";
import { lightTheme as theme } from "../../src/constants/theme";

export default function TradingScreen() {
  const params = useLocalSearchParams<{ symbol?: string }>();
  const [symbol, setSymbol] = useState(params.symbol || "AAPL");

  const handleBuy = useCallback(
    (price: number) => {
      Alert.alert("Buy Order", `Buy ${symbol} at $${price.toFixed(2)}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Alert.alert(
              "Order Placed",
              `Buy order for ${symbol} submitted at $${price.toFixed(2)}`,
            );
          },
        },
      ]);
    },
    [symbol],
  );

  const handleSell = useCallback(
    (price: number) => {
      Alert.alert("Sell Order", `Sell ${symbol} at $${price.toFixed(2)}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Alert.alert(
              "Order Placed",
              `Sell order for ${symbol} submitted at $${price.toFixed(2)}`,
            );
          },
        },
      ]);
    },
    [symbol],
  );

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Trade ${symbol}`,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: "600" },
        }}
      />

      <TradingChartScreen
        symbol={symbol}
        onSymbolChange={handleSymbolChange}
        onBuy={handleBuy}
        onSell={handleSell}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
