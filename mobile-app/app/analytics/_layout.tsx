/**
 * Fynvita Analytics Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function AnalyticsLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: "600" as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen
        name="index"
        options={{ title: "Analytics", headerShown: false }}
      />
      <Stack.Screen
        name="credit-score"
        options={{ title: "Credit Score Analytics", headerShown: false }}
      />
      <Stack.Screen
        name="disputes"
        options={{ title: "Dispute Analytics", headerShown: false }}
      />
      <Stack.Screen
        name="trends"
        options={{ title: "Trends", headerShown: false }}
      />
      <Stack.Screen
        name="reports"
        options={{ title: "Reports", headerShown: false }}
      />
    </Stack>
  );
}
