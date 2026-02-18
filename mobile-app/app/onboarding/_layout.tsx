/**
 * Fynvita Onboarding Layout
 * Stack navigator for onboarding flow
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
