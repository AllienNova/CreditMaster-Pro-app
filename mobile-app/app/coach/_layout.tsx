/**
 * AI Financial Coach Layout
 */

import { Stack } from "expo-router";
import { useTheme } from "../../src/hooks/useTheme";

export default function CoachLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "AI Financial Coach",
        }}
      />
      <Stack.Screen
        name="recommendations"
        options={{
          title: "Recommendations",
        }}
      />
      <Stack.Screen
        name="goals"
        options={{
          title: "Financial Goals",
        }}
      />
      <Stack.Screen
        name="goal-detail"
        options={{
          title: "Goal Details",
        }}
      />
      <Stack.Screen
        name="budget"
        options={{
          title: "Budget Optimizer",
        }}
      />
      <Stack.Screen
        name="debt-strategy"
        options={{
          title: "Debt Strategy",
        }}
      />
    </Stack>
  );
}
