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
          // Native header KEPT: this screen's `styles.header` is a risk-badge
          // block, not a nav bar — it carries no back control of its own, so
          // turning the native header off trapped it. audit:back-nav caught it.
          title: "Strategy Detail",
        }}
      />
    </Stack>
  );
}
