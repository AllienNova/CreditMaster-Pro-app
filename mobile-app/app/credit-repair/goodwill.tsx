/**
 * Fynvita Goodwill Letters Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real goodwill letters from
 * GET /api/credit-repair/goodwill (withAuth) via creditRepairApi.getGoodwillLetters,
 * adapted web -> mobile by mapWebGoodwillLetter. Fetch on mount with honest inline
 * loading / error / empty states and pull-to-refresh. The former hardcoded LETTERS
 * array, the local Letter interface, and the fake setTimeout load were removed;
 * the stats are computed from the real letters. Nothing is fabricated.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import { toArray } from "../../src/store/toArray";
import type {
  GoodwillLetter,
  GoodwillLetterStatus,
} from "../../src/services/api/creditRepair";

// createdAt arrives as an ISO string; render a compact locale date.
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function GoodwillScreen() {
  const [letters, setLetters] = useState<GoodwillLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLetters = useCallback(async () => {
    const res = await creditRepairApi.getGoodwillLetters();
    if (res.success && res.data) {
      setLetters(toArray<GoodwillLetter>(res?.data?.letters));
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load goodwill letters.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchLetters();
    } finally {
      setLoading(false);
    }
  }, [fetchLetters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLetters();
    setRefreshing(false);
  };

  // status is a closed union (GoodwillLetterStatus); the switch is exhaustive.
  const getStatusColor = (status: GoodwillLetterStatus): string => {
    switch (status) {
      case "draft":
        return theme.colors.textSecondary;
      case "sent":
        return theme.colors.primary;
      case "responded":
        return theme.colors.warning;
      case "success":
        return theme.colors.success;
    }
  };

  const total = letters.length;
  const successCount = letters.filter((l) => l.status === "success").length;
  const pendingCount = letters.filter((l) => l.status === "sent").length;

  if (loading && letters.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-goodwill-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading goodwill letters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && letters.length === 0) {
    return (
      <ScreenError
        title="Goodwill Letters"
        message={error}
        onRetry={load}
        testID="credit-repair-goodwill-error"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Goodwill Letters</Text>
            <Text style={styles.subtitle}>Request late payment removal</Text>
          </View>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.infoTitle}> What is a Goodwill Letter?</Text>
          </View>
          <Text style={styles.infoText}>
            A goodwill letter is a polite request to a creditor asking them to
            remove a late payment from your credit report as a gesture of
            goodwill. Success rates are higher if you have a good payment
            history otherwise.
          </Text>
        </Card>

        {/* Stats — computed from real letters */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.success}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {successCount}
            </Text>
            <Text style={styles.statLabel}>Successful</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
        </View>

        {/* Letters List */}
        <View style={styles.lettersList}>
          <Text style={styles.sectionTitle}>Your Letters</Text>
          {letters.length === 0 ? (
            <View
              style={styles.emptyCard}
              testID="credit-repair-goodwill-empty"
            >
              <Ionicons
                name="mail-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No goodwill letters yet</Text>
              <Text style={styles.emptyText}>
                Create a goodwill letter to ask a creditor to remove a late
                payment from your credit report.
              </Text>
            </View>
          ) : (
            letters.map((letter) => (
              <Card key={letter.id} style={styles.letterCard}>
                <View style={styles.letterHeader}>
                  <View style={styles.letterIcon}>
                    <Ionicons
                      name="mail"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.letterInfo}>
                    <Text style={styles.letterCreditor}>{letter.creditor}</Text>
                    <Text style={styles.letterDate}>
                      {formatDate(letter.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(letter.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(letter.status) },
                      ]}
                    >
                      {letter.status}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="create" size={22} color="#fff" />
          <Text style={styles.createText}>Create New Letter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  infoCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}08`,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.primary },
  infoText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  lettersList: { paddingHorizontal: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  letterCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  letterHeader: { flexDirection: "row", alignItems: "center" },
  letterIcon: {
    width: 40,
    height: 40,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  letterInfo: { flex: 1, marginLeft: 12 },
  letterCreditor: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  letterDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createText: { fontSize: 16, fontWeight: "600", color: "#fff", marginLeft: 8 },
});
