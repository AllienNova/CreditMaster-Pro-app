import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';

const FAQ_ITEMS = [
  { id: '1', question: 'How do I dispute an item on my credit report?', answer: 'Navigate to the Disputes tab, tap "New Dispute", select the item type and bureau, then follow the guided wizard to generate and submit your dispute letter.' },
  { id: '2', question: 'How long does a dispute take?', answer: 'Credit bureaus have 30-45 days to investigate and respond to disputes. You can track the status in real-time through the app.' },
  { id: '3', question: 'What is a credit score?', answer: 'A credit score is a 3-digit number (300-850) that represents your creditworthiness. Higher scores indicate lower risk to lenders.' },
  { id: '4', question: 'How often is my credit score updated?', answer: 'We check for updates daily. Most creditors report to bureaus monthly, so you may see changes every 30-45 days.' },
  { id: '5', question: 'Can I cancel my subscription?', answer: 'Yes, you can cancel anytime from Profile > Subscription. You will retain access until the end of your billing period.' },
  { id: '6', question: 'Is my data secure?', answer: 'Yes, we use bank-level 256-bit encryption and never store your credit bureau login credentials. All data is encrypted at rest and in transit.' },
];

const CONTACT_OPTIONS = [
  { id: 'chat', label: 'Live Chat', description: 'Chat with our support team', icon: 'chatbubbles-outline', available: true },
  { id: 'email', label: 'Email Support', description: 'support@creditmaster.pro', icon: 'mail-outline', available: true },
  { id: 'phone', label: 'Phone Support', description: 'Premium members only', icon: 'call-outline', available: false },
];

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredFaqs = FAQ_ITEMS.filter(
    faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContact = (optionId: string) => {
    if (optionId === 'email') {
      Linking.openURL('mailto:support@creditmaster.pro');
    } else if (optionId === 'chat') {
      // Open chat widget
      console.log('Open chat');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={lightTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={lightTheme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help articles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={lightTheme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={lightTheme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactGrid}>
          {CONTACT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.contactCard, !option.available && styles.contactCardDisabled]}
              onPress={() => option.available && handleContact(option.id)}
              disabled={!option.available}
            >
              <View style={[styles.contactIcon, !option.available && styles.contactIconDisabled]}>
                <Ionicons name={option.icon as any} size={28} color={option.available ? lightTheme.colors.primary : lightTheme.colors.textSecondary} />
              </View>
              <Text style={[styles.contactLabel, !option.available && styles.contactLabelDisabled]}>{option.label}</Text>
              <Text style={styles.contactDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {filteredFaqs.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
          </View>
        ) : (
          filteredFaqs.map(faq => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={lightTheme.colors.textSecondary}
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL('https://creditmaster.pro/guides')}>
            <Ionicons name="book-outline" size={24} color={lightTheme.colors.primary} />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceLabel}>Credit Guides</Text>
              <Text style={styles.resourceDescription}>Learn about credit repair</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={lightTheme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL('https://creditmaster.pro/blog')}>
            <Ionicons name="newspaper-outline" size={24} color={lightTheme.colors.primary} />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceLabel}>Blog</Text>
              <Text style={styles.resourceDescription}>Tips and industry news</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={lightTheme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceItem} onPress={() => Linking.openURL('https://www.youtube.com/@creditmaster')}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceLabel}>Video Tutorials</Text>
              <Text style={styles.resourceDescription}>Step-by-step walkthroughs</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={lightTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: lightTheme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '600', color: lightTheme.colors.text },
  content: { flex: 1, padding: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: lightTheme.colors.surface, borderRadius: 12, paddingHorizontal: 12, marginBottom: 24 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: lightTheme.colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: lightTheme.colors.text, marginBottom: 12 },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  contactCard: { flex: 1, minWidth: '45%', backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
  contactCardDisabled: { opacity: 0.6 },
  contactIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: lightTheme.colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contactIconDisabled: { backgroundColor: lightTheme.colors.border },
  contactLabel: { fontSize: 16, fontWeight: '600', color: lightTheme.colors.text },
  contactLabelDisabled: { color: lightTheme.colors.textSecondary },
  contactDescription: { fontSize: 12, color: lightTheme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  faqItem: { backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, fontSize: 16, fontWeight: '500', color: lightTheme.colors.text, marginRight: 8 },
  faqAnswer: { fontSize: 14, color: lightTheme.colors.textSecondary, marginTop: 12, lineHeight: 22 },
  noResults: { padding: 24, alignItems: 'center' },
  noResultsText: { fontSize: 14, color: lightTheme.colors.textSecondary },
  resourcesSection: { marginTop: 24, marginBottom: 32 },
  resourceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: lightTheme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 },
  resourceInfo: { flex: 1, marginLeft: 12 },
  resourceLabel: { fontSize: 16, fontWeight: '500', color: lightTheme.colors.text },
  resourceDescription: { fontSize: 12, color: lightTheme.colors.textSecondary, marginTop: 2 },
});

