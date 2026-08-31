import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/authStore";

/**
 * Root index — the ONE place that decides where a launch lands.
 *
 * | State                        | Destination           |
 * |------------------------------|-----------------------|
 * | loading                      | null (splash holds)   |
 * | signed out                   | /onboarding (welcome) |
 * | signed in, wizard incomplete | /onboarding/profile   |
 * | signed in, wizard complete   | /(tabs)               |
 *
 * Two things were crossed here.
 *
 * `/onboarding` is the four-slide MARKETING carousel and its button does
 * `router.replace("/(auth)/login")`. Sending an AUTHENTICATED user there —
 * which is what the old `!onboardingCompleted` branch did — walked them to a
 * login screen they were already past. It belongs on the signed-OUT branch,
 * where "Get Started" and "Already have an account? Sign In" both make sense.
 *
 * The four-screen setup wizard (profile → goals → connect → complete) is what
 * that branch actually wanted, and nothing in the app entered it. Since
 * complete.tsx is the only caller of completeOnboarding(), the column could
 * never become true, so the redirect fired on every single launch.
 *
 * Cost of putting the carousel on the signed-out branch: a returning user who
 * signed out sees it before login. They tap Skip or Sign In. The alternative —
 * a "welcome seen" flag — buys little for an async gate on the app's root.
 *
 * login.tsx and register.tsx both route back through here rather than picking a
 * destination themselves; three copies of this decision is how it drifted.
 */
export default function Index() {
  const { user, isLoading, onboardingCompleted } = useAuthStore();

  // While loading, return null (splash screen still visible)
  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding/profile" />;
  }

  return <Redirect href="/(tabs)" />;
}
