/**
 * Fynvita Marketplace Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function MarketplaceLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: "600" as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={{ ...headerOptions, headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ headerShown: true, title: "Marketplace" }}
      />
      <Stack.Screen name="secured-cards" options={{ title: "Secured Cards" }} />
      <Stack.Screen
        name="monitoring-services"
        options={{ title: "Monitoring Services" }}
      />
      <Stack.Screen name="education" options={{ title: "Credit Education" }} />
      <Stack.Screen name="attorneys" options={{ title: "Credit Attorneys" }} />
      <Stack.Screen name="community" options={{ title: "Community" }} />
      <Stack.Screen name="services" options={{ title: "Credit Services" }} />
      <Stack.Screen name="calculators" options={{ title: "Calculators" }} />
      <Stack.Screen name="tradelines" options={{ title: "Tradelines" }} />
      <Stack.Screen name="coaching" options={{ title: "Credit Coaching" }} />
      <Stack.Screen
        name="consolidation"
        options={{ title: "Debt Consolidation" }}
      />
      <Stack.Screen name="analysis" options={{ title: "Credit Analysis" }} />
    </Stack>
  );
}
