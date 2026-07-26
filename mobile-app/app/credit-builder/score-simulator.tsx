/**
 * Fynvita Score Simulator Screen — de-fabricated (DEFAB-2 / ADR-0009).
 *
 * This screen used to fabricate a projected credit score: a hardcoded current
 * score (678), a table of invented per-action point ranges (pay-down-debt
 * +20..+40, missed-payment -60..-100, etc.), and
 * projectedScore = clamp(current + avgImpact, 300, 850) rendered as a specific
 * "Projected" number plus a 6-month projection chart. FICO/VantageScore impacts
 * are individualized and not precisely predictable, so presenting invented point
 * outcomes as a prediction is fabrication (FCRA/UDAAP exposure). All of that —
 * the impact table, the projected-score math, the score-comparison card, the
 * projection chart, and the per-action point labels — was removed.
 *
 * In its place: an honest "estimate unavailable" state (no point numbers, no
 * guarantee language) and number-free directional education — which habits
 * generally help vs hurt credit — carrying no per-user promised magnitude. The
 * per-user estimate is gated on the real-data rebuild (FR-605, ADR-0009 M6-5).
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

// Number-free directional education: general direction only, never a per-user
// point magnitude. These are standard credit-education statements, not a
// prediction about this user's score.
const HABITS_THAT_HELP: string[] = [
  "Paying down credit card balances",
  "Making every payment on time",
  "Keeping older accounts open",
  "Applying for new credit only when needed",
];

const HABITS_THAT_HURT: string[] = [
  "Missing or making late payments",
  "Carrying balances close to your limits",
  "Closing your oldest accounts",
  "Opening several new accounts at once",
];

export default function ScoreSimulatorScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Score Simulator</Text>
          <View style={styles.backButton} />
        </View>

        {/* Honest unavailable state — replaces the fabricated projection */}
        <View testID="simulator-unavailable">
          <Card style={styles.noticeCard}>
            <View style={styles.noticeRow}>
              <Ionicons
                name="construct-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text style={styles.noticeTitle}>
                Score estimates are being updated
              </Text>
            </View>
            <Text style={styles.noticeBody}>
              We&apos;re rebuilding score-impact estimates to use your own credit
              data. Until then we can&apos;t show a projected point change —
              credit-score impacts are individual and can&apos;t be predicted
              precisely.
            </Text>
          </Card>
        </View>

        {/* Number-free directional education */}
        <View testID="simulator-education">
          <View style={styles.eduHeader}>
            <Ionicons
              name="trending-up"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.sectionTitle}>What generally helps</Text>
          </View>
          {HABITS_THAT_HELP.map((item) => (
            <View key={item} style={styles.eduRow}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
              />
              <Text style={styles.eduText}>{item}</Text>
            </View>
          ))}

          <View style={[styles.eduHeader, styles.eduHeaderSpacer]}>
            <Ionicons
              name="trending-down"
              size={20}
              color={theme.colors.error}
            />
            <Text style={styles.sectionTitle}>What generally hurts</Text>
          </View>
          {HABITS_THAT_HURT.map((item) => (
            <View key={item} style={styles.eduRow}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={theme.colors.error}
              />
              <Text style={styles.eduText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer} testID="simulator-disclaimer">
          General education only — not a prediction of your credit score.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4, width: 32 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  noticeCard: { marginBottom: theme.spacing.lg },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  noticeBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  eduHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  eduHeaderSpacer: { marginTop: theme.spacing.lg },
  eduRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  eduText: { flex: 1, fontSize: 14, color: theme.colors.text },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: theme.spacing.lg,
  },
});
