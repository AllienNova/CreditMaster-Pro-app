/**
 * Student Loans Stack Navigator Layout
 */

import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function StudentLoansLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Student Loans",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Loan Details",
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: "Add Loan",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="strategies"
        options={{
          title: "Repayment Strategies",
        }}
      />
      <Stack.Screen
        name="eligibility"
        options={{
          title: "Federal Program Eligibility",
        }}
      />
    </Stack>
  );
}
