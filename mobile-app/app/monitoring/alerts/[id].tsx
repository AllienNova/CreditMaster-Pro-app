/**
 * Fynvita Alert Detail Screen
 * Alert type, severity, description, recommended actions
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import { useCreditStore } from "../../../src/store/creditStore";

const getAlertIcon = (type: string) => {
  switch (type) {
    case "score_change":
      return "trending-up";
    case "new_account":
      return "add-circle";
    case "inquiry":
      return "search";
    case "payment":
      return "card";
    case "balance":
      return "wallet";
    default:
      return "alert-circle";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "#EF4444";
    case "medium":
      return "#F59E0B";
    case "low":
      return "#10B981";
    default:
      return theme.colors.textSecondary;
  }
};

const getRecommendedActions = (type: string, severity: string) => {
  const actions: {
    icon: string;
    title: string;
    description: string;
    route?: string;
  }[] = [];

  if (type === "score_change") {
    actions.push({
      icon: "analytics",
      title: "View Score History",
      description: "See how your score has changed over time",
      route: "/credit/history",
    });
    actions.push({
      icon: "pie-chart",
      title: "Check Credit Factors",
      description: "Understand what's affecting your score",
      route: "/credit/factors",
    });
  } else if (type === "new_account") {
    actions.push({
      icon: "document-text",
      title: "Review Account",
      description: "Verify this account belongs to you",
      route: "/disputes/new",
    });
    if (severity === "high") {
      actions.push({
        icon: "shield",
        title: "Freeze Credit",
        description: "Prevent unauthorized accounts",
        route: "/identity/freeze",
      });
    }
  } else if (type === "inquiry") {
    actions.push({
      icon: "search",
      title: "View Inquiry Details",
      description: "See who checked your credit",
      route: "/credit/inquiries",
    });
    if (severity === "high") {
      actions.push({
        icon: "alert-circle",
        title: "Dispute Inquiry",
        description: "Challenge unauthorized inquiries",
        route: "/disputes/new",
      });
    }
  }

  actions.push({
    icon: "help-circle",
    title: "Get Help",
    description: "Contact support for assistance",
    route: "/help",
  });
  return actions;
};

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { alerts, acknowledgeAlert, deleteAlert } = useCreditStore();
  const [alert, setAlert] = useState(alerts.find((a) => a.id === id));

  useEffect(() => {
    if (alert && !alert.acknowledged) {
      acknowledgeAlert(alert.id);
    }
  }, [alert?.id]);

  if (!alert) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Alert</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.notFound}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.notFoundText}>Alert not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const severityColor = getSeverityColor(alert.severity);
  const recommendedActions = getRecommendedActions(alert.type, alert.severity);

  const handleDelete = () => {
    Alert.alert("Delete Alert", "Are you sure you want to delete this alert?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteAlert(alert.id);
          router.back();
        },
      },
    ]);
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
          <Text style={styles.title}>Alert Details</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Alert Card */}
        <Card style={styles.alertCard}>
          <View
            style={[
              styles.alertIcon,
              { backgroundColor: `${severityColor}20` },
            ]}
          >
            <Ionicons
              name={getAlertIcon(alert.type) as keyof typeof Ionicons.glyphMap}
              size={32}
              color={severityColor}
            />
          </View>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: `${severityColor}20` },
            ]}
          >
            <Text style={[styles.severityText, { color: severityColor }]}>
              {alert.severity} priority
            </Text>
          </View>
          <Text style={styles.alertDate}>
            {new Date(alert.createdAt).toLocaleString()}
          </Text>
        </Card>

        {/* Description */}
        <Card style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{alert.description}</Text>
          {alert.details && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Additional Details</Text>
              {Object.entries(alert.details).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{key.replace(/_/g, " ")}</Text>
                  <Text style={styles.detailValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Recommended Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Recommended Actions</Text>
          {recommendedActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={() => action.route && router.push(action.route as never)}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name={action.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </Card>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFoundText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  alertCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  alertIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  severityText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  alertDate: { fontSize: 13, color: theme.colors.textSecondary },
  descriptionCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  detailsSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailKey: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },
  detailValue: { fontSize: 13, color: theme.colors.text, fontWeight: "500" },
  actionsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "500", color: theme.colors.text },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
