/**
 * Fynvita Dispute Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function DisputeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="new" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="create" />
      <Stack.Screen name="strategies" />
      <Stack.Screen name="templates" />
      <Stack.Screen name="use-strategy" />
      <Stack.Screen name="use-template" />
      <Stack.Screen name="wizard" />
    </Stack>
  );
}
