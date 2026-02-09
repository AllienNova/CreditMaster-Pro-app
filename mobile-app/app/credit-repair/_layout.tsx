/**
 * Fynvita Credit Repair Navigation Layout
 */

import { Stack } from 'expo-router';

export default function CreditRepairLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Credit Repair' }} />
      <Stack.Screen name="disputes" options={{ title: 'Disputes' }} />
      <Stack.Screen name="building" options={{ title: 'Credit Building' }} />
      <Stack.Screen name="cards" options={{ title: 'Credit Cards' }} />
      <Stack.Screen name="goodwill" options={{ title: 'Goodwill Letters' }} />
      <Stack.Screen name="inquiries" options={{ title: 'Inquiries' }} />
      <Stack.Screen name="negotiate" options={{ title: 'Negotiate' }} />
      <Stack.Screen name="payments" options={{ title: 'Payments' }} />
    </Stack>
  );
}

