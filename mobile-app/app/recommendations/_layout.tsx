/**
 * Fynvita Recommendations Navigation Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function RecommendationsLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: "600" as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: "Recommendations" }} />
      <Stack.Screen
        name="credit-cards"
        options={{ title: "Credit Card Offers" }}
      />
      <Stack.Screen name="card-detail" options={{ title: "Card Details" }} />
      <Stack.Screen name="loans" options={{ title: "Loan Offers" }} />
      <Stack.Screen name="loan-detail" options={{ title: "Loan Details" }} />
      <Stack.Screen name="insights" options={{ title: "Financial Insights" }} />
    </Stack>
  );
}
