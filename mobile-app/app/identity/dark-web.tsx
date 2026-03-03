/**
 * Fynvita Dark Web Monitoring Screen
 * Scan for exposed credentials and data breaches
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Breach {
  id: string;
  source: string;
  date: string;
  dataTypes: string[];
  severity: "critical" | "high" | "medium" | "low";
  resolved: boolean;
}

interface MonitoredItem {
  id: string;
  type: "email" | "phone" | "ssn" | "password";
  value: string;
  status: "safe" | "exposed";
  breachCount: number;
}

const MOCK_BREACHES: Breach[] = [
  {
    id: "1",
    source: "LinkedIn",
    date: "2023-06-15",
    dataTypes: ["Email", "Password", "Name"],
    severity: "high",
    resolved: false,
  },
  {
    id: "2",
    source: "Adobe",
    date: "2022-11-20",
    dataTypes: ["Email", "Password"],
    severity: "medium",
    resolved: true,
  },
  {
    id: "3",
    source: "Dropbox",
    date: "2021-08-10",
    dataTypes: ["Email"],
    severity: "low",
    resolved: true,
  },
];

const MONITORED_ITEMS: MonitoredItem[] = [
  {
    id: "1",
    type: "email",
    value: "john.doe@email.com",
    status: "exposed",
    breachCount: 2,
  },
  {
    id: "2",
    type: "email",
    value: "johndoe@work.com",
    status: "safe",
    breachCount: 0,
  },
  {
    id: "3",
    type: "phone",
    value: "(555) 123-4567",
    status: "safe",
    breachCount: 0,
  },
  {
    id: "4",
    type: "ssn",
    value: "***-**-1234",
    status: "safe",
    breachCount: 0,
  },
];

export default function DarkWebScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"breaches" | "monitored">(
    "breaches",
  );

  const unresolvedBreaches = MOCK_BREACHES.filter((b) => !b.resolved).length;
  const exposedItems = MONITORED_ITEMS.filter(
    (i) => i.status === "exposed",
  ).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return "mail";
      case "phone":
        return "call";
      case "ssn":
        return "finger-print";
      default:
        return "key";
    }
  };

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 3000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dark Web Monitoring</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Card */}
        <Card
          style={[
            styles.statusCard,
            unresolvedBreaches > 0
              ? styles.statusCardWarning
              : styles.statusCardSafe,
          ]}
        >
          <View style={styles.statusIcon}>
            <Ionicons
              name={unresolvedBreaches > 0 ? "warning" : "shield-checkmark"}
              size={40}
              color={unresolvedBreaches > 0 ? "#F59E0B" : "#22C55E"}
            />
          </View>
          <Text style={styles.statusTitle}>
            {unresolvedBreaches > 0
              ? `${unresolvedBreaches} Breach${unresolvedBreaches > 1 ? "es" : ""} Found`
              : "No Active Breaches"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {exposedItems} item{exposedItems !== 1 ? "s" : ""} exposed • Last
            scan: Today
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={runScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.scanButtonText}>Scan Now</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "breaches" && styles.tabActive]}
            onPress={() => setSelectedTab("breaches")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "breaches" && styles.tabTextActive,
              ]}
            >
              Breaches ({MOCK_BREACHES.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === "monitored" && styles.tabActive,
            ]}
            onPress={() => setSelectedTab("monitored")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "monitored" && styles.tabTextActive,
              ]}
            >
              Monitored ({MONITORED_ITEMS.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Breaches Tab */}
        {selectedTab === "breaches" && (
          <>
            {MOCK_BREACHES.map((breach) => (
              <TouchableOpacity
                key={breach.id}
                onPress={() => router.push(`/identity/breach/${breach.id}` as Href)}
              >
                <Card
                  style={[
                    styles.breachCard,
                    breach.resolved && styles.breachCardResolved,
                  ]}
                >
                  <View style={styles.breachRow}>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: `${getSeverityColor(breach.severity)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: getSeverityColor(breach.severity) },
                        ]}
                      >
                        {breach.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.breachInfo}>
                      <Text style={styles.breachSource}>{breach.source}</Text>
                      <Text style={styles.breachDate}>{breach.date}</Text>
                    </View>
                    {breach.resolved ? (
                      <View style={styles.resolvedBadge}>
                        <Text style={styles.resolvedText}>Resolved</Text>
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    )}
                  </View>
                  <View style={styles.dataTypesRow}>
                    {breach.dataTypes.map((type, idx) => (
                      <View key={idx} style={styles.dataTypeBadge}>
                        <Text style={styles.dataTypeText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Monitored Tab */}
        {selectedTab === "monitored" && (
          <>
            {MONITORED_ITEMS.map((item) => (
              <Card key={item.id} style={styles.monitoredCard}>
                <View style={styles.monitoredRow}>
                  <View
                    style={[
                      styles.monitoredIcon,
                      {
                        backgroundColor:
                          item.status === "exposed" ? "#FEE2E2" : "#D1FAE5",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getTypeIcon(item.type) as keyof typeof Ionicons.glyphMap
                      }
                      size={20}
                      color={item.status === "exposed" ? "#EF4444" : "#22C55E"}
                    />
                  </View>
                  <View style={styles.monitoredInfo}>
                    <Text style={styles.monitoredValue}>{item.value}</Text>
                    <Text style={styles.monitoredType}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.monitoredStatus}>
                    <Ionicons
                      name={
                        item.status === "exposed"
                          ? "alert-circle"
                          : "checkmark-circle"
                      }
                      size={24}
                      color={item.status === "exposed" ? "#EF4444" : "#22C55E"}
                    />
                    {item.breachCount > 0 && (
                      <Text style={styles.breachCountText}>
                        {item.breachCount} breach
                        {item.breachCount > 1 ? "es" : ""}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/identity/add-monitored" as Href)}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.addButtonText}>Add Item to Monitor</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusCard: { alignItems: "center", marginBottom: theme.spacing.lg },
  statusCardWarning: { backgroundColor: "#FEF3C720" },
  statusCardSafe: { backgroundColor: "#D1FAE520" },
  statusIcon: { marginBottom: theme.spacing.sm },
  statusTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },
  breachCard: { marginBottom: theme.spacing.sm },
  breachCardResolved: { opacity: 0.6 },
  breachRow: { flexDirection: "row", alignItems: "center" },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  severityText: { fontSize: 10, fontWeight: "700" },
  breachInfo: { flex: 1 },
  breachSource: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  breachDate: { fontSize: 12, color: theme.colors.textSecondary },
  resolvedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resolvedText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  dataTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.sm,
  },
  dataTypeBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  dataTypeText: { fontSize: 11, color: theme.colors.textSecondary },
  monitoredCard: { marginBottom: theme.spacing.sm },
  monitoredRow: { flexDirection: "row", alignItems: "center" },
  monitoredIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  monitoredInfo: { flex: 1 },
  monitoredValue: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  monitoredType: { fontSize: 12, color: theme.colors.textSecondary },
  monitoredStatus: { alignItems: "flex-end" },
  breachCountText: { fontSize: 11, color: "#EF4444", marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    borderStyle: "dashed",
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
    marginLeft: 8,
  },
});
