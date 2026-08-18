/**
 * Fynvita Identity Protection Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function IdentityLayout() {
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
          title: "Identity Protection",
        // headerShown: false — this is the stack ROOT, and React Navigation
        // draws no back button on a root. Leaving the default on gave a
        // titled bar with nothing to press, above the screen's own header.
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="dark-web"
        options={{ title: "Dark Web Monitoring" }}
      />
      <Stack.Screen
        name="breach-detail"
        options={{ title: "Breach Details" }}
      />
      <Stack.Screen
        name="ssn-monitoring"
        options={{ title: "SSN Monitoring" }}
      />
      <Stack.Screen
        name="insurance"
        options={{ title: "Identity Insurance" }}
      />
    </Stack>
  );
}
