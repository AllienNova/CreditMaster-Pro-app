/**
 * Fynvita Identity Protection Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function IdentityLayout() {
  /**
   * No native header in this group: every screen draws its own header row, so
   * a native one stacked a second title above it. See credit-builder/_layout
   * for the full note — audit:back-nav stayed silent because two ways back is
   * not a trap, and it took a screenshot to see.
   */
  const headerOptions = {
    headerShown: false,
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
