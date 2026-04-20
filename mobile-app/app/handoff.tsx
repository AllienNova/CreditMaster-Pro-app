/**
 * Fynvita Handoff Screen
 * Handles fynvita://continue?route=... deep links from QR codes.
 * Parses the route param and navigates to the destination.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../src/constants/theme";

/** Allowed route prefixes for security — prevents navigation to arbitrary paths */
const ALLOWED_PREFIXES = [
  "/",
  "/(tabs)",
  "/settings",
  "/financial",
  "/credit",
  "/trading",
  "/investments",
  "/dashboard",
  "/analytics",
  "/disputes",
  "/documents",
  "/coach",
  "/onboarding",
];

function isAllowedRoute(route: string): boolean {
  if (!route.startsWith("/")) return false;
  return ALLOWED_PREFIXES.some((prefix) => route.startsWith(prefix));
}

export default function HandoffScreen() {
  const params = useLocalSearchParams<{ route?: string }>();
  const navigated = useRef(false);

  // Pulsing dots animation
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const delay = 150;
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
    );
    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, delay);
    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, delay * 2);
  }, [dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  useEffect(() => {
    if (navigated.current) return;

    const raw = params.route;
    let destination = "/(tabs)";

    if (raw) {
      const decoded = decodeURIComponent(raw);
      if (isAllowedRoute(decoded)) {
        destination = decoded;
      }
    }

    // Brief pause to show the handoff animation, then navigate
    const timer = setTimeout(() => {
      navigated.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(destination as any);
    }, 900);

    return () => clearTimeout(timer);
  }, [params.route]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Logo mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>F</Text>
        </View>

        <Text style={styles.heading}>Continuing from web</Text>
        <Text style={styles.subheading}>Taking you to the right place</Text>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.white,
  },
  heading: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subheading: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.secondary,
  },
});
