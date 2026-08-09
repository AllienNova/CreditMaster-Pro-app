/**
 * Strategies Stack Navigator Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../../src/constants/theme";

export default function StrategiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Strategies",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Strategy Detail",
        }}
      />
    </Stack>
  );
}
