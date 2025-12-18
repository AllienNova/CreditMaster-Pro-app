/**
 * CPFI Billing Navigation Layout
 */

import { Stack } from 'expo-router';

export default function BillingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Billing' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
      <Stack.Screen name="invoices" options={{ title: 'Invoices' }} />
    </Stack>
  );
}

