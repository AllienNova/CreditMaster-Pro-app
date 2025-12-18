/**
 * CPFI Credit Education Marketplace Screen
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
}

const COURSES: Course[] = [
  { id: '1', title: 'Credit Basics 101', description: 'Learn the fundamentals of credit scores and reports', duration: '45 min', lessons: 8, level: 'Beginner', icon: 'school', progress: 75, free: true },
  { id: '2', title: 'Dispute Mastery', description: 'Master the art of disputing errors on your credit report', duration: '1.5 hrs', lessons: 12, level: 'Intermediate', icon: 'document-text', progress: 30, free: false },
  { id: '3', title: 'Building Credit Fast', description: 'Strategies to build credit quickly and effectively', duration: '1 hr', lessons: 10, level: 'Beginner', icon: 'trending-up', free: true },
  { id: '4', title: 'Advanced Credit Repair', description: 'Advanced techniques for credit repair professionals', duration: '3 hrs', lessons: 20, level: 'Advanced', icon: 'construct', free: false },
  { id: '5', title: 'Identity Protection', description: 'Protect yourself from identity theft and fraud', duration: '30 min', lessons: 6, level: 'Beginner', icon: 'shield-checkmark', free: true },
];

const getLevelColor = (level: Course['level']): string => {
  const colors = { Beginner: '#22C55E', Intermediate: '#F59E0B', Advanced: '#EF4444' };
  return colors[level];
};

export default function EducationScreen() {
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');

  const filteredCourses = COURSES.filter(course => {
    if (filter === 'free') return course.free;
    if (filter === 'premium') return !course.free;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Credit Education</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Ionicons name="ribbon" size={24} color={theme.colors.primary} />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Your Learning Progress</Text>
              <Text style={styles.progressSubtitle}>2 of 5 courses completed</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '40%' }]} />
          </View>
        </Card>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['all', 'free', 'premium'] as const).map((option) => (
            <TouchableOpacity key={option} style={[styles.filterTab, filter === option && styles.filterTabActive]} onPress={() => setFilter(option)}>
              <Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option === 'all' ? 'All Courses' : option === 'free' ? 'Free' : 'Premium'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Courses List */}
        {filteredCourses.map((course) => (
          <TouchableOpacity key={course.id} onPress={() => router.push('/help/guides')}>
            <Card style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseIcon}>
                  <Ionicons name={course.icon} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.courseInfo}>
                  <View style={styles.courseTitleRow}>
                    <Text style={styles.courseTitle}>{course.title}</Text>
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

              {course.progress !== undefined && (
                <View style={styles.courseProgress}>
                  <View style={styles.courseProgressBar}>
                    <View style={[styles.courseProgressFill, { width: `${course.progress}%` }]} />
                  </View>
                  <Text style={styles.courseProgressText}>{course.progress}%</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}

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
  progressCard: { marginBottom: theme.spacing.lg },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  progressInfo: { marginLeft: 12 },
  progressTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  progressSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  filterRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 4, borderRadius: 8 },
  filterTabActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  courseCard: { marginBottom: theme.spacing.sm },
  courseHeader: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  courseIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  courseInfo: { flex: 1 },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center' },
  courseTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1 },
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
});

