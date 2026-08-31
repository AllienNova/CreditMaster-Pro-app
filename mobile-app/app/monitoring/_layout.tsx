/**
 * Fynvita Credit Monitoring Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function MonitoringLayout() {
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
        options={{
          title: "Credit Monitoring",
        // headerShown: false — this is the stack ROOT, and React Navigation
        // draws no back button on a root. Leaving the default on gave a
        // titled bar with nothing to press, above the screen's own header.
          headerShown: false,
        }}
      />
      <Stack.Screen name="alerts" options={{ headerShown: false, title: "Alerts" }} />
      <Stack.Screen name="alert-detail" options={{ title: "Alert Details" }} />
      <Stack.Screen
        name="settings"
        options={{ title: "Monitoring Settings", headerShown: false }}
      />
      <Stack.Screen name="bureaus" options={{ title: "Bureau Connections" }} />
      {/* Nested route: app/monitoring/alerts/[id].tsx has no layout of its own,
          so it registers here under its path-relative name. */}
      <Stack.Screen name="alerts/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
