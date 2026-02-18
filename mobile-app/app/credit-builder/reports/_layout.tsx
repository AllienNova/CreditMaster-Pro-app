import { Stack } from "expo-router";

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="upload" />
    </Stack>
  );
}
