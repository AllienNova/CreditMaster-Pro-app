/**
 * AI Financial Coach Mobile Screen
 * Personalized financial coaching based on Dave Ramsey's Baby Steps
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { ProgressBar } from '../../src/components/ProgressBar';

interface BabyStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
}

interface Recommendation {
  id: string;
  type: 'opportunity' | 'warning' | 'tip';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionable: boolean;
}

export default function AICoachScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [babySteps, setBabySteps] = useState<BabyStep[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [healthScore, setHealthScore] = useState(0);

  const fetchCoachData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/financial-coach/dashboard');
      if (response.ok) {
        const data = await response.json();
        setBabySteps(data.babySteps || []);
        setRecommendations(data.recommendations || []);
        setHealthScore(data.healthScore || 0);
      }
    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCoachData();
  }, [fetchCoachData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return 'trending-up';
      case 'warning': return 'warning';
      case 'tip': return 'bulb';
      default: return 'information-circle';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'tip': return theme.colors.primary;
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#F59E0B';
      case 'low': return theme.colors.primary;
      default: return '#6B7280';
    }
  };

  if (loading && babySteps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading AI Coach...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Health Score */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Financial Health Score</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{healthScore}</Text>
            <Text style={styles.scoreLabel}>out of 100</Text>
          </View>
          <ProgressBar progress={healthScore / 100} color={theme.colors.primary} />
        </Card>

        {/* Baby Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dave Ramsey's Baby Steps</Text>
          {babySteps.map((step) => (
            <Card key={step.step} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                {step.completed && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </View>
              {!step.completed && step.progress > 0 && (
                <View style={styles.stepProgress}>
                  <ProgressBar progress={step.progress / 100} color={theme.colors.primary} />
                  <Text style={styles.progressText}>{step.progress}% complete</Text>
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Recommendations</Text>
          {recommendations.map((rec) => (
            <Card key={rec.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(rec.type)}15` }]}>
                  <Ionicons name={getTypeIcon(rec.type) as any} size={20} color={getTypeColor(rec.type)} />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationDescription}>{rec.description}</Text>
                </View>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: theme.spacing.md,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  scoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  stepCard: {
    marginBottom: theme.spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  stepProgress: {
    marginTop: theme.spacing.md,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  recommendationCard: {
    marginBottom: theme.spacing.md,
  },
  recommendationHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

