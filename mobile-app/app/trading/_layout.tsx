/**
 * Trading Stack Navigator Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function TradingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Trading',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />
      <Stack.Screen
        name="positions"
        options={{
          title: 'Positions',
        }}
      />
      <Stack.Screen
        name="signals"
        options={{
          title: 'Trading Signals',
        }}
      />
      <Stack.Screen
        name="risk"
        options={{
          title: 'Risk Management',
        }}
      />
      <Stack.Screen
        name="paper"
        options={{
          title: 'Paper Trading',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Trade History',
        }}
      />
      <Stack.Screen
        name="chart"
        options={{
          title: 'Chart',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
