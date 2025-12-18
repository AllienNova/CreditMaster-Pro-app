/**
 * CPFI Guides Screen
 * How-to guides and tutorials
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GUIDES: Guide[] = [
  { id: '1', title: 'Understanding Your Credit Score', description: 'Learn what factors affect your credit score and how to improve it', category: 'Credit Basics', readTime: '5 min', icon: 'speedometer' },
  { id: '2', title: 'How to Dispute Errors', description: 'Step-by-step guide to disputing inaccurate items on your credit report', category: 'Disputes', readTime: '8 min', icon: 'document-text' },
  { id: '3', title: 'Building Credit from Scratch', description: 'Strategies for establishing credit when you have no credit history', category: 'Credit Building', readTime: '6 min', icon: 'trending-up' },
  { id: '4', title: 'Lowering Credit Utilization', description: 'Tips to reduce your credit utilization ratio and boost your score', category: 'Credit Building', readTime: '4 min', icon: 'pie-chart' },
  { id: '5', title: 'Protecting Your Identity', description: 'Best practices for keeping your personal information safe', category: 'Security', readTime: '7 min', icon: 'shield-checkmark' },
  { id: '6', title: 'Reading Your Credit Report', description: 'How to understand and interpret your credit report', category: 'Credit Basics', readTime: '10 min', icon: 'reader' },
  { id: '7', title: 'Dealing with Collections', description: 'Options for handling collection accounts on your credit report', category: 'Disputes', readTime: '6 min', icon: 'alert-circle' },
  { id: '8', title: 'Credit Card Best Practices', description: 'How to use credit cards responsibly to build credit', category: 'Credit Building', readTime: '5 min', icon: 'card' },
];

const CATEGORIES = ['All', 'Credit Basics', 'Credit Building', 'Disputes', 'Security'];

export default function GuidesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredGuides = GUIDES.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) || guide.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleGuidePress = (guide: Guide) => {
    router.push({ pathname: '/help/guide-detail', params: { id: guide.id, title: guide.title } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Guides</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search guides..." placeholderTextColor={theme.colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Guide */}
        {selectedCategory === 'All' && searchQuery === '' && (
          <TouchableOpacity onPress={() => handleGuidePress(GUIDES[0])}>
            <Card style={styles.featuredCard}>
              <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>Featured</Text></View>
              <View style={styles.featuredIcon}>
                <Ionicons name="speedometer" size={32} color={theme.colors.primary} />
              </View>
              <Text style={styles.featuredTitle}>{GUIDES[0].title}</Text>
              <Text style={styles.featuredDescription}>{GUIDES[0].description}</Text>
              <View style={styles.featuredMeta}>
                <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.featuredTime}>{GUIDES[0].readTime} read</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Guides List */}
        <Text style={styles.sectionTitle}>{selectedCategory === 'All' ? 'All Guides' : selectedCategory}</Text>
        {filteredGuides.map((guide) => (
          <TouchableOpacity key={guide.id} onPress={() => handleGuidePress(guide)}>
            <Card style={styles.guideCard}>
              <View style={styles.guideRow}>
                <View style={styles.guideIcon}>
                  <Ionicons name={guide.icon} size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.guideInfo}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideDescription} numberOfLines={1}>{guide.description}</Text>
                  <View style={styles.guideMeta}>
                    <Text style={styles.guideCategory}>{guide.category}</Text>
                    <Text style={styles.guideTime}>• {guide.readTime}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {filteredGuides.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No guides found</Text>
            <Text style={styles.emptySubtitle}>Try a different search or category</Text>
          </View>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: theme.spacing.md },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, marginLeft: 8 },
  categoriesScroll: { marginBottom: theme.spacing.md },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  categoryTextActive: { color: '#fff' },
  featuredCard: { marginBottom: theme.spacing.lg, alignItems: 'center', paddingVertical: theme.spacing.xl },
  featuredBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  featuredBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  featuredIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  featuredDescription: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: theme.spacing.lg },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md },
  featuredTime: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  guideCard: { marginBottom: theme.spacing.sm },
  guideRow: { flexDirection: 'row', alignItems: 'center' },
  guideIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  guideInfo: { flex: 1 },
  guideTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  guideDescription: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  guideMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  guideCategory: { fontSize: 11, color: theme.colors.primary, fontWeight: '500' },
  guideTime: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
});

