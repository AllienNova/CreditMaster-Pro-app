import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { disputesAPI, DisputeStrategy } from "../../services/api";
import { toArray } from "../../src/store/toArray";

// Local strategy data (fallback when API unavailable)

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "#16A34A";
    case "intermediate":
      return "#D97706";
    case "advanced":
      return "#DC2626";
    case "expert":
      return "#7C3AED";
    default:
      return "#6B7280";
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low":
      return "#16A34A";
    case "medium":
      return "#D97706";
    case "high":
      return "#DC2626";
    default:
      return "#6B7280";
  }
};

export default function StrategiesScreen() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<DisputeStrategy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await disputesAPI.getStrategies();
      if (!data?.strategies || apiError) {
        // No silent fallback. This used to keep LOCAL_STRATEGIES — five
        // strategies with success rates — so a failed read was
        // indistinguishable from a successful one, and the user chose a
        // dispute tactic from a list the server never sent.
        setError("We could not load dispute strategies.");
        setStrategies([]);
        setLoading(false);
        return;
      }
      setStrategies(toArray<DisputeStrategy>(data.strategies));
    } catch {
      setError("We could not load dispute strategies.");
      setStrategies([]);
    }
    setLoading(false);
  };

  const filteredStrategies = strategies.filter(
    (s) => !selectedDifficulty || s.difficulty === selectedDifficulty,
  );

  const handleSelectStrategy = (strategy: DisputeStrategy) => {
    router.push({
      pathname: "/dispute/use-strategy",
      params: { strategyId: strategy.id, strategyName: strategy.name },
    } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Strategies</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons
          name="shield-checkmark"
          size={24}
          color={lightTheme.colors.primary}
        />
        <Text style={styles.infoText}>
          These strategies combine FCRA rights with proven dispute techniques
          for maximum effectiveness
        </Text>
      </View>

      {/* Difficulty Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {["all", "beginner", "intermediate", "advanced", "expert"].map(
          (diff) => (
            <TouchableOpacity
              key={diff}
              style={[
                styles.filterChip,
                (selectedDifficulty === diff ||
                  (diff === "all" && !selectedDifficulty)) &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                setSelectedDifficulty(diff === "all" ? null : diff)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  (selectedDifficulty === diff ||
                    (diff === "all" && !selectedDifficulty)) &&
                    styles.filterTextActive,
                ]}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightTheme.colors.primary} />
        </View>
      ) : error ? (
        // The list used to fall back to five hardcoded strategies here, so a
        // failed read looked exactly like a successful one — and the user
        // picked a dispute tactic from a list the server never sent.
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchStrategies}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.strategiesList}>
          {filteredStrategies.map((strategy) => (
            <TouchableOpacity
              key={strategy.id}
              style={styles.strategyCard}
              onPress={() =>
                setExpandedId(expandedId === strategy.id ? null : strategy.id)
              }
              activeOpacity={0.8}
            >
              <View style={styles.strategyHeader}>
                <Text style={styles.strategyName}>{strategy.name}</Text>
                {/*
                  Labelled, because a bare colour-coded "72%" reads as this
                  user's measured outcome. It is not: the number is a constant
                  in src/lib/disputes/advanced-strategies.ts, editorial
                  guidance about the tactic in general. Nothing measures it —
                  `disputes.outcome` exists and could, once there are resolved
                  disputes to count.
                */}
                <View style={styles.rateBlock}>
                  <Text
                    style={[
                      styles.successRate,
                      {
                        color:
                          strategy.successRate >= 60 ? "#16A34A" : "#D97706",
                      },
                    ]}
                  >
                    {strategy.successRate}%
                  </Text>
                  <Text style={styles.rateCaption}>typical</Text>
                </View>
              </View>

              <Text
                style={styles.strategyDesc}
                numberOfLines={expandedId === strategy.id ? undefined : 2}
              >
                {strategy.description}
              </Text>

              <View style={styles.badges}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        getDifficultyColor(strategy.difficulty) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: getDifficultyColor(strategy.difficulty) },
                    ]}
                  >
                    {strategy.difficulty}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: getRiskColor(strategy.riskLevel) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: getRiskColor(strategy.riskLevel) },
                    ]}
                  >
                    {strategy.riskLevel} risk
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={lightTheme.colors.textSecondary}
                  />
                  <Text style={styles.badgeText}>{strategy.timeline}</Text>
                </View>
              </View>

              {expandedId === strategy.id && (
                <View style={styles.expandedContent}>
                  <Text style={styles.sectionTitle}>Steps:</Text>
                  {strategy.steps.map((step, i) => (
                    <View key={i} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{step.step}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDesc}>{step.description}</Text>
                      </View>
                    </View>
                  ))}

                  <Text style={styles.sectionTitle}>Legal Basis:</Text>
                  <View style={styles.legalList}>
                    {strategy.legalBasis.map((law, i) => (
                      <Text key={i} style={styles.legalItem}>
                        • {law}
                      </Text>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.useButton}
                    onPress={() => handleSelectStrategy(strategy)}
                  >
                    <Text style={styles.useButtonText}>Use This Strategy</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.expandIcon}>
                <Ionicons
                  name={
                    expandedId === strategy.id ? "chevron-up" : "chevron-down"
                  }
                  size={20}
                  color={lightTheme.colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: lightTheme.colors.primary + "10",
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: lightTheme.colors.text,
    lineHeight: 18,
  },
  filterContainer: { maxHeight: 50, paddingHorizontal: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: lightTheme.colors.primary },
  filterText: { fontSize: 14, color: lightTheme.colors.textSecondary },
  filterTextActive: { color: "#FFFFFF", fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  strategiesList: { flex: 1, padding: 16 },
  strategyCard: {
    backgroundColor: lightTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  strategyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 17,
    fontWeight: "600",
    color: lightTheme.colors.text,
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: lightTheme.colors.error,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    color: lightTheme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
  rateBlock: { alignItems: "flex-end" },
  rateCaption: {
    fontSize: 10,
    color: lightTheme.colors.textSecondary,
    marginTop: -2,
  },
  successRate: { fontSize: 16, fontWeight: "700" },
  strategyDesc: {
    fontSize: 14,
    color: lightTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: lightTheme.colors.background,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: lightTheme.colors.textSecondary,
    textTransform: "capitalize",
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTheme.colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  stepItem: { flexDirection: "row", marginBottom: 12, gap: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "500", color: lightTheme.colors.text },
  stepDesc: {
    fontSize: 13,
    color: lightTheme.colors.textSecondary,
    marginTop: 2,
  },
  legalList: { marginBottom: 16 },
  legalItem: {
    fontSize: 13,
    color: lightTheme.colors.textSecondary,
    marginBottom: 4,
  },
  useButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTheme.colors.primary,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  useButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  expandIcon: { position: "absolute", right: 16, bottom: 16 },
});
