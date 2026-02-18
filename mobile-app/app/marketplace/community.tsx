/**
 * Fynvita Community Marketplace Screen
 * Forums and discussions
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  topics: number;
  posts: number;
}

interface RecentPost {
  id: string;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  timeAgo: string;
  pinned?: boolean;
}

interface SuccessStory {
  id: string;
  author: string;
  scoreBefore: number;
  scoreAfter: number;
  timeframe: string;
  summary: string;
  likes: number;
}

const CATEGORIES: ForumCategory[] = [
  {
    id: "1",
    name: "Credit Score Help",
    description: "Questions about improving your credit score",
    icon: "speedometer",
    topics: 1234,
    posts: 5678,
  },
  {
    id: "2",
    name: "Dispute Strategies",
    description: "Share and learn dispute techniques",
    icon: "document-text",
    topics: 890,
    posts: 3456,
  },
  {
    id: "3",
    name: "Success Stories",
    description: "Celebrate your credit wins",
    icon: "trophy",
    topics: 456,
    posts: 1234,
  },
  {
    id: "4",
    name: "General Discussion",
    description: "Off-topic and general chat",
    icon: "chatbubbles",
    topics: 2345,
    posts: 8901,
  },
];

const RECENT_POSTS: RecentPost[] = [
  {
    id: "0",
    title: "Welcome! Read the community guidelines",
    author: "Admin",
    category: "Announcements",
    replies: 12,
    views: 2450,
    timeAgo: "Pinned",
    pinned: true,
  },
  {
    id: "1",
    title: "Finally hit 750! Here's how I did it",
    author: "CreditHero",
    category: "Success Stories",
    replies: 45,
    views: 1234,
    timeAgo: "2h ago",
  },
  {
    id: "2",
    title: "Best way to dispute late payments?",
    author: "NewToCredit",
    category: "Dispute Strategies",
    replies: 23,
    views: 567,
    timeAgo: "4h ago",
  },
  {
    id: "3",
    title: "Secured card recommendations for rebuilding",
    author: "StartingOver",
    category: "Credit Score Help",
    replies: 18,
    views: 345,
    timeAgo: "6h ago",
  },
  {
    id: "4",
    title: "Goodwill letter success with Chase!",
    author: "DebtFreeJourney",
    category: "Success Stories",
    replies: 38,
    views: 890,
    timeAgo: "8h ago",
  },
  {
    id: "5",
    title: "Understanding FCRA timelines",
    author: "CreditExpert",
    category: "Education",
    replies: 15,
    views: 456,
    timeAgo: "12h ago",
  },
];

const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: "1",
    author: "CreditWarrior",
    scoreBefore: 520,
    scoreAfter: 720,
    timeframe: "8 months",
    summary: "Removed 5 collections, 2 charge-offs, and paid down utilization",
    likes: 234,
  },
  {
    id: "2",
    author: "DebtFreeJourney",
    scoreBefore: 580,
    scoreAfter: 750,
    timeframe: "12 months",
    summary: "Paid off $15k debt and disputed inaccurate late payments",
    likes: 189,
  },
  {
    id: "3",
    author: "NewBeginnings",
    scoreBefore: 490,
    scoreAfter: 680,
    timeframe: "6 months",
    summary: "Focused on secured cards and authorized user accounts",
    likes: 156,
  },
  {
    id: "4",
    author: "CreditRebuild",
    scoreBefore: 540,
    scoreAfter: 710,
    timeframe: "10 months",
    summary: "Settled collections and built positive payment history",
    likes: 142,
  },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<"discussions" | "stories">(
    "discussions",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = [
    "all",
    "Announcements",
    "Success Stories",
    "Dispute Strategies",
    "Credit Score Help",
    "Education",
  ];
  const filteredPosts =
    categoryFilter === "all"
      ? RECENT_POSTS
      : RECENT_POSTS.filter((p) => p.category === categoryFilter);

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
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity>
            <Ionicons name="create" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Banner */}
        <Card style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12.5K</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9K</Text>
            <Text style={styles.statLabel}>Topics</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>19.3K</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "discussions" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("discussions")}
          >
            <Ionicons
              name="chatbubbles"
              size={16}
              color={
                activeTab === "discussions"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "discussions" && styles.tabTextActive,
              ]}
            >
              Discussions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "stories" && styles.tabActive]}
            onPress={() => setActiveTab("stories")}
          >
            <Ionicons
              name="trophy"
              size={16}
              color={
                activeTab === "stories"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "stories" && styles.tabTextActive,
              ]}
            >
              Success Stories
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "discussions" ? (
          <>
            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    categoryFilter === cat && styles.filterChipActive,
                  ]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      categoryFilter === cat && styles.filterTextActive,
                    ]}
                  >
                    {cat === "all" ? "All Topics" : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Posts List */}
            {filteredPosts.map((post) => (
              <TouchableOpacity key={post.id}>
                <Card
                  style={[styles.postCard, post.pinned && styles.pinnedCard]}
                >
                  <View style={styles.postHeader}>
                    <View
                      style={[
                        styles.categoryBadge,
                        getCategoryBadgeStyle(post.category),
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          getCategoryTextStyle(post.category),
                        ]}
                      >
                        {post.category}
                      </Text>
                    </View>
                    {post.pinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons
                          name="pin"
                          size={12}
                          color={theme.colors.primary}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>by {post.author}</Text>
                    <Text style={styles.postTime}>• {post.timeAgo}</Text>
                  </View>
                  <View style={styles.postStats}>
                    <View style={styles.postStatItem}>
                      <Ionicons
                        name="heart"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.postStatText}>{post.replies}</Text>
                    </View>
                    <View style={styles.postStatItem}>
                      <Ionicons
                        name="chatbubble"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.postStatText}>{post.views}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Success Stories Grid */}
            {SUCCESS_STORIES.map((story) => {
              const improvement = story.scoreAfter - story.scoreBefore;
              return (
                <TouchableOpacity key={story.id}>
                  <Card style={styles.storyCard}>
                    <View style={styles.storyHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {story.author.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.storyAuthorInfo}>
                        <Text style={styles.storyAuthor}>{story.author}</Text>
                        <Text style={styles.storyTimeframe}>
                          {story.timeframe} journey
                        </Text>
                      </View>
                      <View style={styles.improvementBadge}>
                        <Ionicons name="arrow-up" size={14} color="#22C55E" />
                        <Text style={styles.improvementText}>
                          +{improvement} pts
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scoreComparison}>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>Before</Text>
                        <Text style={[styles.scoreValue, { color: "#EF4444" }]}>
                          {story.scoreBefore}
                        </Text>
                      </View>
                      <View style={styles.scoreArrow}>
                        <Ionicons
                          name="arrow-forward"
                          size={24}
                          color={theme.colors.textSecondary}
                        />
                      </View>
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreLabel}>After</Text>
                        <Text style={[styles.scoreValue, { color: "#22C55E" }]}>
                          {story.scoreAfter}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.storySummary}>{story.summary}</Text>

                    <View style={styles.storyFooter}>
                      <View style={styles.likesRow}>
                        <Ionicons name="heart" size={16} color="#EF4444" />
                        <Text style={styles.likesText}>
                          {story.likes} found this inspiring
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.readMoreButton}>
                        <Text style={styles.readMoreText}>Read Story</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* New Post Button */}
        <TouchableOpacity style={styles.newPostButton}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newPostText}>
            {activeTab === "discussions"
              ? "Start a Discussion"
              : "Share Your Story"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions for category badge styling
const getCategoryBadgeStyle = (category: string) => {
  const styles: Record<string, object> = {
    Announcements: { backgroundColor: "#FEE2E2" },
    "Success Stories": { backgroundColor: "#D1FAE5" },
    "Dispute Strategies": { backgroundColor: "#DBEAFE" },
    "Credit Score Help": { backgroundColor: "#E9D5FF" },
    Education: { backgroundColor: "#FEF3C7" },
  };
  return styles[category] || { backgroundColor: "#F3F4F6" };
};

const getCategoryTextStyle = (category: string) => {
  const styles: Record<string, object> = {
    Announcements: { color: "#DC2626" },
    "Success Stories": { color: "#059669" },
    "Dispute Strategies": { color: "#2563EB" },
    "Credit Score Help": { color: "#7C3AED" },
    Education: { color: "#D97706" },
  };
  return styles[category] || { color: "#6B7280" };
};

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
  statsBanner: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  tabsRow: { flexDirection: "row", marginBottom: theme.spacing.md },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: theme.colors.primary },

  // Filter chips
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  filterTextActive: { color: "#fff" },

  // Post cards
  postCard: { marginBottom: theme.spacing.sm },
  pinnedCard: { borderWidth: 1, borderColor: `${theme.colors.primary}40` },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  categoryBadgeText: { fontSize: 10, fontWeight: "600" },
  pinnedBadge: { marginLeft: "auto" },
  postTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  postMeta: { flexDirection: "row", marginBottom: 8 },
  postAuthor: { fontSize: 12, color: theme.colors.textSecondary },
  postTime: { fontSize: 12, color: theme.colors.textSecondary },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  postStatItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  postStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },

  // Success story cards
  storyCard: { marginBottom: theme.spacing.md, backgroundColor: "#F0FDF4" },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "600", color: "#fff" },
  storyAuthorInfo: { flex: 1, marginLeft: 12 },
  storyAuthor: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  storyTimeframe: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  improvementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  improvementText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22C55E",
    marginLeft: 4,
  },

  scoreComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  scoreValue: { fontSize: 28, fontWeight: "700" },
  scoreArrow: { paddingHorizontal: theme.spacing.md },

  storySummary: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  storyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#BBF7D0",
  },
  likesRow: { flexDirection: "row", alignItems: "center" },
  likesText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 6 },
  readMoreButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#22C55E",
    borderRadius: 16,
  },
  readMoreText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  // Legacy styles for category view (keeping for reference)
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  categoryDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  categoryStats: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  categoryStatText: { fontSize: 11, color: theme.colors.textSecondary },
  categoryStatDot: { marginHorizontal: 6, color: theme.colors.textSecondary },
  postCategory: { fontSize: 12, color: theme.colors.primary, marginLeft: 8 },

  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  newPostText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
