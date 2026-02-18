/**
 * Fynvita Secured Card Screen
 * Build credit with secured credit cards
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface SecuredCard {
  id: string;
  name: string;
  issuer: string;
  minDeposit: number;
  maxDeposit: number;
  annualFee: number;
  apr: string;
  features: string[];
  rating: number;
}

const SECURED_CARDS: SecuredCard[] = [
  {
    id: "1",
    name: "Discover it® Secured",
    issuer: "Discover",
    minDeposit: 200,
    maxDeposit: 2500,
    annualFee: 0,
    apr: "28.24%",
    features: [
      "2% cash back at restaurants & gas",
      "No annual fee",
      "Free FICO score",
    ],
    rating: 4.8,
  },
  {
    id: "2",
    name: "Capital One Platinum Secured",
    issuer: "Capital One",
    minDeposit: 49,
    maxDeposit: 200,
    annualFee: 0,
    apr: "30.74%",
    features: [
      "Low minimum deposit",
      "No annual fee",
      "Automatic credit line reviews",
    ],
    rating: 4.5,
  },
  {
    id: "3",
    name: "Chime Credit Builder",
    issuer: "Chime",
    minDeposit: 0,
    maxDeposit: 10000,
    annualFee: 0,
    apr: "0%",
    features: ["No credit check", "No minimum deposit", "No interest"],
    rating: 4.7,
  },
  {
    id: "4",
    name: "OpenSky® Secured Visa®",
    issuer: "OpenSky",
    minDeposit: 200,
    maxDeposit: 3000,
    annualFee: 35,
    apr: "22.64%",
    features: [
      "No credit check",
      "Reports to all 3 bureaus",
      "Choose your credit limit",
    ],
    rating: 4.2,
  },
];

export default function SecuredCardScreen() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

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
          <Text style={styles.title}>Secured Cards</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="shield-checkmark"
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.infoTitle}>Build Credit with Secured Cards</Text>
          <Text style={styles.infoText}>
            Secured cards require a refundable deposit that becomes your credit
            limit. Use responsibly to build credit history.
          </Text>
        </Card>

        {/* How It Works */}
        <Card style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Make a refundable security deposit
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Your deposit becomes your credit limit
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Use card and pay on time each month
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Build credit history reported to bureaus
            </Text>
          </View>
        </Card>

        {/* Card Recommendations */}
        <Text style={styles.sectionTitle}>Recommended Cards</Text>
        {SECURED_CARDS.map((card) => (
          <TouchableOpacity
            key={card.id}
            onPress={() =>
              setSelectedCard(selectedCard === card.id ? null : card.id)
            }
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.cardItem,
                selectedCard === card.id && styles.cardItemSelected,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardIssuer}>{card.issuer}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{card.rating}</Text>
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Deposit</Text>
                  <Text style={styles.detailValue}>
                    ${card.minDeposit}-${card.maxDeposit}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Annual Fee</Text>
                  <Text style={styles.detailValue}>${card.annualFee}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>APR</Text>
                  <Text style={styles.detailValue}>{card.apr}</Text>
                </View>
              </View>
              {selectedCard === card.id && (
                <View style={styles.featuresSection}>
                  <Text style={styles.featuresTitle}>Features</Text>
                  {card.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#22C55E"
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                    <Ionicons name="open-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Success</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Keep utilization below 30%</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Pay balance in full each month</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Set up autopay to never miss a payment
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              After 6-12 months, request upgrade to unsecured
            </Text>
          </View>
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
  infoCard: { alignItems: "center", marginBottom: theme.spacing.md },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  howItWorksCard: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  stepText: { fontSize: 14, color: theme.colors.text, flex: 1 },
  cardItem: { marginBottom: theme.spacing.sm },
  cardItemSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  cardIssuer: { fontSize: 13, color: theme.colors.textSecondary },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
    marginLeft: 4,
  },
  cardDetails: { flexDirection: "row", justifyContent: "space-between" },
  detailItem: { alignItems: "center" },
  detailLabel: { fontSize: 11, color: theme.colors.textSecondary },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  featuresSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  featureText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  tipsCard: { marginTop: theme.spacing.md },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
});
