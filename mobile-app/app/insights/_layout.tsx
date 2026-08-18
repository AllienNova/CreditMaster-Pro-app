/**
 * Fynvita Insights Layout
 * Navigation layout for AI-powered financial insights screens
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function InsightsLayout() {
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
        options={{ title: "Financial Insights", headerShown: false }}
      />
      <Stack.Screen name="alerts" options={{ title: "Smart Alerts" }} />
      <Stack.Screen
        name="weekly-summary"
        options={{ title: "Weekly Summary" }}
      />
      <Stack.Screen name="spending" options={{ title: "Spending Analysis" }} />
      <Stack.Screen name="nudges" options={{ title: "AI Recommendations" }} />
    </Stack>
  );
}
