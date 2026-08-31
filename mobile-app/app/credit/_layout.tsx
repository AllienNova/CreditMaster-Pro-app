/**
 * Fynvita Credit Score Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function CreditLayout() {
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
        options={{ title: "Credit Score", headerShown: false }}
      />
      <Stack.Screen name="score-detail" options={{ headerShown: false, title: "Score Details" }} />
      <Stack.Screen name="history" options={{ headerShown: false, title: "Score History" }} />
      <Stack.Screen name="factors" options={{ headerShown: false, title: "Credit Factors" }} />
      <Stack.Screen
        name="bureau-comparison"
        options={{ title: "Bureau Comparison" }}
      />
    </Stack>
  );
}
