import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../src/store/authStore";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { useTheme } from "../src/hooks/useTheme";
import { isPublicRoute } from "../src/navigation/route-access";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, fontWeight, isDark } = useTheme();
  const { initialize, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
    };
    init();
  }, [initialize]);

  const segments = useSegments();
  const router = useRouter();

  // Auth route guard (Finding 1): redirect unauthenticated users away from
  // protected routes so deep links cannot reach authenticated screens without
  // a session. Which routes are public is decided by isPublicRoute, which is
  // unit-tested — see src/navigation/route-access.ts.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublicRoute(segments)) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return null; // Splash screen is still visible
  }

  const headerOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: fontWeight.semibold },
  };

  return (
    <ErrorBoundary>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth Screens */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main Tab Navigation */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Onboarding Flow */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />

        {/* Credit Score Screens */}
        <Stack.Screen name="credit" options={{ headerShown: false }} />

        {/* Credit Monitoring Screens */}
        <Stack.Screen name="monitoring" options={{ headerShown: false }} />

        {/* Credit Builder Screens */}
        <Stack.Screen name="credit-builder" options={{ headerShown: false }} />

        {/* Dispute Screens — nested navigator; children (`[id]`, `create`,
            `wizard`, etc.) are owned by app/dispute/_layout.tsx */}
        <Stack.Screen name="dispute" options={{ headerShown: false }} />

        {/* Document Screens */}
        <Stack.Screen
          name="document/[id]"
          options={{
            headerShown: true,
            title: "Document Details",
            ...headerOptions,
          }}
        />

        {/* Financial Screens */}
        <Stack.Screen name="financial" options={{ headerShown: false }} />

        {/* Identity Protection Screens */}
        <Stack.Screen name="identity" options={{ headerShown: false }} />

        {/* Recommendations Screens */}
        <Stack.Screen name="recommendations" options={{ headerShown: false }} />

        {/* Marketplace Screens */}
        <Stack.Screen name="marketplace" options={{ headerShown: false }} />

        {/* Settings Screens */}
        <Stack.Screen name="settings" options={{ headerShown: false }} />

        {/* Analytics Screens */}
        <Stack.Screen name="analytics" options={{ headerShown: false }} />

        {/* Trading Screens */}
        <Stack.Screen name="trading" options={{ headerShown: false }} />

        {/* Investment Stack Screens */}
        <Stack.Screen name="investments" options={{ headerShown: false }} />

        {/* Coach Screens */}
        <Stack.Screen name="coach" options={{ headerShown: false }} />

        {/* Dashboard Screens */}
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />

        {/* Financial Intelligence Screens */}
        <Stack.Screen
          name="financial-intelligence"
          options={{ headerShown: false }}
        />

        {/* Help & Support Screens */}
        <Stack.Screen name="help" options={{ headerShown: false }} />

        {/* Web Handoff Screen */}
        <Stack.Screen name="handoff" options={{ headerShown: false }} />

        {/* Admin Screens */}
        <Stack.Screen name="admin" options={{ headerShown: false }} />

        {/* Billing Screens */}
        <Stack.Screen name="billing" options={{ headerShown: false }} />

        {/* Credit Repair Screens */}
        <Stack.Screen name="credit-repair" options={{ headerShown: false }} />

        {/* Documents Hub */}
        <Stack.Screen name="documents" options={{ headerShown: false }} />

        {/* Insights Screens */}
        <Stack.Screen name="insights" options={{ headerShown: false }} />

        {/* Rewards Screens */}
        <Stack.Screen name="rewards" options={{ headerShown: false }} />

        {/* Student Loans Screens */}
        <Stack.Screen name="student-loans" options={{ headerShown: false }} />

        {/* Tax Screens */}
        <Stack.Screen name="tax" options={{ headerShown: false }} />

        {/* Utility Screens */}
        <Stack.Screen
          name="notifications/index"
          options={{
            headerShown: true,
            title: "Notifications",
            ...headerOptions,
          }}
        />
        <Stack.Screen
          name="search/index"
          options={{ headerShown: true, title: "Search", ...headerOptions }}
        />
        <Stack.Screen
          name="chat/index"
          options={{
            headerShown: true,
            title: "AI Assistant",
            ...headerOptions,
          }}
        />
        <Stack.Screen
          name="activity/index"
          options={{ headerShown: true, title: "Activity", ...headerOptions }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
