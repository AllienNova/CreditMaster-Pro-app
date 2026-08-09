/**
 * Fynvita Dispute Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function DisputeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
