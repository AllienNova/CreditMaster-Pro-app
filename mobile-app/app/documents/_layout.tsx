/**
 * Fynvita Documents Navigation Layout
 */

import { Stack } from 'expo-router';

export default function DocumentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Documents' }} />
      <Stack.Screen name="[id]" options={{ title: 'Document Detail' }} />
    </Stack>
  );
}

