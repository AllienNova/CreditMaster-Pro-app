/**
 * Admin Audit Trail — the real audit_logs table.
 *
 * WHAT THIS REPLACED. An AUDIT_EVENTS fixture — "User Login /
 * john@example.com / Successful login from 192.168.1.1" and six more — shown
 * behind a FAKE loading spinner:
 *
 *   useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);
 *
 * It simulated fetching and then rendered a constant. An audit trail that
 * shows invented events is worse than one that shows none: it is the record an
 * operator consults to establish what actually happened, and it would have
 * answered confidently and wrongly.
 *
 * WHERE THE DATA COMES FROM. GET /api/admin/audit (withRole "admin") reads
 * audit_logs joined to profiles, paginated.
 *
 * THE FILTER CHIPS WERE INVENTED. login | data | admin | security is not a
 * column; audit_logs has `action` and `resource_type`. No real row could have
 * matched a chip. Chips are now built from the resource_types actually
 * present, the same way the subscriptions screen was fixed.
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
  adminAuditApi,
  type AdminAuditEvent,
} from "../../src/services/api/admin";

/** "credit_report" -> "Credit report". resource_type is a lower_snake slug. */
const prettyResource = (value: string): string =>
  value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Other";

/**
 * A stable colour per resource type, chosen by hashing the string rather than
 * from a lookup table. The old table keyed off four invented categories; a
 * real deployment can have any number of resource types and none of them are
 * known here at build time.
 */
const RESOURCE_COLORS = [
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];
const resourceColor = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return RESOURCE_COLORS[Math.abs(hash) % RESOURCE_COLORS.length];
};

export default function AdminAuditScreen() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await adminAuditApi.getAuditLog();

    if (!res.success || !res.data) {
      // An audit trail must never degrade to an empty list on failure: "no
      // events recorded" and "we could not read the log" are opposite claims,
      // and an operator would act on the first one.
      setError("We could not load the audit trail.");
      setLoading(false);
      return;
    }

    setEvents(res.data.events);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Built from the resource types actually present. The old chips named four
  // categories no audit_logs row can carry.
  const resourceTypes = Array.from(
    new Set(events.map((e) => e.resourceType).filter(Boolean)),
  ).sort();

  const filteredEvents = filter
    ? events.filter((e) => e.resourceType === filter)
    : events;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading audit trail...</Text>
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
            <Text style={styles.title}>Audit Trail</Text>
            <Text style={styles.subtitle}>Security & activity logs</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {["All", ...resourceTypes].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                (filter === type || (type === "All" && !filter)) &&
                  styles.filterChipActive,
              ]}
              onPress={() => setFilter(type === "All" ? null : type)}
            >
              <Text
                style={[
                  styles.filterText,
                  (filter === type || (type === "All" && !filter)) &&
                    styles.filterTextActive,
                ]}
              >
                {type === "All" ? "All" : prettyResource(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events List */}
        <View style={styles.eventsList}>
          {error ? (
            <Card>
              <Text style={styles.loadingText}>{error}</Text>
              <TouchableOpacity onPress={load}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </Card>
          ) : events.length === 0 ? (
            <Card>
              <Text style={styles.loadingText}>
                No audit events have been recorded yet.
              </Text>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card>
              <Text style={styles.loadingText}>
                No audit events for this resource type.
              </Text>
            </Card>
          ) : null}
          {filteredEvents.map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View
                  style={[
                    styles.typeIcon,
                    {
                      backgroundColor: `${resourceColor(event.resourceType)}15`,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text"
                    size={18}
                    color={resourceColor(event.resourceType)}
                  />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventAction}>{event.action}</Text>
                  {/* Empty when audit_logs has no profile for the actor —
                      an opaque user_id would not help an operator, and a
                      synthesised address would be a lie about who acted. */}
                  {event.user ? (
                    <Text style={styles.eventUser}>{event.user}</Text>
                  ) : null}
                </View>
                <Text style={styles.eventTime}>
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleTimeString()
                    : ""}
                </Text>
              </View>
              {/* Composed only from columns that exist. The old line read
                  "Successful login from 192.168.1.1" — a sentence no column
                  contains. */}
              <Text style={styles.eventDetails}>
                {[
                  prettyResource(event.resourceType),
                  event.resourceId,
                  event.ipAddress ? `from ${event.ipAddress}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.eventDate}>
                {event.timestamp
                  ? new Date(event.timestamp).toLocaleDateString()
                  : ""}
              </Text>
            </Card>
          ))}
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
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  eventsList: { paddingHorizontal: theme.spacing.lg },
  eventCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  eventHeader: { flexDirection: "row", alignItems: "center" },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: { flex: 1, marginLeft: 12 },
  eventAction: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  eventUser: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  eventTime: { fontSize: 12, color: theme.colors.textSecondary },
  eventDetails: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 8,
    backgroundColor: theme.colors.background,
    padding: 8,
    borderRadius: 6,
  },
  eventDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8 },
});
