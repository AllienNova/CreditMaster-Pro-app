/**
 * CPFI Placeholder Screen Component
 * Reusable component for screens that are planned but not yet implemented
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { lightTheme as theme } from '../constants/theme';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  features?: string[];
  estimatedRelease?: string;
  relatedScreens?: { title: string; route: string }[];
}

export function PlaceholderScreen({
  title,
  description = 'This feature is coming soon!',
  icon = 'construct-outline',
  features = [],
  estimatedRelease,
  relatedScreens = [],
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={80} color={theme.colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Estimated Release */}
        {estimatedRelease && (
          <View style={styles.releaseContainer}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.releaseText}>
              Estimated Release: {estimatedRelease}
            </Text>
          </View>
        )}

        {/* Planned Features */}
        {features.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Planned Features:</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Related Screens */}
        {relatedScreens.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedTitle}>In the meantime, check out:</Text>
            {relatedScreens.map((screen, index) => (
              <TouchableOpacity
                key={index}
                style={styles.relatedItem}
                onPress={() => router.push(screen.route as any)}
              >
                <Text style={styles.relatedText}>{screen.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
    maxWidth: 320,
  },
  releaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  releaseText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  relatedContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  relatedText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
});
