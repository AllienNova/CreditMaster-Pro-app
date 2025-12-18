/**
 * CPFI Community Marketplace Screen
 * Forums and discussions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

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
}

const CATEGORIES: ForumCategory[] = [
  { id: '1', name: 'Credit Score Help', description: 'Questions about improving your credit score', icon: 'speedometer', topics: 1234, posts: 5678 },
  { id: '2', name: 'Dispute Strategies', description: 'Share and learn dispute techniques', icon: 'document-text', topics: 890, posts: 3456 },
  { id: '3', name: 'Success Stories', description: 'Celebrate your credit wins', icon: 'trophy', topics: 456, posts: 1234 },
  { id: '4', name: 'General Discussion', description: 'Off-topic and general chat', icon: 'chatbubbles', topics: 2345, posts: 8901 },
];

const RECENT_POSTS: RecentPost[] = [
  { id: '1', title: 'Finally hit 750! Here\'s how I did it', author: 'CreditHero', category: 'Success Stories', replies: 45, views: 1234, timeAgo: '2h ago' },
  { id: '2', title: 'Best way to dispute late payments?', author: 'NewToCredit', category: 'Dispute Strategies', replies: 23, views: 567, timeAgo: '4h ago' },
  { id: '3', title: 'Secured card recommendations for rebuilding', author: 'StartingOver', category: 'Credit Score Help', replies: 18, views: 345, timeAgo: '6h ago' },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'categories' | 'recent'>('categories');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity><Ionicons name="create" size={24} color={theme.colors.primary} /></TouchableOpacity>
        </View>

        {/* Stats Banner */}
        <Card style={styles.statsBanner}>
          <View style={styles.statItem}><Text style={styles.statValue}>12.5K</Text><Text style={styles.statLabel}>Members</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>4.9K</Text><Text style={styles.statLabel}>Topics</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>19.3K</Text><Text style={styles.statLabel}>Posts</Text></View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'categories' && styles.tabActive]} onPress={() => setActiveTab('categories')}>
            <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'recent' && styles.tabActive]} onPress={() => setActiveTab('recent')}>
            <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Recent Posts</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'categories' ? (
          <>
            {CATEGORIES.map((category) => (
              <TouchableOpacity key={category.id}>
                <Card style={styles.categoryCard}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon} size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryStatText}>{category.topics} topics</Text>
                      <Text style={styles.categoryStatDot}>•</Text>
                      <Text style={styles.categoryStatText}>{category.posts} posts</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {RECENT_POSTS.map((post) => (
              <TouchableOpacity key={post.id}>
                <Card style={styles.postCard}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>by {post.author}</Text>
                    <Text style={styles.postCategory}>in {post.category}</Text>
                  </View>
                  <View style={styles.postStats}>
                    <View style={styles.postStatItem}>
                      <Ionicons name="chatbubble" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.postStatText}>{post.replies}</Text>
                    </View>
                    <View style={styles.postStatItem}>
                      <Ionicons name="eye" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.postStatText}>{post.views}</Text>
                    </View>
                    <Text style={styles.postTime}>{post.timeAgo}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* New Post Button */}
        <TouchableOpacity style={styles.newPostButton}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newPostText}>Start a Discussion</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statsBanner: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: theme.spacing.lg, marginBottom: theme.spacing.lg },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  tabsRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  categoryCard: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  categoryDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  categoryStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  categoryStatText: { fontSize: 11, color: theme.colors.textSecondary },
  categoryStatDot: { marginHorizontal: 6, color: theme.colors.textSecondary },
  postCard: { marginBottom: theme.spacing.sm },
  postTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  postMeta: { flexDirection: 'row', marginBottom: 8 },
  postAuthor: { fontSize: 12, color: theme.colors.textSecondary },
  postCategory: { fontSize: 12, color: theme.colors.primary, marginLeft: 8 },
  postStats: { flexDirection: 'row', alignItems: 'center' },
  postStatItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  postStatText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  postTime: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 'auto' },
  newPostButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, marginTop: theme.spacing.md },
  newPostText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },
});

