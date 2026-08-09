/**
 * Fynvita Guide Detail Screen
 * Display full guide content
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface GuideContent {
  id: string;
  title: string;
  category: string;
  readTime: string;
  author: string;
  updatedAt: string;
  sections: { title: string; content: string }[];
}

const GUIDE_CONTENT: Record<string, GuideContent> = {
  "1": {
    id: "1",
    title: "Understanding Your Credit Score",
    category: "Credit Basics",
    readTime: "5 min",
    author: "Fynvita Team",
    updatedAt: "Dec 1, 2024",
    sections: [
      {
        title: "What is a Credit Score?",
        content:
          "A credit score is a three-digit number that represents your creditworthiness. Lenders use this score to determine how likely you are to repay borrowed money. Scores typically range from 300 to 850, with higher scores indicating better credit.",
      },
      {
        title: "The Five Factors",
        content:
          "Your credit score is calculated based on five main factors:\n\n• Payment History (35%): Your track record of paying bills on time\n• Credit Utilization (30%): How much of your available credit you're using\n• Length of Credit History (15%): How long you've had credit accounts\n• Credit Mix (10%): The variety of credit types you have\n• New Credit (10%): Recent credit inquiries and new accounts",
      },
      {
        title: "Score Ranges",
        content:
          "Credit scores are typically categorized as:\n\n• Excellent: 800-850\n• Very Good: 740-799\n• Good: 670-739\n• Fair: 580-669\n• Poor: 300-579",
      },
      {
        title: "How to Improve",
        content:
          "To improve your credit score:\n\n1. Pay all bills on time\n2. Keep credit utilization below 30%\n3. Don't close old accounts\n4. Limit new credit applications\n5. Monitor your credit report for errors",
      },
    ],
  },
  "2": {
    id: "2",
    title: "How to Dispute Errors",
    category: "Disputes",
    readTime: "8 min",
    author: "Fynvita Team",
    updatedAt: "Nov 28, 2024",
    sections: [
      {
        title: "Why Dispute?",
        content:
          "Errors on your credit report can lower your score and affect your ability to get loans, credit cards, or even jobs. Common errors include incorrect personal information, accounts that don't belong to you, and inaccurate payment history.",
      },
      {
        title: "Step 1: Review Your Report",
        content:
          "Start by getting your credit reports from all three bureaus. Look for any information that seems incorrect, outdated, or unfamiliar. Make note of each item you want to dispute.",
      },
      {
        title: "Step 2: Gather Evidence",
        content:
          "Collect any documents that support your dispute, such as payment receipts, account statements, or identity documents. The more evidence you have, the stronger your case.",
      },
      {
        title: "Step 3: File Your Dispute",
        content:
          "You can file disputes online, by mail, or by phone. Our AI Dispute Assistant can help generate professional dispute letters tailored to your specific situation.",
      },
      {
        title: "Step 4: Follow Up",
        content:
          "Credit bureaus have 30-45 days to investigate. Track your dispute status and be prepared to provide additional information if requested.",
      },
    ],
  },
};

export default function GuideDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const guide = GUIDE_CONTENT[id || "1"] || GUIDE_CONTENT["1"];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this guide: ${guide.title}`,
        title: guide.title,
      });
    } catch (error) {
      if (__DEV__) console.error("Error sharing:", error);
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {guide.title}
          </Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons
              name="share-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Guide Header */}
        <View style={styles.guideHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{guide.category}</Text>
          </View>
          <Text style={styles.guideTitle}>{guide.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="time"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>{guide.readTime} read</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="person"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>{guide.author}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>{guide.updatedAt}</Text>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        {guide.sections.map((section, index) => (
          <Card key={index} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </Card>
        ))}

        {/* Related Actions */}
        <Text style={styles.relatedTitle}>Related Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(tabs)/disputes")}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>Start Dispute</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/credit")}
          >
            <Ionicons
              name="speedometer"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>View Score</Text>
          </TouchableOpacity>
        </View>

        {/* Helpful */}
        <Card style={styles.helpfulCard}>
          <Text style={styles.helpfulTitle}>Was this guide helpful?</Text>
          <View style={styles.helpfulButtons}>
            <TouchableOpacity style={styles.helpfulButton}>
              <Ionicons name="thumbs-up" size={20} color="#22C55E" />
              <Text style={styles.helpfulButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpfulButton}>
              <Ionicons name="thumbs-down" size={20} color="#EF4444" />
              <Text style={styles.helpfulButtonText}>No</Text>
            </TouchableOpacity>
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
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginHorizontal: 12,
    textAlign: "center",
  },
  guideHeader: { marginBottom: theme.spacing.lg },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  guideTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  sectionCard: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionsRow: { flexDirection: "row", marginBottom: theme.spacing.lg },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 8,
  },
  helpfulCard: { alignItems: "center", paddingVertical: theme.spacing.lg },
  helpfulTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  helpfulButtons: { flexDirection: "row" },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  helpfulButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginLeft: 6,
  },
});
