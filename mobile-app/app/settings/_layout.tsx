/**
 * Fynvita Settings Navigation Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function SettingsLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Settings', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Profile Settings', headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notification Settings', headerShown: false }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Security', headerShown: false }} />
      <Stack.Screen name="connected-accounts" options={{ title: 'Connected Accounts', headerShown: false }} />
      <Stack.Screen name="billing" options={{ title: 'Billing & Subscription', headerShown: false }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance', headerShown: false }} />
      <Stack.Screen name="data-export" options={{ title: 'Export Data', headerShown: false }} />
    </Stack>
  );
}

