/**
 * Fynvita Monitoring Services Marketplace Screen
 * Compare credit monitoring services
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface MonitoringService {
  id: string;
  name: string;
  price: string;
  bureaus: number;
  features: string[];
  rating: number;
  recommended: boolean;
}

const SERVICES: MonitoringService[] = [
  {
    id: "1",
    name: "Fynvita Premium",
    price: "$29.99/mo",
    bureaus: 3,
    features: [
      "All 3 bureau monitoring",
      "Daily score updates",
      "AI dispute assistant",
      "Identity protection",
    ],
    rating: 4.9,
    recommended: true,
  },
  {
    id: "2",
    name: "Experian CreditWorks",
    price: "$24.99/mo",
    bureaus: 1,
    features: [
      "Experian monitoring",
      "FICO score",
      "Dark web scan",
      "Identity theft insurance",
    ],
    rating: 4.5,
    recommended: false,
  },
  {
    id: "3",
    name: "IdentityForce",
    price: "$17.99/mo",
    bureaus: 3,
    features: [
      "3-bureau monitoring",
      "Identity protection",
      "Social media monitoring",
      "$1M insurance",
    ],
    rating: 4.6,
    recommended: false,
  },
  {
    id: "4",
    name: "myFICO",
    price: "$39.95/mo",
    bureaus: 3,
    features: [
      "All FICO scores",
      "3-bureau reports",
      "Score simulator",
      "Identity monitoring",
    ],
    rating: 4.4,
    recommended: false,
  },
];

export default function MonitoringServicesScreen() {
  const handleLearnMore = (service: MonitoringService) => {
    if (service.name === "Fynvita Premium") {
      router.push("/settings/billing");
    } else {
      Linking.openURL(
        `https://www.google.com/search?q=${encodeURIComponent(service.name)}`,
      );
    }
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
          <Text style={styles.title}>Monitoring Services</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Comparison Info */}
        <Card style={styles.infoCard}>
          <Ionicons
            name="shield-checkmark"
            size={24}
            color={theme.colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Why Credit Monitoring?</Text>
            <Text style={styles.infoText}>
              Stay informed about changes to your credit report and catch
              identity theft early.
            </Text>
          </View>
        </Card>

        {/* Services List */}
        {SERVICES.map((service) => (
          <Card
            key={service.id}
            style={[
              styles.serviceCard,
              service.recommended && styles.recommendedCard,
            ]}
          >
            {service.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
            <View style={styles.serviceHeader}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePrice}>{service.price}</Text>
              </View>
              <View style={styles.bureauBadge}>
                <Text style={styles.bureauText}>
                  {service.bureaus} Bureau{service.bureaus > 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <View style={styles.featuresSection}>
              {service.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.serviceFooter}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{service.rating}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.learnButton,
                  service.recommended && styles.learnButtonPrimary,
                ]}
                onPress={() => handleLearnMore(service)}
              >
                <Text
                  style={[
                    styles.learnButtonText,
                    service.recommended && styles.learnButtonTextPrimary,
                  ]}
                >
                  {service.recommended ? "Get Started" : "Learn More"}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Comparison Table */}
        <Text style={styles.sectionTitle}>Quick Comparison</Text>
        <Card style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Feature</Text>
            <Text style={styles.comparisonValue}>Fynvita</Text>
            <Text style={styles.comparisonValue}>Others</Text>
          </View>
          {[
            ["AI Disputes", true, false],
            ["3-Bureau", true, "Varies"],
            ["Daily Updates", true, "Varies"],
            ["Identity Protection", true, true],
          ].map(([feature, cpfi, others], idx) => (
            <View key={idx} style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>{feature}</Text>
              <Ionicons
                name={cpfi === true ? "checkmark-circle" : "close-circle"}
                size={18}
                color={cpfi === true ? "#22C55E" : "#EF4444"}
              />
              <Text style={styles.comparisonOther}>
                {others === true ? "✓" : others === false ? "✗" : others}
              </Text>
            </View>
          ))}
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  infoContent: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  serviceCard: { marginBottom: theme.spacing.md },
  recommendedCard: { borderWidth: 2, borderColor: theme.colors.primary },
  recommendedBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  serviceName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  servicePrice: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  bureauBadge: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bureauText: { fontSize: 12, fontWeight: "500", color: theme.colors.primary },
  featuresSection: { marginBottom: theme.spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },
  learnButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  learnButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  learnButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  learnButtonTextPrimary: { color: "#fff" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  comparisonCard: {},
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  comparisonLabel: { flex: 1, fontSize: 13, color: theme.colors.text },
  comparisonValue: {
    width: 60,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  comparisonOther: {
    width: 60,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
