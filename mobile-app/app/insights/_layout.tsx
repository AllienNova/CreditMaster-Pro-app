/**
 * CPFI Insights Layout
 * Navigation layout for financial insights screens
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function InsightsLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Financial Insights' }} />
    </Stack>
  );
}

