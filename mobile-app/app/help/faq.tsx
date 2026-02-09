/**
 * Fynvita FAQ Screen
 * Frequently asked questions with expandable answers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  { id: '1', category: 'Credit Score', question: 'How often is my credit score updated?', answer: 'Your credit score is updated daily. We pull fresh data from all three credit bureaus (Experian, Equifax, and TransUnion) to ensure you always have the most current information.' },
  { id: '2', category: 'Credit Score', question: 'Why did my credit score change?', answer: 'Credit scores can change for many reasons including new accounts, payment history updates, credit utilization changes, or new inquiries. Check your Credit Factors section for specific insights.' },
  { id: '3', category: 'Disputes', question: 'How long does a dispute take?', answer: 'Credit bureaus are required to investigate disputes within 30-45 days. Most disputes are resolved within 30 days. You can track your dispute status in real-time through our app.' },
  { id: '4', category: 'Disputes', question: 'What can I dispute on my credit report?', answer: 'You can dispute any inaccurate information including incorrect personal details, accounts that don\'t belong to you, incorrect payment history, duplicate accounts, and outdated negative items.' },
  { id: '5', category: 'Account', question: 'How do I cancel my subscription?', answer: 'You can cancel your subscription anytime from Settings > Billing & Subscription. Your access will continue until the end of your current billing period.' },
  { id: '6', category: 'Account', question: 'Is my data secure?', answer: 'Yes, we use bank-level 256-bit encryption to protect your data. We never sell your personal information and comply with all major data protection regulations.' },
  { id: '7', category: 'Features', question: 'What is the AI Dispute Assistant?', answer: 'Our AI Dispute Assistant uses advanced AI to analyze your credit report, identify disputable items, and generate professional dispute letters tailored to your specific situation.' },
  { id: '8', category: 'Features', question: 'How does credit monitoring work?', answer: 'We continuously monitor your credit reports for changes and alert you immediately when we detect new accounts, inquiries, or other significant changes to your credit profile.' },
];

const CATEGORIES = ['All', 'Credit Score', 'Disputes', 'Account', 'Features'];

export default function FAQScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = FAQ_ITEMS.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>FAQ</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search questions..." placeholderTextColor={theme.colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
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

        {/* FAQ Items */}
        {filteredFAQs.map((item) => (
          <Card key={item.id} style={styles.faqCard}>
            <TouchableOpacity style={styles.faqHeader} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {expandedId === item.id && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              </View>
            )}
          </Card>
        ))}

        {filteredFAQs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term or category</Text>
          </View>
        )}

        {/* Still need help */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpTitle}>Still need help?</Text>
          <Text style={styles.helpSubtitle}>Our support team is here for you</Text>
          <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/help/contact')}>
            <Ionicons name="chatbubbles" size={18} color="#fff" />
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </Card>

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
  faqCard: { marginBottom: theme.spacing.sm },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text, marginRight: 12 },
  faqAnswer: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  faqAnswerText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  helpCard: { marginTop: theme.spacing.lg, alignItems: 'center', paddingVertical: theme.spacing.lg },
  helpTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  helpSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  helpButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: theme.spacing.md },
  helpButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 8 },
});

