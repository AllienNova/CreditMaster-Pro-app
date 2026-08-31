/**
 * Risk Management Screen
 * Portfolio risk monitoring, settings, and kill switch controls
 */

import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { useTradingStore } from "../../src/store/tradingStore";
import type { RiskLevel } from "../../src/services/api/trading";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case "low":
      return "#10B981";
    case "medium":
      return "#F59E0B";
    case "high":
      return "#F97316";
    case "critical":
      return "#EF4444";
    default:
      return theme.colors.textSecondary;
  }
};

// Both formatters accept a possibly-absent number on purpose.
//
// Their parameters are typed `number`, but every caller feeds them a field off
// `riskMetrics`, which the API may omit — and a formatter that throws takes the
// whole screen down through the ErrorBoundary rather than rendering one blank
// metric. Coercing here covers every call site at once, including ones added
// later.
const formatPercent = (value: number | null | undefined): string => {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
};

const formatCurrency = (amount: number | null | undefined): string => {
  const n = amount ?? 0;
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ============================================================================
// COMPONENTS
// ============================================================================

function RiskGauge({
  value,
  maxValue,
  label,
  color,
}: {
  value: number;
  maxValue: number;
  label: string;
  color: string;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color }]}>
          {formatPercent(value)}
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.gaugeMax}>Max: {formatPercent(maxValue)}</Text>
    </View>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  valueColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text
        style={[styles.metricValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function SettingRow({
  label,
  value,
  suffix,
  onChangeValue,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  suffix: string;
  onChangeValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState((value * 100).toString());

  const handleSave = () => {
    const numValue = parseFloat(textValue) / 100;
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChangeValue(numValue);
    }
    setEditing(false);
  };

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {editing ? (
        <View style={styles.settingInputContainer}>
          <TextInput
            style={styles.settingInput}
            value={textValue}
            onChangeText={setTextValue}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={handleSave}
            onSubmitEditing={handleSave}
          />
          <Text style={styles.settingSuffix}>{suffix}</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)}>
          <Text style={styles.settingValue}>
            {(value * 100).toFixed(1)}
            {suffix}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function KillSwitchCard({
  active,
  reason,
  onActivate,
  onDeactivate,
}: {
  active: boolean;
  reason?: string;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const handleToggle = () => {
    if (active) {
      Alert.alert(
        "Deactivate Kill Switch",
        "Are you sure you want to resume trading?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Trading", onPress: onDeactivate },
        ],
      );
    } else {
      Alert.alert(
        "Activate Kill Switch",
        "This will immediately cancel all orders and prevent new trades. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Activate",
            style: "destructive",
            onPress: onActivate,
          },
        ],
      );
    }
  };

  return (
    <View
      style={[styles.killSwitchCard, active && styles.killSwitchCardActive]}
    >
      <View style={styles.killSwitchHeader}>
        <View style={styles.killSwitchTitle}>
          <Ionicons
            name={active ? "warning" : "shield-checkmark"}
            size={24}
            color={active ? "#EF4444" : "#10B981"}
          />
          <View>
            <Text
              style={[
                styles.killSwitchLabel,
                active && styles.killSwitchLabelActive,
              ]}
            >
              Kill Switch
            </Text>
            <Text style={styles.killSwitchStatus}>
              {active ? "ACTIVE - Trading Halted" : "Inactive"}
            </Text>
          </View>
        </View>
        <Switch
          value={active}
          onValueChange={handleToggle}
          trackColor={{ false: "#E5E7EB", true: "#FECACA" }}
          thumbColor={active ? "#EF4444" : "#9CA3AF"}
        />
      </View>
      {active && reason && (
        <View style={styles.killSwitchReason}>
          <Text style={styles.killSwitchReasonText}>{reason}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RiskScreen() {
  const [showSettings, setShowSettings] = useState(false);

  const {
    riskMetrics,
    riskSettings,
    isLoading,
    isRefreshing,
    fetchRiskMetrics,
    fetchRiskSettings,
    updateRiskSettings,
    activateKillSwitch,
    deactivateKillSwitch,
  } = useTradingStore();

  useEffect(() => {
    fetchRiskMetrics();
    fetchRiskSettings();
  }, []);

  const onRefresh = useCallback(() => {
    Promise.all([fetchRiskMetrics(), fetchRiskSettings()]);
  }, [fetchRiskMetrics, fetchRiskSettings]);

  const handleActivateKillSwitch = () => {
    activateKillSwitch("Manual activation");
  };

  const handleSettingChange = (key: string, value: number) => {
    updateRiskSettings({ [key]: value });
  };

  if (isLoading && !riskMetrics) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Risk Management" }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading risk data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Risk Management",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSettings(!showSettings)}
            >
              <Ionicons
                name={showSettings ? "analytics" : "settings-outline"}
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Risk Level Banner */}
        {riskMetrics && (
          <View
            style={[
              styles.riskBanner,
              {
                backgroundColor: `${getRiskLevelColor(riskMetrics.riskLevel)}15`,
              },
            ]}
          >
            <View style={styles.riskBannerContent}>
              <View
                style={[
                  styles.riskLevelBadge,
                  { backgroundColor: getRiskLevelColor(riskMetrics.riskLevel) },
                ]}
              >
                <Text style={styles.riskLevelText}>
                  {riskMetrics.riskLevel?.toUpperCase() ?? "UNKNOWN"}
                </Text>
              </View>
              <View style={styles.riskBannerInfo}>
                <Text style={styles.riskScoreLabel}>Risk Score</Text>
                <Text
                  style={[
                    styles.riskScoreValue,
                    { color: getRiskLevelColor(riskMetrics.riskLevel) },
                  ]}
                >
                  {(riskMetrics.riskScore ?? 0).toFixed(0)}/100
                </Text>
              </View>
            </View>
            {!riskMetrics.canTrade && (
              <View style={styles.tradingBlockedBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.tradingBlockedText}>
                  {/* `|| "Trading restricted"` only covers an empty FIRST
                      element — it never runs, because indexing an absent
                      `blockReasons` throws first ("Cannot convert undefined
                      value to object"). The optional index is what makes the
                      fallback reachable. */}
                  {riskMetrics.blockReasons?.[0] || "Trading restricted"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Kill Switch */}
        <KillSwitchCard
          active={riskMetrics?.killSwitch?.active || false}
          reason={riskMetrics?.killSwitch?.reason}
          onActivate={handleActivateKillSwitch}
          onDeactivate={deactivateKillSwitch}
        />

        {showSettings ? (
          /* Settings View */
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Risk Limits</Text>
            <View style={styles.settingsCard}>
              {riskSettings && (
                <>
                  <SettingRow
                    label="Max Portfolio Heat"
                    value={riskSettings.maxHeat}
                    suffix="%"
                    onChangeValue={(v) => handleSettingChange("maxHeat", v)}
                    min={0.01}
                    max={0.2}
                    step={0.01}
                  />
                  <SettingRow
                    label="Max Position Size"
                    value={riskSettings.maxPositionSize}
                    suffix="%"
                    onChangeValue={(v) =>
                      handleSettingChange("maxPositionSize", v)
                    }
                    min={0.01}
                    max={0.5}
                    step={0.01}
                  />
                  <SettingRow
                    label="Max Daily Loss"
                    value={riskSettings.maxDailyLoss}
                    suffix="%"
                    onChangeValue={(v) =>
                      handleSettingChange("maxDailyLoss", v)
                    }
                    min={0.01}
                    max={0.1}
                    step={0.005}
                  />
                  <SettingRow
                    label="Max Drawdown"
                    value={riskSettings.maxDrawdown}
                    suffix="%"
                    onChangeValue={(v) => handleSettingChange("maxDrawdown", v)}
                    min={0.05}
                    max={0.25}
                    step={0.01}
                  />
                  <SettingRow
                    label="Max Gross Exposure"
                    value={riskSettings.maxGrossExposure}
                    suffix="x"
                    onChangeValue={(v) =>
                      handleSettingChange("maxGrossExposure", v)
                    }
                    min={0.5}
                    max={4}
                    step={0.1}
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          /* Metrics View */
          <>
            {/* Risk Gauges */}
            {riskMetrics && (
              <View style={styles.gaugesSection}>
                <RiskGauge
                  value={riskMetrics.portfolioHeat}
                  maxValue={riskMetrics.maxHeat}
                  label="Portfolio Heat"
                  color={
                    riskMetrics.heatUtilization > 0.8
                      ? "#EF4444"
                      : riskMetrics.heatUtilization > 0.6
                        ? "#F59E0B"
                        : "#10B981"
                  }
                />
                <RiskGauge
                  value={riskMetrics.currentDrawdown}
                  maxValue={riskMetrics.maxDrawdown}
                  label="Current Drawdown"
                  color={
                    riskMetrics.currentDrawdown > 0.08
                      ? "#EF4444"
                      : riskMetrics.currentDrawdown > 0.05
                        ? "#F59E0B"
                        : "#10B981"
                  }
                />
              </View>
            )}

            {/* Metrics Grid */}
            {riskMetrics && (
              <View style={styles.metricsGrid}>
                <MetricCard
                  title="Daily P&L"
                  value={formatCurrency(riskMetrics.dailyPL)}
                  subtitle={formatPercent(riskMetrics.dailyPLPercent)}
                  icon="today-outline"
                  valueColor={riskMetrics.dailyPL >= 0 ? "#10B981" : "#EF4444"}
                />
                <MetricCard
                  title="Weekly P&L"
                  value={formatCurrency(riskMetrics.weeklyPL)}
                  icon="calendar-outline"
                  valueColor={riskMetrics.weeklyPL >= 0 ? "#10B981" : "#EF4444"}
                />
                <MetricCard
                  title="Gross Exposure"
                  value={`$${(riskMetrics.grossExposure ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  icon="expand-outline"
                />
                <MetricCard
                  title="Net Exposure"
                  value={`$${(riskMetrics.netExposure ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  icon="swap-horizontal-outline"
                />
                <MetricCard
                  title="Open Positions"
                  value={(riskMetrics.openPositions ?? 0).toString()}
                  icon="layers-outline"
                />
                <MetricCard
                  title="Scale Factor"
                  value={`${((riskMetrics.drawdownScaleFactor ?? 0) * 100).toFixed(0)}%`}
                  subtitle="Position sizing"
                  icon="resize-outline"
                  valueColor={
                    riskMetrics.drawdownScaleFactor < 0.5
                      ? "#EF4444"
                      : riskMetrics.drawdownScaleFactor < 1
                        ? "#F59E0B"
                        : "#10B981"
                  }
                />
              </View>
            )}

            {/* Exposure Breakdown */}
            {riskMetrics && riskMetrics.largestPosition && (
              <View style={styles.exposureSection}>
                <Text style={styles.sectionTitle}>Exposure Breakdown</Text>
                <View style={styles.exposureCard}>
                  <View style={styles.exposureRow}>
                    <Text style={styles.exposureLabel}>Long Exposure</Text>
                    <Text style={[styles.exposureValue, { color: "#10B981" }]}>
                      $
                      {(riskMetrics.longExposure ?? 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>
                  <View style={styles.exposureRow}>
                    <Text style={styles.exposureLabel}>Short Exposure</Text>
                    <Text style={[styles.exposureValue, { color: "#EF4444" }]}>
                      $
                      {(riskMetrics.shortExposure ?? 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>
                  <View style={styles.exposureDivider} />
                  <View style={styles.exposureRow}>
                    <Text style={styles.exposureLabel}>Largest Position</Text>
                    <View style={styles.largestPosition}>
                      <Text style={styles.largestPositionSymbol}>
                        {riskMetrics.largestPosition.symbol}
                      </Text>
                      <Text style={styles.largestPositionValue}>
                        {((riskMetrics.largestPosition?.percent ?? 0) * 100).toFixed(1)}
                        % of portfolio
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
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
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  riskBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  riskBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  riskLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  riskLevelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  riskBannerInfo: {
    alignItems: "flex-end",
  },
  riskScoreLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  riskScoreValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  tradingBlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  tradingBlockedText: {
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
  },
  killSwitchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  killSwitchCardActive: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  killSwitchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  killSwitchTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  killSwitchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  killSwitchLabelActive: {
    color: "#DC2626",
  },
  killSwitchStatus: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  killSwitchReason: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FECACA",
    borderRadius: 8,
  },
  killSwitchReasonText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  gaugesSection: {
    gap: 16,
    marginBottom: 20,
  },
  gaugeContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  gaugeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  gaugeValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 4,
  },
  gaugeMax: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  metricSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  exposureSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  exposureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  exposureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exposureLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  exposureValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  exposureDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  largestPosition: {
    alignItems: "flex-end",
  },
  largestPositionSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  largestPositionValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  settingInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingInput: {
    width: 60,
    padding: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
  settingSuffix: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
