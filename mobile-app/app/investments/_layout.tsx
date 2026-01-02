/**
 * Investment Stack Navigator Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function InvestmentLayout() {
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
          title: 'Portfolio',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="holdings"
        options={{
          title: 'Holdings',
        }}
      />
      <Stack.Screen
        name="analyze/[symbol]"
        options={{
          title: 'Stock Analysis',
        }}
      />
      <Stack.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
        }}
      />
      <Stack.Screen
        name="add-holding"
        options={{
          title: 'Add Holding',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
