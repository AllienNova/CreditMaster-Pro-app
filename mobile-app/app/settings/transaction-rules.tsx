/**
 * Fynvita Transaction Rules Screen
 * Mobile rule builder for auto-categorizing transactions.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp, Layout } from "react-native-reanimated";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { BottomSheet } from "../../src/components/BottomSheet";
import { EmptyState } from "../../src/components/EmptyState";
import { Button } from "../../src/components/Button";
import { transactionRuleApi } from "../../src/services/api/financial";
import type { WebTransactionRule } from "../../src/services/api/financial";

// ============================================================================
// Types
// ============================================================================

type ConditionType =
  | "merchant_contains"
  | "amount_greater_than"
  | "amount_less_than"
  | "category_equals";

type ActionType = "set_category" | "add_tag" | "mark_tax_deductible";

interface RuleCondition {
  type: ConditionType;
  value: string;
}

interface RuleAction {
  type: ActionType;
  value: string;
}

interface TransactionRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: RuleAction[];
  isActive: boolean;
  matchCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const CONDITION_LABELS: Record<ConditionType, string> = {
  merchant_contains: "Merchant contains",
  amount_greater_than: "Amount greater than",
  amount_less_than: "Amount less than",
  category_equals: "Category equals",
};

const ACTION_LABELS: Record<ActionType, string> = {
  set_category: "Set category",
  add_tag: "Add tag",
  mark_tax_deductible: "Mark tax deductible",
};

const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Bills & Utilities",
  "Health & Fitness",
  "Travel",
  "Income",
  "Transfer",
  "Uncategorized",
];


// ============================================================================
// Rule Form State
// ============================================================================

interface RuleFormState {
  name: string;
  conditionType: ConditionType;
  conditionValue: string;
  conditionLogic: "AND" | "OR";
  actionType: ActionType;
  actionValue: string;
}

const EMPTY_FORM: RuleFormState = {
  name: "",
  conditionType: "merchant_contains",
  conditionLogic: "AND",
  conditionValue: "",
  actionType: "set_category",
  actionValue: "Uncategorized",
};

// ============================================================================
// Picker Row
// ============================================================================

interface PickerRowProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

function PickerRow({ label, options, selected, onSelect }: PickerRowProps) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.chip,
              opt.value === selected && styles.chipActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: opt.value === selected }}
          >
            <Text
              style={[
                styles.chipText,
                opt.value === selected && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Rule Card (swipeable)
// ============================================================================

interface RuleCardProps {
  rule: TransactionRule;
  onToggle: () => void;
  onDelete: () => void;
}

function RuleCard({ rule, onToggle, onDelete }: RuleCardProps) {
  const conditionSummary = rule.conditions
    .map((c) => `${CONDITION_LABELS[c.type]} "${c.value}"`)
    .join(` ${rule.conditionLogic} `);

  const actionSummary = rule.actions
    .map((a) => {
      if (a.type === "mark_tax_deductible") return "Mark tax deductible";
      return `${ACTION_LABELS[a.type]}: ${a.value}`;
    })
    .join(", ");

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={onDelete}
      accessibilityLabel={`Delete ${rule.name} rule`}
    >
      <Ionicons name="trash" size={22} color={theme.colors.white} />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Card style={styles.ruleCard}>
        <View style={styles.ruleHeader}>
          <View style={styles.ruleInfo}>
            <Text style={styles.ruleName} numberOfLines={1}>
              {rule.name}
            </Text>
            <Text style={styles.ruleMatchCount}>
              {rule.matchCount} matches
            </Text>
          </View>
          <Switch
            value={rule.isActive}
            onValueChange={onToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.secondary,
            }}
            accessibilityLabel={`Toggle ${rule.name}`}
          />
        </View>

        <View style={styles.rulePillRow}>
          <View style={styles.pillIf}>
            <Text style={styles.pillLabel}>IF</Text>
            <Text style={styles.pillText} numberOfLines={1}>
              {conditionSummary}
            </Text>
          </View>
        </View>

        <View style={[styles.pillRow]}>
          <View style={styles.pillThen}>
            <Text style={styles.pillLabel}>THEN</Text>
            <Text style={styles.pillText} numberOfLines={1}>
              {actionSummary}
            </Text>
          </View>
        </View>
      </Card>
    </Swipeable>
  );
}

// ============================================================================
// Add Rule Sheet
// ============================================================================

interface AddRuleSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (rule: Omit<TransactionRule, "id" | "matchCount">) => void;
}

function AddRuleSheet({ visible, onClose, onSave }: AddRuleSheetProps) {
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);

  const update = useCallback(
    <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      Alert.alert("Name required", "Please give this rule a name.");
      return;
    }
    if (!form.conditionValue.trim() && form.actionType !== "mark_tax_deductible") {
      Alert.alert("Values required", "Please fill in condition and action values.");
      return;
    }

    onSave({
      name: trimmedName,
      conditions: [{ type: form.conditionType, value: form.conditionValue.trim() }],
      conditionLogic: form.conditionLogic,
      actions: [
        {
          type: form.actionType,
          value: form.actionType === "mark_tax_deductible" ? "true" : form.actionValue.trim(),
        },
      ],
      isActive: true,
    });

    setForm(EMPTY_FORM);
    onClose();
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  // Live match count preview (static for mobile, shows form completeness)
  const isConditionFilled = form.conditionValue.trim().length > 0;

  const conditionOptions = (
    Object.entries(CONDITION_LABELS) as [ConditionType, string][]
  ).map(([value, label]) => ({ value, label }));

  const actionOptions = (
    Object.entries(ACTION_LABELS) as [ActionType, string][]
  ).map(([value, label]) => ({ value, label }));

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Add Rule" height={600}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rule name */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Rule Name</Text>
          <TextInput
            style={styles.textInput}
            value={form.name}
            onChangeText={(v) => update("name", v)}
            placeholder="e.g., Coffee Shops"
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="next"
          />
        </View>

        {/* Condition type */}
        <PickerRow
          label="Condition"
          options={conditionOptions}
          selected={form.conditionType}
          onSelect={(v) => update("conditionType", v as ConditionType)}
        />

        {/* Condition value */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Condition Value</Text>
          <TextInput
            style={styles.textInput}
            value={form.conditionValue}
            onChangeText={(v) => update("conditionValue", v)}
            placeholder={
              form.conditionType.includes("amount") ? "e.g., 50" : "e.g., starbucks"
            }
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType={form.conditionType.includes("amount") ? "decimal-pad" : "default"}
          />
        </View>

        {/* Match logic */}
        <PickerRow
          label="Match Logic"
          options={[
            { value: "AND", label: "Match ALL" },
            { value: "OR", label: "Match ANY" },
          ]}
          selected={form.conditionLogic}
          onSelect={(v) => update("conditionLogic", v as "AND" | "OR")}
        />

        {/* Action type */}
        <PickerRow
          label="Action"
          options={actionOptions}
          selected={form.actionType}
          onSelect={(v) => {
            const next = v as ActionType;
            update("actionType", next);
            if (next === "set_category") update("actionValue", "Uncategorized");
            else update("actionValue", "");
          }}
        />

        {/* Action value */}
        {form.actionType === "set_category" && (
          <PickerRow
            label="Category"
            options={categoryOptions}
            selected={form.actionValue || "Uncategorized"}
            onSelect={(v) => update("actionValue", v)}
          />
        )}

        {form.actionType === "add_tag" && (
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Tag Name</Text>
            <TextInput
              style={styles.textInput}
              value={form.actionValue}
              onChangeText={(v) => update("actionValue", v)}
              placeholder="e.g., recurring"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        )}

        {/* Live match count hint */}
        {isConditionFilled && (
          <View style={styles.matchHint}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.matchHintText}>
              Rule will apply to matching transactions
            </Text>
          </View>
        )}

        <View style={styles.sheetActions}>
          <Button title="Cancel" onPress={handleClose} variant="outline" style={styles.cancelBtn} />
          <Button title="Save Rule" onPress={handleSave} variant="primary" style={styles.saveBtn} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

