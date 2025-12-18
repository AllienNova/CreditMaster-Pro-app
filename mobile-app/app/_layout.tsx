import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { lightTheme as theme } from '../src/constants/theme';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
    };
    init();
  }, [initialize]);

  if (isLoading) {
    return null; // Splash screen is still visible
  }

  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
  };

  return (
    <ErrorBoundary>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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

        {/* Dispute Screens */}
        <Stack.Screen name="dispute/[id]" options={{ headerShown: true, title: 'Dispute Details', ...headerOptions }} />
        <Stack.Screen name="dispute/create" options={{ headerShown: true, title: 'New Dispute', ...headerOptions }} />
        <Stack.Screen name="dispute/wizard" options={{ headerShown: false }} />
        <Stack.Screen name="dispute/templates" options={{ headerShown: true, title: 'Templates', ...headerOptions }} />
        <Stack.Screen name="dispute/strategies" options={{ headerShown: true, title: 'Strategies', ...headerOptions }} />
        <Stack.Screen name="dispute/analytics" options={{ headerShown: true, title: 'Dispute Analytics', ...headerOptions }} />

        {/* Document Screens */}
        <Stack.Screen name="document/[id]" options={{ headerShown: true, title: 'Document Details', ...headerOptions }} />

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

        {/* Help & Support Screens */}
        <Stack.Screen name="help" options={{ headerShown: false }} />

        {/* Utility Screens */}
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications', ...headerOptions }} />
        <Stack.Screen name="search" options={{ headerShown: true, title: 'Search', ...headerOptions }} />
        <Stack.Screen name="chat" options={{ headerShown: true, title: 'AI Assistant', ...headerOptions }} />
        <Stack.Screen name="activity" options={{ headerShown: true, title: 'Activity', ...headerOptions }} />
      </Stack>
    </ErrorBoundary>
  );
}

