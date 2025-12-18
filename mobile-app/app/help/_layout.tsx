/**
 * CPFI Help & Support Navigation Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function HelpLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Help & Support', headerShown: false }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ', headerShown: false }} />
      <Stack.Screen name="contact" options={{ title: 'Contact Support', headerShown: false }} />
      <Stack.Screen name="guides" options={{ title: 'Guides', headerShown: false }} />
      <Stack.Screen name="guide-detail" options={{ title: 'Guide', headerShown: false }} />
    </Stack>
  );
}

