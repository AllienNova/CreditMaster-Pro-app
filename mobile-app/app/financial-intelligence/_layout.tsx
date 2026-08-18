/**
 * Financial Intelligence Navigation Layout
 * Stack navigator for Fynvita intelligent financial features
 */

import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

export default function FinancialIntelligenceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Financial Intelligence",
        // headerShown: false — this is the stack ROOT, and React Navigation
        // draws no back button on a root. Leaving the default on gave a
        // titled bar with nothing to press, above the screen's own header.
          // `headerLeft: undefined` used to sit here — someone saw the
          // back button and tried to remove it. Turning the bar off is the
          // actual fix; the screen supplies its own header.
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="smart-budget"
        options={{
          title: "Smart Budget",
        }}
      />
      <Stack.Screen
        name="goals-manager"
        options={{
          title: "Goals Manager",
        }}
      />
      <Stack.Screen
        name="spending-insights"
        options={{
          title: "Spending Insights",
        }}
      />
      <Stack.Screen
        name="bill-negotiator"
        options={{
          title: "Bill Negotiator",
        }}
      />
      <Stack.Screen
        name="ai-coach"
        options={{
          title: "AI Financial Coach",
        }}
      />
      <Stack.Screen
        name="debt-payoff"
        options={{
          title: "Debt Payoff Planner",
        }}
      />
      <Stack.Screen
        name="action-plan"
        options={{
          title: "Action Plan",
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: "Financial Chat",
        }}
      />
    </Stack>
  );
}
