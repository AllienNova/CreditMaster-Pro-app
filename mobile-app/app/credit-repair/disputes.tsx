/**
 * Fynvita Credit Repair Disputes Screen
 * File and track credit disputes
 */

import React, { useState, useEffect } from "react";
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

interface Dispute {
  id: string;
  item: string;
  bureau: string;
  status: "pending" | "in_progress" | "resolved" | "rejected";
  date: string;
}

const DISPUTES: Dispute[] = [
  {
    id: "1",
    item: "Late Payment - Chase",
    bureau: "Experian",
    status: "in_progress",
    date: "2024-12-01",
  },
  {
    id: "2",
    item: "Collection Account",
    bureau: "Equifax",
    status: "pending",
    date: "2024-11-28",
  },
  {
    id: "3",
    item: "Hard Inquiry",
    bureau: "TransUnion",
    status: "resolved",
    date: "2024-11-15",
  },
  {
    id: "4",
    item: "Balance Error",
    bureau: "Experian",
    status: "rejected",
    date: "2024-11-10",
  },
];

export default function DisputesScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return theme.colors.warning;
      case "in_progress":
        return theme.colors.primary;
      case "resolved":
        return theme.colors.success;
      case "rejected":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Text style={styles.title}>Disputes</Text>
            <Text style={styles.subtitle}>Track your disputes</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{DISPUTES.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {DISPUTES.filter((d) => d.status === "in_progress").length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.success}10` },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {DISPUTES.filter((d) => d.status === "resolved").length}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </Card>
        </View>

        {/* Disputes List */}
        <View style={styles.disputesList}>
          {DISPUTES.map((dispute) => (
            <Card key={dispute.id} style={styles.disputeCard}>
              <View style={styles.disputeHeader}>
                <Text style={styles.disputeItem}>{dispute.item}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(dispute.status)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(dispute.status) },
                    ]}
                  >
                    {dispute.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <View style={styles.disputeDetails}>
                <View style={styles.detailItem}>
                  <Ionicons
                    name="business"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailText}>{dispute.bureau}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons
                    name="calendar"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailText}>{dispute.date}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* New Dispute Button */}
        <TouchableOpacity style={styles.newDisputeButton}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.newDisputeText}>File New Dispute</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
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
  disputesList: { paddingHorizontal: theme.spacing.lg },
  disputeCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  disputeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  disputeItem: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  disputeDetails: { flexDirection: "row" },
  detailItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  newDisputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
  },
  newDisputeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
