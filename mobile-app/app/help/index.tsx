/**
 * CPFI Help & Support Dashboard
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

export default function HelpScreen() {
  const helpItems = [
    { icon: 'help-circle', title: 'FAQ', subtitle: 'Frequently asked questions', route: '/help/faq' },
    { icon: 'chatbubbles', title: 'Contact Support', subtitle: 'Get help from our team', route: '/help/contact' },
    { icon: 'book', title: 'Guides', subtitle: 'How-to guides and tutorials', route: '/help/guides' },
    { icon: 'chatbox', title: 'AI Assistant', subtitle: 'Chat with our AI', route: '/chat' },
  ];

  const handleEmail = () => {
    Linking.openURL('mailto:support@creditpro.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+18001234567');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>We're here to help you</Text>
        </View>

        {/* Quick Contact */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need immediate help?</Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <Ionicons name="mail" size={24} color={theme.colors.primary} />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handlePhone}>
              <Ionicons name="call" size={24} color={theme.colors.primary} />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={() => router.push('/chat')}>
              <Ionicons name="chatbox" size={24} color={theme.colors.primary} />
              <Text style={styles.contactButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Help Items */}
        <View style={styles.helpSection}>
          {helpItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.helpItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.helpIcon}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{item.title}</Text>
                <Text style={styles.helpSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  contactCard: { marginBottom: theme.spacing.lg, paddingVertical: theme.spacing.lg },
  contactTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.md },
  contactButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  contactButton: { alignItems: 'center' },
  contactButtonText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  helpSection: { marginTop: theme.spacing.md },
  helpItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  helpIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  helpSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});

