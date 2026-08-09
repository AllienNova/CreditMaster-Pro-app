/**
 * Fynvita Community Marketplace Screen
 * Coming Soon - Forums and discussions with waitlist email capture
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

export default function CommunityScreen() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoinWaitlist = () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setJoined(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Community</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Coming Soon Hero */}
          <Card style={styles.heroCard}>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
            <Ionicons name="people" size={56} color={theme.colors.primary} />
            <Text style={styles.heroTitle}>Fynvita Community</Text>
            <Text style={styles.heroSubtitle}>
              Connect with thousands of members on their credit journey. Share strategies,
              celebrate wins, and learn from experts.
            </Text>
          </Card>

          {/* Planned Features */}
          <Text style={styles.sectionTitle}>What to Expect</Text>
          <View style={styles.featuresGrid}>
            {[
              {
                icon: "chatbubbles",
                title: "Discussion Forums",
                desc: "Get answers to your credit questions from the community",
              },
              {
                icon: "trophy",
                title: "Success Stories",
                desc: "Share your credit improvement journey and inspire others",
              },
              {
                icon: "school",
                title: "Expert Q&A",
                desc: "Regular sessions with credit professionals and attorneys",
              },
              {
                icon: "shield-checkmark",
                title: "Verified Advice",
                desc: "Community-reviewed tips and strategies that actually work",
              },
            ].map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>

          {/* Waitlist */}
          <Card style={styles.waitlistCard}>
            {joined ? (
              <View style={styles.joinedContent}>
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                <Text style={styles.joinedTitle}>You're on the list!</Text>
                <Text style={styles.joinedSubtitle}>
                  We'll notify you at {email} when the community launches.
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="mail" size={32} color={theme.colors.primary} />
                <Text style={styles.waitlistTitle}>Join the Waitlist</Text>
                <Text style={styles.waitlistSubtitle}>
                  Be the first to know when the community launches.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={handleJoinWaitlist}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Card>

          {/* Stats Preview */}
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2.1K+</Text>
                <Text style={styles.statLabel}>Waitlisted</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Q2 2026</Text>
                <Text style={styles.statLabel}>Launch</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Free</Text>
                <Text style={styles.statLabel}>For All Tiers</Text>
              </View>
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  heroCard: { alignItems: "center", paddingVertical: theme.spacing.xl, marginBottom: theme.spacing.lg },
  comingSoonBadge: {
    backgroundColor: "#F59E0B", paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: theme.spacing.lg,
  },
  comingSoonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  heroTitle: { fontSize: 22, fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing.md },
  heroSubtitle: {
    fontSize: 14, color: theme.colors.textSecondary, textAlign: "center",
    marginTop: 8, lineHeight: 20, paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text, marginBottom: theme.spacing.sm },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: theme.spacing.lg },
  featureItem: {
    width: "48%", backgroundColor: theme.colors.surface, borderRadius: 12,
    padding: theme.spacing.md, margin: "1%",
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`, justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  featureTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  featureDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  waitlistCard: { alignItems: "center", paddingVertical: theme.spacing.xl, marginBottom: theme.spacing.md },
  waitlistTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing.md },
  waitlistSubtitle: {
    fontSize: 13, color: theme.colors.textSecondary, textAlign: "center",
    marginTop: 4, marginBottom: theme.spacing.lg,
  },
  inputRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  emailInput: {
    flex: 1, fontSize: 15, color: theme.colors.text,
    backgroundColor: theme.colors.background, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, marginRight: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  joinButton: {
    backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8,
  },
  joinButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  joinedContent: { alignItems: "center" },
  joinedTitle: { fontSize: 18, fontWeight: "700", color: "#22C55E", marginTop: theme.spacing.md },
  joinedSubtitle: {
    fontSize: 13, color: theme.colors.textSecondary, textAlign: "center",
    marginTop: 4, paddingHorizontal: theme.spacing.md,
  },
  statsCard: {},
  statsRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: theme.spacing.md },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
});
