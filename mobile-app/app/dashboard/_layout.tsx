/**
 * Fynvita Dashboard Layout
 * All dashboard sub-pages with stack navigation
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="monitoring" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="spending" />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="vitality" />
    </Stack>
  );
}

