/**
 * Admin System Logs.
 *
 * WHAT THIS REPLACED. A LOGS fixture — "User john@example.com logged in
 * successfully", warnings, errors — under the subtitle "Real-time log viewer",
 * behind a FAKE loading spinner:
 *
 *   useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);
 *
 * THE SERVER ALREADY TOLD THE TRUTH AND THE SCREEN OVERRODE IT. GET
 * /api/admin/logs answers, and always has:
 *
 *   { logs: [], total: 0, dataAvailable: false,
 *     message: "System logs are not yet available. A system_logs table and
 *               writer are needed to populate this view." }
 *
 * Somebody made the honest call at the route and wrote down exactly why. The
 * screen rendered a fixture on top of it, so an operator reading "Real-time
 * log viewer" and seven plausible lines had no way to learn that no logging
 * backend exists.
 *
 * The route's own message is now surfaced verbatim rather than paraphrased, so
 * this copy cannot drift from what the server reports. The level filter and
 * "Load More Logs" went with the fixture: there is nothing to filter and
 * nothing more to load.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  adminLogsApi,
  type AdminSystemLogs,
} from "../../src/services/api/admin";

export default function AdminLogsScreen() {
  const [state, setState] = useState<AdminSystemLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await adminLogsApi.getSystemLogs();

    if (!res.success || !res.data) {
      setError("We could not reach the log service.");
      setLoading(false);
      return;
    }

    setState(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>System Logs</Text>
            {/* Was "Real-time log viewer". There is no log stream behind
                this screen and there never was. */}
            <Text style={styles.subtitle}>Application log viewer</Text>
          </View>
          {/* The refresh button had no handler. It re-reads now, which will
              honestly report "still unavailable" until system_logs exists. */}
          <TouchableOpacity
            testID="admin-logs-refresh"
            style={styles.refreshButton}
            onPress={load}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* No level filter: there are no rows to filter, and chips over an
            empty list are the same decoration the invented categories were on
            the audit screen. */}
        <View style={styles.logsList}>
          {error ? (
            <Card>
              <Text style={styles.loadingText}>{error}</Text>
              <TouchableOpacity onPress={load}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </Card>
          ) : state && !state.dataAvailable ? (
            <Card>
              <Ionicons
                name="information-circle"
                size={24}
                color={theme.colors.primary}
              />
              {/* The route's own words. Paraphrasing would let this copy drift
                  from what the server actually reports. */}
              <Text style={styles.loadingText}>{state.message}</Text>
            </Card>
          ) : state && state.total === 0 ? (
            <Card>
              <Text style={styles.loadingText}>No log entries recorded.</Text>
            </Card>
          ) : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  refreshButton: { padding: theme.spacing.sm },
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  filterTextActive: { color: "#fff" },
  logsList: { paddingHorizontal: theme.spacing.lg },
  logCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  logHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  levelText: { fontSize: 10, fontWeight: "700" },
  logSource: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  logTime: { fontSize: 11, color: theme.colors.textSecondary },
  logMessage: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  loadMoreButton: {
    alignItems: "center",
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  loadMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
