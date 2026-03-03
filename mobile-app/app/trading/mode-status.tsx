/**
 * Mode Status Screen
 *
 * Displays the current operating mode, graduation progress,
 * and mode permissions for the trading system.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";

// ============================================================================
// TYPES (mirrored from web for mobile use)
// ============================================================================

type OperatingMode = "watch" | "guided" | "autonomous";

interface GraduationProgress {
  current: number | boolean;
  required: number | boolean;
  met: boolean;
}

interface GraduationProgressReport {
  currentMode: OperatingMode;
  nextMode: OperatingMode | null;
  criteria: Record<string, GraduationProgress>;
  allCriteriaMet: boolean;
  summary: string;
}

interface ModeStatus {
  currentMode: OperatingMode;
  modeStartDate: string;
  graduationProgress: GraduationProgressReport;
  nextModeAvailable: boolean;
  isActive: boolean;
}

interface ModePermissions {
  mode: OperatingMode;
  canViewSignals: boolean;
  canPaperTrade: boolean;
  canPlaceLiveOrders: boolean;
  requiresConfirmation: boolean;
  canAutoExecute: boolean;
}

// ============================================================================
// MODE CONFIGURATION
// ============================================================================

const MODE_CONFIG: Record<
  OperatingMode,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  watch: {
    label: "WATCH",
    icon: "\uD83D\uDC41\uFE0F",
    color: "#2563EB",
    bgColor: "#DBEAFE",
  },
  guided: {
    label: "GUIDED",
    icon: "\uD83E\uDDED",
    color: "#D97706",
    bgColor: "#FEF3C7",
  },
  autonomous: {
    label: "AUTONOMOUS",
    icon: "\uD83D\uDE80",
    color: "#059669",
    bgColor: "#D1FAE5",
  },
};

const PERMISSION_LABELS: Record<string, string> = {
  canViewSignals: "View Trading Signals",
  canPaperTrade: "Paper Trading",
  canPlaceLiveOrders: "Live Orders",
  requiresConfirmation: "Requires Confirmation",
  canAutoExecute: "Auto-Execute Trades",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCriterionLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ModeBadge({ mode }: { mode: OperatingMode }) {
  const config = MODE_CONFIG[mode];
  return (
    <View
      style={[styles.modeBadge, { backgroundColor: config.bgColor }]}
      accessibilityRole="text"
      accessibilityLabel={`Trading mode: ${config.label}`}
    >
      <Text style={styles.modeBadgeIcon}>{config.icon}</Text>
      <Text style={[styles.modeBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

function CriterionItem({
  label,
  progress,
}: {
  label: string;
  progress: GraduationProgress;
}) {
  const isBooleanCriterion =
    typeof progress.required === "boolean" ||
    typeof progress.current === "boolean";

  const currentBool = Boolean(progress.current);

  return (
    <View style={styles.criterionItem}>
      <View style={styles.criterionHeader}>
        <View style={styles.criterionLabelRow}>
          <Text
            style={[
              styles.criterionIcon,
              { color: progress.met ? "#22C55E" : "#EF4444" },
            ]}
          >
            {progress.met ? "\u2713" : "\u2717"}
          </Text>
          <Text style={styles.criterionLabel}>{label}</Text>
        </View>
        <Text style={styles.criterionValue}>
          {isBooleanCriterion
            ? currentBool
              ? "Yes"
              : "No"
            : `${Number(progress.current)} / ${Number(progress.required)}`}
        </Text>
      </View>
      {!isBooleanCriterion && (
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(
                  (Number(progress.current) / Number(progress.required)) * 100,
                  100,
                )}%`,
                backgroundColor: progress.met ? "#22C55E" : "#3B82F6",
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function PermissionRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <View style={styles.permissionRow}>
      <Text
        style={[
          styles.permissionIcon,
          { color: enabled ? "#22C55E" : "#EF4444" },
        ]}
      >
        {enabled ? "\u2713" : "\u2717"}
      </Text>
      <Text
        style={[
          styles.permissionLabel,
          !enabled && styles.permissionLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ModeStatusScreen() {
  const [modeStatus, setModeStatus] = useState<ModeStatus | null>(null);
  const [permissions, setPermissions] = useState<ModePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGraduating, setIsGraduating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [statusRes, permissionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/trading/modes`),
        fetch(`${API_BASE}/api/trading/modes/permissions`),
      ]);

      if (!statusRes.ok) {
        throw new Error(`Failed to fetch mode status: ${statusRes.status}`);
      }
      if (!permissionsRes.ok) {
        throw new Error(
          `Failed to fetch permissions: ${permissionsRes.status}`,
        );
      }

      const statusData = await statusRes.json();
      const permissionsData = await permissionsRes.json();

      setModeStatus(statusData.data ?? statusData);
      setPermissions(permissionsData.data ?? permissionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  const handleGraduate = useCallback(async () => {
    if (
      !modeStatus?.graduationProgress.allCriteriaMet ||
      !modeStatus?.graduationProgress.nextMode
    ) {
      return;
    }

    setIsGraduating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/trading/modes/graduate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Graduation failed: ${res.status}`);
      }
      // Refresh all data after graduation
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Graduation failed");
    } finally {
      setIsGraduating(false);
    }
  }, [modeStatus, fetchData]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Trading Mode" }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading mode status...</Text>
        </View>
      </>
    );
  }

  if (error && !modeStatus) {
    return (
      <>
        <Stack.Screen options={{ title: "Trading Mode" }} />
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>{"\u26A0\uFE0F"}</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              fetchData().finally(() => setIsLoading(false));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const progress = modeStatus?.graduationProgress;
  const criteriaEntries = progress
    ? Object.entries(progress.criteria)
    : [];
  const modeConfig = modeStatus
    ? MODE_CONFIG[modeStatus.currentMode]
    : null;

  return (
    <>
      <Stack.Screen options={{ title: "Trading Mode" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Mode Card */}
        {modeStatus && modeConfig && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Mode</Text>
            <View style={styles.modeRow}>
              <ModeBadge mode={modeStatus.currentMode} />
              {modeStatus.isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.modeStartDate}>
              Since {formatDate(modeStatus.modeStartDate)}
            </Text>
          </View>
        )}

        {/* Graduation Progress Card */}
        {progress && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Graduation Progress</Text>

            {/* Mode transition */}
            {progress.nextMode && (
              <View style={styles.transitionRow}>
                <ModeBadge mode={progress.currentMode} />
                <Text style={styles.arrow}>{"\u2192"}</Text>
                <ModeBadge mode={progress.nextMode} />
              </View>
            )}

            {/* Criteria */}
            {criteriaEntries.length > 0 && (
              <View style={styles.criteriaList}>
                {criteriaEntries.map(([key, prog]) => (
                  <CriterionItem
                    key={key}
                    label={formatCriterionLabel(key)}
                    progress={prog}
                  />
                ))}
              </View>
            )}

            {/* Summary */}
            {progress.summary && (
              <Text style={styles.summaryText}>{progress.summary}</Text>
            )}

            {/* Error */}
            {error && (
              <Text style={styles.errorTextInline}>{error}</Text>
            )}

            {/* Graduate button */}
            {progress.nextMode && (
              <Pressable
                style={[
                  styles.graduateButton,
                  !progress.allCriteriaMet && styles.graduateButtonDisabled,
                ]}
                onPress={handleGraduate}
                disabled={!progress.allCriteriaMet || isGraduating}
                accessibilityLabel={
                  progress.allCriteriaMet
                    ? `Graduate to ${progress.nextMode} mode`
                    : "Graduation criteria not yet met"
                }
                accessibilityRole="button"
              >
                {isGraduating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.graduateButtonText,
                      !progress.allCriteriaMet &&
                        styles.graduateButtonTextDisabled,
                    ]}
                  >
                    {progress.allCriteriaMet
                      ? `Graduate to ${progress.nextMode.charAt(0).toUpperCase() + progress.nextMode.slice(1)}`
                      : "Criteria Not Met"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Permissions Card */}
        {permissions && (
          <View style={styles.card}>
            <View style={styles.permissionsHeader}>
              <Text style={styles.cardTitle}>Permissions</Text>
              <ModeBadge mode={permissions.mode} />
            </View>
            <View style={styles.permissionsList}>
              {(
                Object.entries(PERMISSION_LABELS) as [string, string][]
              ).map(([key, label]) => (
                <PermissionRow
                  key={key}
                  label={label}
                  enabled={
                    permissions[key as keyof ModePermissions] as boolean
                  }
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },

  // Error
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  errorTextInline: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: 8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Mode badge
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modeBadgeIcon: {
    fontSize: 14,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Mode status
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  modeStartDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // Transition
  transitionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  arrow: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },

  // Criteria
  criteriaList: {
    gap: 12,
    marginBottom: 12,
  },
  criterionItem: {
    paddingVertical: 4,
  },
  criterionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  criterionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  criterionIcon: {
    fontSize: 16,
    fontWeight: "700",
  },
  criterionLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  criterionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Summary
  summaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },

  // Graduate button
  graduateButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  graduateButtonDisabled: {
    backgroundColor: theme.colors.borderLight,
  },
  graduateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  graduateButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },

  // Permissions
  permissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  permissionsList: {
    gap: 12,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  permissionIcon: {
    fontSize: 16,
    fontWeight: "700",
  },
  permissionLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  permissionLabelDisabled: {
    color: theme.colors.textSecondary,
  },
});
