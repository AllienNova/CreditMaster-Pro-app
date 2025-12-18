/**
 * CPFI Dashboard Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ title: 'Credit Analytics' }} />
      <Stack.Screen name="progress" options={{ title: 'My Progress' }} />
    </Stack>
  );
}

