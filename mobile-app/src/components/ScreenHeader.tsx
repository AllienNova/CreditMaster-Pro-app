/**
 * The header every pushed screen should use, with a way back.
 *
 * WHY THIS EXISTS. A device screenshot of /marketplace showed a screen with a
 * title and no way out. Counting the app: 72 of 238 screens had no back
 * affordance at all. Ten of those are tab roots and two are auth entries,
 * which correctly have none — leaving about sixty screens a user could reach
 * and then be stuck on, with only the OS gesture to escape.
 *
 * The cause was not sixty separate oversights. There was no shared header
 * component, so 166 screens each hand-rolled the same fifteen lines:
 *
 *     <View style={styles.header}>
 *       <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
 *         <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
 *       </TouchableOpacity>
 *       <Text style={styles.headerTitle}>Bill Tracker</Text>
 *     </View>
 *
 * Sixty of them left the first half out. A block copied by hand 166 times will
 * be copied wrong; the fix is one component, not sixty patches.
 *
 * A NOTE ON STACK ROOTS. marketplace/index.tsx had the opposite problem: its
 * group layout set `headerShown: true`, so React Navigation drew a native
 * header — and a native header on the ROOT of a stack has no back button,
 * because within that stack there is nowhere to go. The user had arrived from
 * a parent navigator that did have history. That screen rendered its title
 * twice and offered no way back from either. Screens like it turn the native
 * header off and use this component, which calls router.back() and therefore
 * pops the parent.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../constants/theme";

export interface ScreenHeaderProps {
  title: string;
  /** Optional second line under the title. */
  subtitle?: string;
  /**
   * Hide the back control. Only for a screen that genuinely has nowhere to go
   * back TO — a tab root, or an auth entry point. Anything reachable by a push
   * must leave this false, and audit:back-nav enforces that.
   */
  hideBack?: boolean;
  /** Optional trailing control, e.g. an add or refresh button. */
  right?: React.ReactNode;
  /** Override where back goes. Defaults to popping the navigator. */
  onBack?: () => void;
  testID?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  hideBack = false,
  right,
  onBack,
  testID,
}: ScreenHeaderProps): React.ReactElement {
  return (
    <View style={styles.header} testID={testID}>
      {hideBack ? (
        // Keeps the title centred when there is no back control, rather than
        // letting it slide left and look like a different screen.
        <View style={styles.sideSlot} />
      ) : (
        <TouchableOpacity
          testID="screen-header-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => router.back())}
          style={styles.sideSlot}
          // The icon is 24pt; the hit area is not. A back control that is
          // hard to hit is only marginally better than one that is missing.
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Always present, so the title stays centred whether or not there is a
          trailing control. */}
      <View style={styles.sideSlot}>{right}</View>
    </View>
  );
}

const SIDE_SLOT_WIDTH = 40;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sideSlot: {
    width: SIDE_SLOT_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
});
