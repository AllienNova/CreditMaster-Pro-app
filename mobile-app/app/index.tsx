import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/authStore";

/**
 * Root index - handles initial auth routing
 *
 * This is the entry point that Expo Router loads first.
 * It redirects to the appropriate screen based on auth state:
 * - Authenticated users -> main tabs
 * - Unauthenticated users -> login screen
 * - New users (no profile) -> onboarding flow
 */
export default function Index() {
  const { user, isLoading, onboardingCompleted } = useAuthStore();

  // While loading, return null (splash screen still visible)
  if (isLoading) {
    return null;
  }

  // Not authenticated -> go to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Authenticated but hasn't completed onboarding -> onboarding
  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  // Authenticated with completed onboarding -> main app
  return <Redirect href="/(tabs)" />;
}
