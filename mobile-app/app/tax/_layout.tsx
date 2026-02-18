/**
 * Tax Module Layout
 *
 * Stack navigation for tax optimization screens
 */

import React from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TaxLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: "#F59E0B",
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#1C1917",
        },
        headerShadowVisible: Platform.OS === "ios",
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Tax Optimization",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="scenarios"
        options={{
          title: "Tax Scenarios",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="calendar"
        options={{
          title: "Tax Calendar",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="optimizer"
        options={{
          title: "Tax Optimizer",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="deductions"
        options={{
          title: "Deduction Tracker",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          title: "Tax Documents",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
