import { Stack } from "expo-router";

export default function BudgetingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="bills" />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="zero-based" />
      <Stack.Screen name="auto-save" />
    </Stack>
  );
}