/**
 * The route's shape onto this screen's. Only the fields it renders are taken;
 * matchCount is the REAL transaction_rules.match_count column, which is what
 * the invented 47 was imitating.
 */
function fromWebRule(r: WebTransactionRule): TransactionRule {
  return {
    id: r.id,
    name: r.name,
    conditions: r.conditions as RuleCondition[],
    conditionLogic: r.conditionLogic,
    actions: r.actions as RuleAction[],
    isActive: r.isActive,
    matchCount: r.matchCount,
  };
}

export default function TransactionRulesScreen() {
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await transactionRuleApi.getAll();
    if (!res.success || !res.data) {
      // "No rules yet" and "we could not read your rules" are different
      // statements. The screen used to make that substitution by seeding a
      // rule the user never wrote.
      setError("We could not load your rules.");
      setLoading(false);
      return;
    }
    setRules(res.data.rules.map(fromWebRule));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (id: string) => {
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;
      const res = await transactionRuleApi.update(id, {
        isActive: !rule.isActive,
      });
      // Reflect it only if the server took it. Flipping local state first made
      // a failed write look identical to a successful one until reload.
      if (!res.success) return;
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)),
      );
    },
    [rules],
  );

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Delete Rule", "Are you sure you want to delete this rule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await transactionRuleApi.remove(id);
          if (!res.success) return;
          setRules((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<TransactionRule, "id" | "matchCount">) => {
      // The id used to be Date.now(). The server assigns it, and matchCount
      // starts wherever the engine says it does — not at a number this screen
      // picks.
      const res = await transactionRuleApi.create({
        name: data.name,
        conditions: data.conditions,
        conditionLogic: data.conditionLogic,
        actions: data.actions,
        isActive: data.isActive,
      });
      const created = res.data;
      if (!res.success || !created) return;
      setRules((prev) => [...prev, fromWebRule(created.rule)]);
    },
    [],
  );

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Rules</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.subtitle}>
            Auto-categorize and tag transactions
          </Text>

          {rules.length === 0 ? (
            <EmptyState
              type="no-transactions"
              title="No rules yet"
              description="Create rules to automatically categorize your transactions"
              actionLabel="Create Your First Rule"
              onAction={() => setSheetVisible(true)}
            />
          ) : (
            rules.map((rule) => (
              <Animated.View
                key={rule.id}
                entering={FadeInDown.duration(200)}
                exiting={FadeOutUp.duration(150)}
                layout={Layout.springify()}
              >
                <RuleCard
                  rule={rule}
                  onToggle={() => handleToggle(rule.id)}
                  onDelete={() => handleDelete(rule.id)}
                />
              </Animated.View>
            ))
          )}

          {rules.length > 0 && (
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.infoText}>
                Rules are applied in order, top to bottom. The first match wins.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setSheetVisible(true)}
          accessibilityLabel="Add rule"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={theme.colors.white} />
        </TouchableOpacity>

        <AddRuleSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSave={handleSave}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: "700",
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  ruleCard: {
    marginBottom: theme.spacing.md,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  ruleInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  ruleName: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  ruleMatchCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rulePillRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: "row",
  },
  pillIf: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  pillThen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.colors.secondary}15`,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  pillLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginRight: 6,
    minWidth: 28,
  },
  pillText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    flex: 1,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.sm,
  },
  deleteActionText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: Platform.OS === "ios" ? 40 : theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  // Form styles
  formField: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
  },
  fieldRow: {
    marginBottom: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: "500",
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  matchHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.sm,
  },
  matchHintText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  sheetActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 1,
  },
});
