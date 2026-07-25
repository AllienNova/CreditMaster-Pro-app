/**
 * Fynvita Inquiry Removal Screen
 *
 * Real-data wiring (PARITY-P2): renders the user's real credit inquiries from
 * GET /api/credit-repair/inquiries (withAuth) via creditRepairApi.getInquiries,
 * adapted web -> mobile by mapWebInquiry. Fetch on mount with honest inline
 * loading / error / empty states, a retry, and pull-to-refresh. The former
 * hardcoded INQUIRIES array, the local Inquiry interface, the fake setTimeout
 * load, and the fake "Dispute filed successfully" alert were removed; the stats
 * are computed from the real inquiries and each inquiry's removability is derived
 * from the FCRA 24-month rule. Nothing is fabricated.
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
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { creditRepairApi } from "../../src/services/api/creditRepair";
import type {
  CreditInquiry,
  InquiryBureau,
} from "../../src/services/api/creditRepair";

// inquiryDate arrives as an ISO string; render a compact locale date.
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

// Bureau is a lowercase DB enum; present it capitalized for display.
function formatBureau(bureau: InquiryBureau): string {
  return bureau.charAt(0).toUpperCase() + bureau.slice(1);
}

export default function InquiriesScreen() {
  const [inquiries, setInquiries] = useState<CreditInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async () => {
    const res = await creditRepairApi.getInquiries();
    if (res.success && res.data) {
      setInquiries(res.data.inquiries);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load inquiries.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchInquiries();
    setLoading(false);
  }, [fetchInquiries]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInquiries();
    setRefreshing(false);
  };

  // Stats computed from the real inquiries.
  const total = inquiries.length;
  const removableCount = inquiries.filter((i) => i.removable).length;
  const hardCount = inquiries.filter((i) => i.inquiryType === "hard").length;

  if (loading && inquiries.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-inquiries-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading inquiries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && inquiries.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-repair-inquiries-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
            <Text style={styles.title}>Credit Inquiries</Text>
            <Text style={styles.subtitle}>Manage credit inquiries</Text>
          </View>
        </View>

        {/* Info — computed from real inquiries */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{total}</Text>
              <Text style={styles.infoLabel}>Total Inquiries</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: theme.colors.success }]}>
                {removableCount}
              </Text>
              <Text style={styles.infoLabel}>Removable</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: theme.colors.warning }]}>
                {hardCount}
              </Text>
              <Text style={styles.infoLabel}>Hard</Text>
            </View>
          </View>
        </Card>

        {/* Tip */}
        <Card style={styles.tipCard}>
          <Ionicons name="bulb" size={18} color={theme.colors.warning} />
          <Text style={styles.tipText}>
            Hard inquiries fall off your credit report after 2 years.
            Unauthorized inquiries can be disputed immediately.
          </Text>
        </Card>

        {/* Inquiries List */}
        <View style={styles.inquiriesList}>
          <Text style={styles.sectionTitle}>Your Inquiries</Text>
          {inquiries.length === 0 ? (
            <View
              style={styles.emptyCard}
              testID="credit-repair-inquiries-empty"
            >
              <Ionicons
                name="search-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No inquiries found</Text>
              <Text style={styles.emptyText}>
                When a lender checks your credit, the inquiry will appear here.
              </Text>
            </View>
          ) : (
            inquiries.map((inquiry) => (
              <Card key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryHeader}>
                  <View style={styles.inquiryIcon}>
                    <Ionicons
                      name="search"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.inquiryInfo}>
                    <Text style={styles.inquiryCreditor}>
                      {inquiry.creditor}
                    </Text>
                    <View style={styles.inquiryMeta}>
                      <Text style={styles.inquiryDate}>
                        {formatDate(inquiry.inquiryDate)}
                      </Text>
                      {inquiry.bureau && (
                        <Text style={styles.inquiryBureau}>
                          • {formatBureau(inquiry.bureau)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {inquiry.removable ? (
                    <View style={styles.removableBadge}>
                      <Text style={styles.removableText}>Removable</Text>
                    </View>
                  ) : (
                    <View style={styles.validBadge}>
                      <Text style={styles.validText}>Valid</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>
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
    padding: theme.spacing.lg,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoItem: { flex: 1, alignItems: "center" },
  infoValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  infoLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  infoDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  tipCard: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
  inquiriesList: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  inquiryCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  inquiryHeader: { flexDirection: "row", alignItems: "center" },
  inquiryIcon: {
    width: 40,
    height: 40,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inquiryInfo: { flex: 1, marginLeft: 12 },
  inquiryCreditor: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  inquiryMeta: { flexDirection: "row", marginTop: 2 },
  inquiryDate: { fontSize: 12, color: theme.colors.textSecondary },
  inquiryBureau: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  removableBadge: {
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removableText: { fontSize: 12, fontWeight: "600", color: theme.colors.success },
  validBadge: {
    backgroundColor: `${theme.colors.textSecondary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  validText: { fontSize: 12, color: theme.colors.textSecondary },
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
});
