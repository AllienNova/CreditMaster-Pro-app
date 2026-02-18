/**
 * Fynvita Tradelines Marketplace Screen
 * Authorized user tradelines
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Tradeline {
  id: string;
  bank: string;
  creditLimit: number;
  age: string;
  utilization: number;
  price: number;
  available: boolean;
}

const TRADELINES: Tradeline[] = [
  {
    id: "1",
    bank: "Chase",
    creditLimit: 15000,
    age: "8 years",
    utilization: 5,
    price: 350,
    available: true,
  },
  {
    id: "2",
    bank: "American Express",
    creditLimit: 25000,
    age: "12 years",
    utilization: 3,
    price: 550,
    available: true,
  },
  {
    id: "3",
    bank: "Capital One",
    creditLimit: 10000,
    age: "5 years",
    utilization: 8,
    price: 250,
    available: false,
  },
  {
    id: "4",
    bank: "Discover",
    creditLimit: 8000,
    age: "6 years",
    utilization: 10,
    price: 200,
    available: true,
  },
  {
    id: "5",
    bank: "Citi",
    creditLimit: 20000,
    age: "10 years",
    utilization: 2,
    price: 450,
    available: true,
  },
];

export default function TradelinesScreen() {
  const handlePurchase = (tradeline: Tradeline) => {
    Alert.alert(
      "Purchase Tradeline",
      `Add ${tradeline.bank} tradeline for $${tradeline.price}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => router.push("/settings/billing") },
      ],
    );
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
          <Text style={styles.title}>Tradelines</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>What are Tradelines?</Text>
            <Text style={styles.infoText}>
              Tradelines are credit accounts that appear on your credit report.
              Being added as an authorized user on someone else's account can
              help build your credit history.
            </Text>
          </View>
        </Card>

        {/* How It Works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsRow}>
          {[
            { step: "1", title: "Choose", desc: "Select a tradeline" },
            { step: "2", title: "Purchase", desc: "Complete payment" },
            { step: "3", title: "Added", desc: "Added to your report" },
          ].map((item, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>{item.step}</Text>
              </View>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Tradelines List */}
        <Text style={styles.sectionTitle}>Available Tradelines</Text>
        {TRADELINES.map((tradeline) => (
          <Card
            key={tradeline.id}
            style={[
              styles.tradelineCard,
              !tradeline.available && styles.unavailableCard,
            ]}
          >
            <View style={styles.tradelineHeader}>
              <View>
                <Text style={styles.tradelineBank}>{tradeline.bank}</Text>
                <Text style={styles.tradelineAge}>{tradeline.age} old</Text>
              </View>
              <Text style={styles.tradelinePrice}>${tradeline.price}</Text>
            </View>

            <View style={styles.tradelineStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Credit Limit</Text>
                <Text style={styles.statValue}>
                  ${tradeline.creditLimit.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Utilization</Text>
                <Text style={styles.statValue}>{tradeline.utilization}%</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Status</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: tradeline.available ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  {tradeline.available ? "Available" : "Sold Out"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                !tradeline.available && styles.purchaseButtonDisabled,
              ]}
              onPress={() => handlePurchase(tradeline)}
              disabled={!tradeline.available}
            >
              <Text style={styles.purchaseButtonText}>
                {tradeline.available ? "Purchase" : "Unavailable"}
              </Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            Tradelines are typically removed after 1-2 billing cycles. Results
            may vary. This is not a guarantee of credit score improvement.
          </Text>
        </Card>

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
  infoBanner: { marginBottom: theme.spacing.lg },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  stepItem: { flex: 1, alignItems: "center" },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumber: { fontSize: 16, fontWeight: "700", color: "#fff" },
  stepTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  stepDesc: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  tradelineCard: { marginBottom: theme.spacing.sm },
  unavailableCard: { opacity: 0.6 },
  tradelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  tradelineBank: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  tradelineAge: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tradelinePrice: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  tradelineStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  purchaseButtonDisabled: { backgroundColor: theme.colors.textSecondary },
  purchaseButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    marginTop: theme.spacing.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    marginLeft: 10,
    lineHeight: 16,
  },
});
