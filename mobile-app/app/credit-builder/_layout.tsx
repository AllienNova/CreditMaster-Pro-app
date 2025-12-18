/**
 * CPFI Credit Builder Navigation Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function CreditBuilderLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Credit Builder' }} />
      <Stack.Screen name="simulator" options={{ title: 'Score Simulator' }} />
      <Stack.Screen name="utilization" options={{ title: 'Credit Utilization' }} />
      <Stack.Screen name="payments" options={{ title: 'Payment History' }} />
      <Stack.Screen name="age" options={{ title: 'Credit Age' }} />
      <Stack.Screen name="mix" options={{ title: 'Credit Mix' }} />
      <Stack.Screen name="secured-card" options={{ title: 'Secured Cards' }} />
      <Stack.Screen name="authorized-user" options={{ title: 'Authorized User' }} />
      <Stack.Screen name="debt-strategy" options={{ title: 'Debt Strategy' }} />
      <Stack.Screen name="goodwill" options={{ title: 'Goodwill Letters' }} />
      <Stack.Screen name="pay-for-delete" options={{ title: 'Pay for Delete' }} />
      <Stack.Screen name="freeze" options={{ title: 'Credit Freeze' }} />
    </Stack>
  );
}

