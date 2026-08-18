/**
 * Auto-Save — the savings automation rules the user actually has.
 *
 * WHAT THIS REPLACED. A MOCK_RULES array: a "Purchase Round-Up" saving $45 a
 * month, a "Paycheck Percentage", a fixed weekly transfer — with toggles that
 * flipped local state and a headline claiming a monthly and an annual savings
 * figure. The screen made no request. A user reading it believed money was
 * being set aside automatically every month. None was.
 *
 * WHERE THE DATA COMES FROM. GET /api/financial/savings?type=rules ->
 * savingsAutomationService.getRules -> the real savings_rules table. That
 * route has existed the whole time; nothing asked it for anything.
 *
 * MONTHLY SAVINGS IS NOT A THING THE DATA KNOWS. savings_rules records
 * total_saved and transfer_count — CUMULATIVE totals since the rule was
 * created — and no per-month figure. Dividing a lifetime total by an unknown
 * number of months would be a guess dressed as a projection, so the summary
 * now reports what is actually stored: total saved, transfers made, and how
 * many rules are active.
 *
 * A NOTE ON THE OTHER SERVICE. src/lib/financial/auto-save-rules-service.ts
 * looks like the natural backend for this screen. It queries `auto_save_rules`
 * and `save_transfers`, and neither table exists in any migration — it is dead
 * code against a schema that was never created. savings-automation-service is
 * the live one.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  savingsRulesApi,
  type SavingsRule,
} from "../../src/services/api/financial";

// The five values savings_rules.type is CHECKed to (20260731000012). The old
// screen knew three, and used its own spelling ("round-up") for one of them,
// so no real row could have matched.
const RULE_TYPE_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  round_up: { label: "Round-Up", color: "#8B5CF6", bg: "#EDE9FE" },
  percentage: { label: "Percentage", color: "#3B82F6", bg: "#DBEAFE" },
  fixed: { label: "Fixed", color: "#22C55E", bg: "#DCFCE7" },
  surplus: { label: "Surplus Sweep", color: "#F59E0B", bg: "#FEF3C7" },
  goal_based: { label: "Goal", color: "#EC4899", bg: "#FCE7F3" },
};

const FREQUENCY_LABELS: Record<string, string> = {
  per_transaction: "Per transaction",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function AutoSaveScreen() {
  const [rules, setRules] = useState<SavingsRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await savingsRulesApi.getRules();

    if (!res.success || !res.data) {
      // Not an empty list. "We could not load this" and "you have no rules"
      // lead a user to opposite actions.
      setError("We could not load your auto-save rules.");
      setIsLoading(false);
      return;
    }

    setRules(res.data.rules);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRules = rules.filter((r) => r.status === "active");

  // Both are CUMULATIVE, straight off savings_rules. There is no monthly
  // figure in the data and none is derived: dividing a lifetime total by an
  // unknown number of months is a guess, and the previous screen's
  // "$45/mo" was exactly that guess with no total behind it.
  const totalSaved = rules.reduce((sum, r) => sum + (r.totalSaved ?? 0), 0);
  const totalTransfers = rules.reduce(
    (sum, r) => sum + (r.transferCount ?? 0),
    0,
  );

  const toggleRule = async (ruleId: string) => {
    setBusyId(ruleId);
    const res = await savingsRulesApi.toggleRule(ruleId);
    setBusyId(null);

    if (!res.success) {
      // Leave the switch where it was. The old handler flipped local state
      // unconditionally, so pausing a rule looked like it worked whether or
      // not anything happened — and nothing ever did.
      setError("We could not change that rule. It is unchanged.");
      return;
    }

    await load();
  };

  /**
   * What the rule actually does, read from its real config.
   *
   * savings_rules.config is JSONB whose shape depends on the type. An absent
   * value renders as nothing rather than 0 — "0%" would state a setting the
   * rule does not have.
   */
  const formatAmount = (rule: SavingsRule): string => {
    const c = rule.config ?? {};
    switch (rule.type) {
      case "round_up":
        return c.roundUpTo
          ? `Round to $${c.roundUpTo}${c.roundUpMultiplier && c.roundUpMultiplier > 1 ? ` x${c.roundUpMultiplier}` : ""}`
          : "";
      case "percentage": {
        const pct = c.percentageOfIncome ?? c.percentageOfTransaction;
        return pct ? `${pct}%` : "";
      }
      case "fixed":
        return c.fixedAmount ? formatCurrency(c.fixedAmount) : "";
      case "surplus":
        return c.surplusPercentage ? `${c.surplusPercentage}% of surplus` : "";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Auto-Save Rules</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              {/* savings_rules.total_saved — cumulative since each rule was
                  created, NOT a monthly figure. The old labels claimed a
                  monthly and an annual amount the data cannot produce. */}
              <Text style={styles.summaryLabel}>Total Saved</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                {formatCurrency(totalSaved)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transfers</Text>
              <Text style={styles.summaryAmount}>{totalTransfers}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active Rules</Text>
              <Text style={styles.summaryAmount}>
                {activeRules.length}/{rules.length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Rules List */}
        <Text style={styles.sectionTitle}>Your Rules</Text>
        {isLoading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your auto-save rules…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : rules.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              You have no auto-save rules yet. A rule moves money to savings
              automatically — for example, rounding up each purchase.
            </Text>
          </Card>
        ) : null}
        {rules.map((rule) => {
          // Falls back rather than indexing into undefined: a type this
          // screen has not been taught yet must render, not crash.
          const typeConfig = RULE_TYPE_LABELS[rule.type] ?? {
            label: rule.type,
            color: theme.colors.textSecondary,
            bg: theme.colors.borderLight,
          };
          const amountLabel = formatAmount(rule);
          return (
            <TouchableOpacity key={rule.id} activeOpacity={0.7}>
              <Card style={styles.ruleCard}>
                <View style={styles.ruleTopRow}>
                  <View style={styles.ruleIconContainer}>
                    {/* One icon for every rule. The fixture carried a
                        per-rule glyph; savings_rules has no icon column, and
                        picking one from the name would be decoration
                        pretending to be data. */}
                    <Ionicons
                      name="repeat"
                      size={22}
                      color={
                        rule.status === "active"
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                    />
                  </View>
                  <View style={styles.ruleContent}>
                    <Text
                      style={[
                        styles.ruleName,
                        rule.status === "paused" && styles.ruleNamePaused,
                      ]}
                    >
                      {rule.name}
                    </Text>
                    {/* savings_rules has no description column. The rule's
                        own configuration is the honest subtitle. */}
                    <Text style={styles.ruleDescription}>
                      {[
                        RULE_TYPE_LABELS[rule.type]?.label,
                        FREQUENCY_LABELS[rule.frequency] ?? rule.frequency,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Switch
                    value={rule.status === "active"}
                    disabled={busyId === rule.id}
                    onValueChange={() => toggleRule(rule.id)}
                    trackColor={{
                      false: theme.colors.borderLight,
                      true: theme.colors.primary + "60",
                    }}
                    thumbColor={
                      rule.status === "active"
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                  />
                </View>

                <View style={styles.ruleDetails}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: typeConfig.bg },
                    ]}
                  >
                    <Text
                      style={[styles.typeBadgeText, { color: typeConfig.color }]}
                    >
                      {typeConfig.label}
                    </Text>
                  </View>
                  {amountLabel ? (
                    <Text style={styles.ruleDetailText}>{amountLabel}</Text>
                  ) : null}
                  {/* Total saved BY THIS RULE — cumulative, and labelled as
                      such. The old line read "$45/mo" from a fixture field
                      that has no counterpart in the database. */}
                  {rule.totalSaved > 0 ? (
                    <>
                      {amountLabel ? (
                        <Text style={styles.ruleDetailDot}>&middot;</Text>
                      ) : null}
                      <Text style={[styles.ruleDetailText, { color: theme.colors.success }]}>
                        {formatCurrency(rule.totalSaved)} saved
                      </Text>
                    </>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  ruleCard: {
    marginBottom: theme.spacing.sm,
  },
  ruleTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ruleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  ruleContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  ruleName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  ruleNamePaused: {
    color: theme.colors.textMuted,
  },
  ruleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ruleDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  typeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  ruleDetailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  ruleDetailDot: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  bottomSpacer: {
    height: theme.spacing.xxl,
  },
});
