/**
 * Fynvita Investment Analyze Layout
 * Stack navigation for analysis screens
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../../src/constants/theme';

export default function AnalyzeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="technical" />
      <Stack.Screen name="fundamental" />
      <Stack.Screen name="sentiment" />
      <Stack.Screen name="recommendation" />
    </Stack>
  );
}
