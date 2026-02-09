import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { withOpacity } from '../../src/constants/theme';

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
  { id: 'email', label: 'Email Support', description: 'support@Fynvita.pro', icon: 'mail-outline', available: true },
  { id: 'phone', label: 'Phone Support', description: 'Premium members only', icon: 'call-outline', available: false },
];

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const filteredFaqs = FAQ_ITEMS.filter(
    faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContact = (optionId: string) => {
    if (optionId === 'email') {
      Linking.openURL('mailto:support@Fynvita.pro');
    } else if (optionId === 'chat') {
      // Open live chat support via web interface
      Linking.openURL('https://fynvita.pro/support/chat');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, marginBottom: 24 }}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, padding: 12, fontSize: 16, color: colors.text }}
            placeholder="Search help articles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Contact Us</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {CONTACT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                { flex: 1, minWidth: '45%' as unknown as number, backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
                !option.available && { opacity: 0.6 },
              ]}
              onPress={() => option.available && handleContact(option.id)}
              disabled={!option.available}
            >
              <View style={[
                { width: 56, height: 56, borderRadius: 28, backgroundColor: withOpacity(colors.primary, 0.08), alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
                !option.available && { backgroundColor: colors.border },
              ]}>
                <Ionicons name={option.icon as any} size={28} color={option.available ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={[
                { fontSize: 16, fontWeight: '600', color: colors.text },
                !option.available && { color: colors.textSecondary },
              ]}>{option.label}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Frequently Asked Questions</Text>
        {filteredFaqs.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>No results found for "{searchQuery}"</Text>
          </View>
        ) : (
          filteredFaqs.map(faq => (
            <TouchableOpacity
              key={faq.id}
              style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 }}
              onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: colors.text, marginRight: 8 }}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12, lineHeight: 22 }}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ marginTop: 24, marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Resources</Text>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 }} onPress={() => Linking.openURL('https://Fynvita.pro/guides')}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Credit Guides</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Learn about credit repair</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 }} onPress={() => Linking.openURL('https://Fynvita.pro/blog')}>
            <Ionicons name="newspaper-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Blog</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Tips and industry news</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 }} onPress={() => Linking.openURL('https://www.youtube.com/@Fynvita')}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Video Tutorials</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Step-by-step walkthroughs</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
