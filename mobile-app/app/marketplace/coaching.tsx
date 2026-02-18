/**
 * Fynvita Credit Coaching Marketplace Screen
 * 1-on-1 credit coaching services
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

interface Coach {
  id: string;
  name: string;
  title: string;
  specialty: string;
  rating: number;
  sessions: number;
  price: string;
  available: boolean;
}

interface Package {
  id: string;
  name: string;
  sessions: number;
  price: string;
  features: string[];
  popular: boolean;
}

const COACHES: Coach[] = [
  {
    id: "1",
    name: "David Miller",
    title: "Certified Credit Counselor",
    specialty: "Credit Repair",
    rating: 4.9,
    sessions: 450,
    price: "$75/hr",
    available: true,
  },
  {
    id: "2",
    name: "Lisa Johnson",
    title: "Financial Coach",
    specialty: "Debt Management",
    rating: 4.8,
    sessions: 320,
    price: "$65/hr",
    available: true,
  },
  {
    id: "3",
    name: "Robert Kim",
    title: "Credit Expert",
    specialty: "Score Optimization",
    rating: 4.9,
    sessions: 580,
    price: "$85/hr",
    available: false,
  },
];

const PACKAGES: Package[] = [
  {
    id: "1",
    name: "Starter",
    sessions: 1,
    price: "$75",
    features: ["1 coaching session", "Credit report review", "Action plan"],
    popular: false,
  },
  {
    id: "2",
    name: "Growth",
    sessions: 4,
    price: "$250",
    features: [
      "4 coaching sessions",
      "Weekly check-ins",
      "Dispute assistance",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "3",
    name: "Transformation",
    sessions: 8,
    price: "$450",
    features: [
      "8 coaching sessions",
      "Bi-weekly calls",
      "Full dispute management",
      "Score guarantee",
    ],
    popular: false,
  },
];

export default function CoachingScreen() {
  const handleBookCoach = (coach: Coach) => {
    router.push("/settings/billing");
  };

  const handleSelectPackage = (pkg: Package) => {
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
          <Text style={styles.title}>Credit Coaching</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <Ionicons name="people" size={32} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>Get Personalized Guidance</Text>
          <Text style={styles.heroText}>
            Work 1-on-1 with certified credit experts to achieve your financial
            goals faster.
          </Text>
        </Card>

        {/* Packages */}
        <Text style={styles.sectionTitle}>Coaching Packages</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.packagesScroll}
        >
          {PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.packageCard, pkg.popular && styles.popularPackage]}
              onPress={() => handleSelectPackage(pkg)}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              <Text style={styles.packageName}>{pkg.name}</Text>
              <Text style={styles.packagePrice}>{pkg.price}</Text>
              <Text style={styles.packageSessions}>
                {pkg.sessions} session{pkg.sessions > 1 ? "s" : ""}
              </Text>
              <View style={styles.packageFeatures}>
                {pkg.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color="#22C55E" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  pkg.popular && styles.selectButtonPrimary,
                ]}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    pkg.popular && styles.selectButtonTextPrimary,
                  ]}
                >
                  Select
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Coaches */}
        <Text style={styles.sectionTitle}>Our Coaches</Text>
        {COACHES.map((coach) => (
          <Card key={coach.id} style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {coach.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{coach.name}</Text>
                <Text style={styles.coachTitle}>{coach.title}</Text>
                <View style={styles.coachMeta}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.coachRating}>{coach.rating}</Text>
                  <Text style={styles.coachSessions}>
                    • {coach.sessions} sessions
                  </Text>
                </View>
              </View>
              <View>
                <Text style={styles.coachPrice}>{coach.price}</Text>
                <View
                  style={[
                    styles.availabilityBadge,
                    {
                      backgroundColor: coach.available
                        ? "#22C55E15"
                        : "#EF444415",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      { color: coach.available ? "#22C55E" : "#EF4444" },
                    ]}
                  >
                    {coach.available ? "Available" : "Booked"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.specialtyRow}>
              <Ionicons name="ribbon" size={14} color={theme.colors.primary} />
              <Text style={styles.specialtyText}>
                Specialty: {coach.specialty}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.bookButton,
                !coach.available && styles.bookButtonDisabled,
              ]}
              onPress={() => handleBookCoach(coach)}
              disabled={!coach.available}
            >
              <Text style={styles.bookButtonText}>
                {coach.available ? "Book Session" : "Join Waitlist"}
              </Text>
            </TouchableOpacity>
          </Card>
        ))}

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
  heroCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  heroText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  packagesScroll: { marginBottom: theme.spacing.lg },
  packageCard: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginRight: 12,
  },
  popularPackage: { borderWidth: 2, borderColor: theme.colors.primary },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  packageName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  packagePrice: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: 4,
  },
  packageSessions: { fontSize: 12, color: theme.colors.textSecondary },
  packageFeatures: { marginTop: theme.spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  featureText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  selectButton: {
    marginTop: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
  },
  selectButtonPrimary: { backgroundColor: theme.colors.primary },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  selectButtonTextPrimary: { color: "#fff" },
  coachCard: { marginBottom: theme.spacing.md },
  coachHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "600", color: "#fff" },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  coachTitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  coachMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  coachRating: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },
  coachSessions: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  coachPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    textAlign: "right",
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  availabilityText: { fontSize: 10, fontWeight: "600" },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  specialtyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  bookButtonDisabled: { backgroundColor: theme.colors.textSecondary },
  bookButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
