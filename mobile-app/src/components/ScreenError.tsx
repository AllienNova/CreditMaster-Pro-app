/**
 * The state a screen shows when its data will not load.
 *
 * WHY THIS EXISTS. Error branches were written per screen, and most of them
 * dropped the screen's own header — `credit-builder/age`, `credit-repair/
 * goodwill`, `admin/health`, `dashboard/analytics` and others rendered an
 * icon, a message and a Try Again button, and nothing else. Three
 * accessibility nodes.
 *
 * That is two problems in one.
 *
 *   FOR THE USER. Landing on an error state with no title and no back control
 *   means you cannot tell which screen failed, and you cannot leave it. The
 *   back-nav work fixed exactly this shape for the SUCCESS path; the error
 *   path kept it.
 *
 *   FOR VERIFICATION. The device sweep confirms a route by looking for the
 *   screen's own title. A screen whose failure state prints no title cannot be
 *   confirmed — it reads as "some other screen" — so an entire class of routes
 *   was unverifiable whenever its API was down, which in a local environment
 *   is most of them.
 *
 * So the error state keeps the header. The title tells the user where they
 * are, ScreenHeader gives them a way back, and the sweep has something to
 * assert against.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../constants/theme";
import { ScreenHeader } from "./ScreenHeader";

export interface ScreenErrorProps {
  /** The screen's own title — the same string its success path renders. */
  title: string;
  /** What went wrong, in the app's words. */
  message: string;
  /** Omitted when there is nothing useful to retry. */
  onRetry?: () => void;
  /** For a screen that is its own stack root. */
  hideBack?: boolean;
  testID?: string;
}

export function ScreenError({
  title,
  message,
  onRetry,
  hideBack,
  testID,
}: ScreenErrorProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title={title} hideBack={hideBack} />
      <View style={styles.centered} testID={testID}>
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            testID="screen-error-retry"
          >
            {/* "Try Again", not "Try again": that is the copy these 17
                screens already used and that their tests assert. Changing it
                in a batch transform broke 18 suites. */}
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.md,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
});
