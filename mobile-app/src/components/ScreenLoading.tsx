/**
 * The state a screen shows while its data is still coming.
 *
 * WHY THIS EXISTS. It is the twin of ScreenError, for the branch nobody
 * thought about. Loading states were written per screen as a bare
 * SafeAreaView wrapping a spinner and a line of text — three accessibility
 * nodes, no header:
 *
 *     if (loading) return (
 *       <SafeAreaView><View style={styles.loadingContainer}>
 *         <ActivityIndicator /><Text>Loading audit trail...</Text>
 *       </View></SafeAreaView>
 *     );
 *
 * The device sweep found thirteen routes sitting in exactly that state twenty
 * seconds after launch — "Loading audit trail...", "Scanning dark web
 * data...", "Analyzing your tax situation...". Not a slow render: a request
 * that never resolves.
 *
 *   FOR THE USER. A spinner with no title and no back control is a trap. You
 *   cannot tell which screen is loading, you cannot tell that anything is
 *   wrong, and you cannot leave. On a bad connection this is where you stay.
 *
 *   FOR VERIFICATION. The sweep confirms a route by finding the screen's own
 *   title. A screen whose loading state prints no title cannot be confirmed,
 *   so those thirteen routes were unverifiable whenever their data was slow —
 *   which, against a backend that is not running, is always.
 *
 * So the loading state keeps the header, exactly as the error state does. The
 * title says where you are, ScreenHeader gives you a way back out, and the
 * sweep has something to assert against.
 *
 * This does NOT fix the underlying hang — a request with no timeout still
 * never resolves. It makes the hang visible and escapable rather than silent.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../constants/theme";
import { ScreenHeader } from "./ScreenHeader";

export interface ScreenLoadingProps {
  /** The screen's own title — the same string its loaded state renders. */
  title: string;
  /** What is being fetched, in the app's words. */
  message?: string;
  /** For a screen that is its own stack root. */
  hideBack?: boolean;
  testID?: string;
}

export function ScreenLoading({
  title,
  message,
  hideBack,
  testID,
}: ScreenLoadingProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title={title} hideBack={hideBack} />
      <View style={styles.centered} testID={testID}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
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
});
