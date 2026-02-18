/**
 * Fynvita Credit Services Marketplace Screen
 * Professional credit repair services
 */

import React from "react";
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

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  rating: number;
  reviews: number;
  turnaround: string;
}

const SERVICES: Service[] = [
  {
    id: "1",
    name: "Basic Credit Repair",
    description: "Essential dispute service for common errors",
    price: "$79/mo",
    features: [
      "Up to 5 disputes/month",
      "Basic letter templates",
      "Email support",
      "Monthly progress report",
    ],
    rating: 4.5,
    reviews: 234,
    turnaround: "30-45 days",
  },
  {
    id: "2",
    name: "Premium Credit Repair",
    description: "Comprehensive repair with dedicated support",
    price: "$149/mo",
    features: [
      "Unlimited disputes",
      "Custom dispute letters",
      "Phone support",
      "Weekly updates",
      "Creditor negotiations",
    ],
    rating: 4.8,
    reviews: 567,
    turnaround: "30-45 days",
  },
  {
    id: "3",
    name: "Credit Audit",
    description: "One-time comprehensive credit analysis",
    price: "$199",
    features: [
      "Full 3-bureau analysis",
      "Dispute recommendations",
      "Action plan",
      "Score improvement roadmap",
    ],
    rating: 4.7,
    reviews: 189,
    turnaround: "5-7 days",
  },
  {
    id: "4",
    name: "Rapid Rescore",
    description: "Fast score update for mortgage applications",
    price: "$150/bureau",
    features: [
      "24-48 hour turnaround",
      "Direct bureau submission",
      "Lender coordination",
      "Documentation support",
    ],
    rating: 4.9,
    reviews: 78,
    turnaround: "24-48 hours",
  },
];

export default function ServicesScreen() {
  const handleGetStarted = (service: Service) => {
    router.push("/settings/billing");
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
          <Text style={styles.title}>Credit Services</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.infoText}>
            All services include a money-back guarantee if we can't help improve
            your credit.
          </Text>
        </Card>

        {/* Services List */}
        {SERVICES.map((service) => (
          <Card key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>
              </View>
              <Text style={styles.servicePrice}>{service.price}</Text>
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
              <View style={styles.footerLeft}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{service.rating}</Text>
                  <Text style={styles.reviewsText}>({service.reviews})</Text>
                </View>
                <View style={styles.turnaroundRow}>
                  <Ionicons
                    name="time"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.turnaroundText}>
                    {service.turnaround}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => handleGetStarted(service)}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Guarantee Card */}
        <Card style={styles.guaranteeCard}>
          <Ionicons name="ribbon" size={32} color={theme.colors.primary} />
          <Text style={styles.guaranteeTitle}>100% Satisfaction Guarantee</Text>
          <Text style={styles.guaranteeText}>
            If we can't help improve your credit within 90 days, we'll refund
            your money. No questions asked.
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${theme.colors.primary}10`,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 18,
  },
  serviceCard: { marginBottom: theme.spacing.md },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  serviceName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  serviceDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    maxWidth: "80%",
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  featuresSection: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
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
    marginTop: theme.spacing.sm,
  },
  footerLeft: {},
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  turnaroundRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  turnaroundText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  getStartedButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  getStartedText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  guaranteeCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  guaranteeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: theme.spacing.md,
  },
});
