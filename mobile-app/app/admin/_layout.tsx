/**
 * CPFI Admin Navigation Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="users" options={{ title: 'User Management' }} />
      <Stack.Screen name="metrics" options={{ title: 'Metrics' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="audit" options={{ title: 'Audit Trail' }} />
      <Stack.Screen name="config" options={{ title: 'System Config' }} />
      <Stack.Screen name="disputes" options={{ title: 'All Disputes' }} />
      <Stack.Screen name="features" options={{ title: 'Feature Flags' }} />
      <Stack.Screen name="health" options={{ title: 'System Health' }} />
      <Stack.Screen name="logs" options={{ title: 'System Logs' }} />
      <Stack.Screen name="subscriptions" options={{ title: 'Subscriptions' }} />
    </Stack>
  );
}
