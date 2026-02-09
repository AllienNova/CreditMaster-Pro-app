/**
 * Fynvita Insights Layout
 * Navigation layout for AI-powered financial insights screens
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
      <Stack.Screen
        name="index"
        options={{ title: 'Financial Insights', headerShown: false }}
      />
      <Stack.Screen
        name="alerts"
        options={{ title: 'Smart Alerts' }}
      />
      <Stack.Screen
        name="weekly-summary"
        options={{ title: 'Weekly Summary' }}
      />
      <Stack.Screen
        name="spending"
        options={{ title: 'Spending Analysis' }}
      />
      <Stack.Screen
        name="nudges"
        options={{ title: 'AI Recommendations' }}
      />
    </Stack>
  );
}
