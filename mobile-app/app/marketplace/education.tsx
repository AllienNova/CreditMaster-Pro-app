/**
 * Fynvita Credit Education Marketplace Screen
 * Courses and educational resources
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: keyof typeof Ionicons.glyphMap;
  progress?: number;
  free: boolean;
  category: string;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
}

const COURSES: Course[] = [
  { id: '1', title: 'Credit Score Fundamentals', description: 'Learn how credit scores work and what factors affect them', duration: '2h 30m', lessons: 12, level: 'Beginner', icon: 'speedometer', progress: 75, free: true, category: 'Basics' },
  { id: '2', title: 'Dispute Letter Mastery', description: 'Write effective dispute letters that get results', duration: '3h 15m', lessons: 18, level: 'Intermediate', icon: 'document-text', progress: 30, free: false, category: 'Disputes' },
  { id: '3', title: 'Advanced Credit Strategies', description: 'Expert techniques for rapid credit improvement', duration: '4h', lessons: 24, level: 'Advanced', icon: 'rocket', progress: 0, free: false, category: 'Advanced' },
  { id: '4', title: 'Debt Management 101', description: 'Strategies for paying off debt efficiently', duration: '2h', lessons: 10, level: 'Beginner', icon: 'cash', progress: 100, free: true, category: 'Debt' },
  { id: '5', title: 'Identity Theft Protection', description: 'Protect yourself from fraud and identity theft', duration: '1h 45m', lessons: 8, level: 'Beginner', icon: 'shield-checkmark', progress: 50, free: true, category: 'Security' },
  { id: '6', title: 'Building Credit Fast', description: 'Proven strategies to build credit quickly', duration: '1h 30m', lessons: 9, level: 'Beginner', icon: 'trending-up', free: true, category: 'Basics' },
];

const ARTICLES: Article[] = [
  { id: '1', title: 'Understanding Your Credit Report', excerpt: 'A comprehensive guide to reading and interpreting your credit report from all three bureaus...', category: 'Basics', readTime: '8 min', date: '2024-01-15' },
  { id: '2', title: '5 Myths About Credit Scores', excerpt: 'Common misconceptions that could be hurting your credit and what you should do instead...', category: 'Tips', readTime: '5 min', date: '2024-01-12' },
  { id: '3', title: 'How to Negotiate with Creditors', excerpt: 'Effective strategies for settling debts and removing negative items from your report...', category: 'Advanced', readTime: '12 min', date: '2024-01-10' },
  { id: '4', title: 'FCRA Rights You Need to Know', excerpt: 'Your legal rights under the Fair Credit Reporting Act and how to use them...', category: 'Legal', readTime: '10 min', date: '2024-01-08' },
  { id: '5', title: 'Secured vs Unsecured Credit Cards', excerpt: 'Which type of credit card is right for your credit building journey...', category: 'Products', readTime: '6 min', date: '2024-01-05' },
];

const getLevelColor = (level: Course['level']): string => {
  const colors = { Beginner: '#22C55E', Intermediate: '#F59E0B', Advanced: '#EF4444' };
  return colors[level];
};

export default function EducationScreen() {
  const [activeTab, setActiveTab] = useState<'courses' | 'articles'>('courses');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(COURSES.map(c => c.category)))];

  const filteredCourses = categoryFilter === 'all'
    ? COURSES
    : COURSES.filter(c => c.category === categoryFilter);

  const completedCourses = COURSES.filter(c => c.progress === 100).length;
  const inProgressCourses = COURSES.filter(c => c.progress && c.progress > 0 && c.progress < 100).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Education Library</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIconContainer}>
              <Ionicons name="ribbon" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Your Learning Progress</Text>
              <Text style={styles.progressSubtitle}>
                {completedCourses} completed • {inProgressCourses} in progress
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completedCourses / COURSES.length) * 100}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStatItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.progressStatText}>{completedCourses} Completed</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Ionicons name="play-circle" size={16} color="#F59E0B" />
              <Text style={styles.progressStatText}>{inProgressCourses} In Progress</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.progressStatText}>{COURSES.length - completedCourses - inProgressCourses} Not Started</Text>
            </View>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'courses' && styles.tabActive]}
            onPress={() => setActiveTab('courses')}
          >
            <Ionicons name="school" size={16} color={activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'articles' && styles.tabActive]}
            onPress={() => setActiveTab('articles')}
          >
            <Ionicons name="newspaper" size={16} color={activeTab === 'articles' ? theme.colors.primary : theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>Articles</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'courses' ? (
          <>
            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, categoryFilter === cat && styles.categoryChipActive]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[styles.categoryChipText, categoryFilter === cat && styles.categoryChipTextActive]}>
                    {cat === 'all' ? 'All Courses' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Courses List */}
            {filteredCourses.map((course) => (
              <TouchableOpacity key={course.id} onPress={() => router.push('/help/guides')}>
                <Card style={styles.courseCard}>
                  <View style={styles.courseHeader}>
                    <View style={[styles.courseIcon, course.progress === 100 && styles.courseIconCompleted]}>
                      <Ionicons
                        name={course.progress === 100 ? 'checkmark' : course.icon}
                        size={24}
                        color={course.progress === 100 ? '#22C55E' : theme.colors.primary}
                      />
                    </View>
                    <View style={styles.courseInfo}>
                      <View style={styles.courseTitleRow}>
                        <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                        {!course.free && <View style={styles.premiumBadge}><Text style={styles.premiumText}>Premium</Text></View>}
                      </View>
                      <Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text>
                    </View>
                  </View>

                  <View style={styles.courseMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.metaText}>{course.duration}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="book" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.metaText}>{course.lessons} lessons</Text>
                    </View>
                    <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(course.level)}15` }]}>
                      <Text style={[styles.levelText, { color: getLevelColor(course.level) }]}>{course.level}</Text>
                    </View>
                  </View>

                  {course.progress !== undefined && course.progress > 0 && (
                    <View style={styles.courseProgress}>
                      <View style={styles.courseProgressBar}>
                        <View
                          style={[
                            styles.courseProgressFill,
                            { width: `${course.progress}%`, backgroundColor: course.progress === 100 ? '#22C55E' : theme.colors.primary }
                          ]}
                        />
                      </View>
                      <Text style={[styles.courseProgressText, course.progress === 100 && { color: '#22C55E' }]}>
                        {course.progress === 100 ? 'Completed' : `${course.progress}%`}
                      </Text>
                    </View>
                  )}

                  {/* Action Button */}
                  <TouchableOpacity style={[styles.courseButton, course.progress === 100 && styles.courseButtonReview]}>
                    <Text style={[styles.courseButtonText, course.progress === 100 && styles.courseButtonTextReview]}>
                      {course.progress === 0 || course.progress === undefined ? 'Start Course' : course.progress === 100 ? 'Review' : 'Continue'}
                    </Text>
                  </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Articles List */}
            {ARTICLES.map((article) => (
              <TouchableOpacity key={article.id}>
                <Card style={styles.articleCard}>
                  <View style={styles.articleHeader}>
                    <View style={styles.articleCategoryBadge}>
                      <Text style={styles.articleCategoryText}>{article.category}</Text>
                    </View>
                    <Text style={styles.articleDate}>{article.date}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleExcerpt} numberOfLines={2}>{article.excerpt}</Text>
                  <View style={styles.articleFooter}>
                    <View style={styles.readTimeRow}>
                      <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.readTimeText}>{article.readTime} read</Text>
                    </View>
                    <TouchableOpacity style={styles.readButton}>
                      <Text style={styles.readButtonText}>Read Article</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

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

  // Progress Card
  progressCard: { marginBottom: theme.spacing.lg },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  progressIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  progressInfo: { marginLeft: 12, flex: 1 },
  progressTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  progressSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: theme.spacing.sm },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStatItem: { flexDirection: 'row', alignItems: 'center' },
  progressStatText: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },

  // Tabs
  tabsRow: { flexDirection: 'row', marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },

  // Category Filter
  categoryScroll: { marginBottom: theme.spacing.md },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  categoryChipTextActive: { color: '#fff' },

  // Course Card
  courseCard: { marginBottom: theme.spacing.md },
  courseHeader: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  courseIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  courseIconCompleted: { backgroundColor: '#D1FAE5' },
  courseInfo: { flex: 1 },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center' },
  courseTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  premiumBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  premiumText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  courseDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 16 },
  courseMeta: { flexDirection: 'row', alignItems: 'center', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 'auto' },
  levelText: { fontSize: 11, fontWeight: '500' },
  courseProgress: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
  courseProgressBar: { flex: 1, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginRight: 8 },
  courseProgressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  courseProgressText: { fontSize: 11, fontWeight: '500', color: theme.colors.primary },
  courseButton: { marginTop: theme.spacing.sm, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 8, alignItems: 'center' },
  courseButtonReview: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary },
  courseButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  courseButtonTextReview: { color: theme.colors.primary },

  // Article Card
  articleCard: { marginBottom: theme.spacing.md },
  articleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  articleCategoryBadge: { backgroundColor: `${theme.colors.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  articleCategoryText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  articleDate: { fontSize: 11, color: theme.colors.textSecondary },
  articleTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  articleExcerpt: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.sm },
  articleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  readTimeRow: { flexDirection: 'row', alignItems: 'center' },
  readTimeText: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  readButton: { flexDirection: 'row', alignItems: 'center' },
  readButtonText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary, marginRight: 4 },

  // Legacy filter styles (keeping for reference)
  filterRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 4, borderRadius: 8 },
  filterTabActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
});

