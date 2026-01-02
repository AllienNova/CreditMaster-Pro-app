/**
 * Action Plan Mobile Screen
 * Track and complete AI-generated financial action plans
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { ProgressBar } from '../../src/components/ProgressBar';

interface ActionStep {
  id: string;
  title: string;
  completed: boolean;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: ActionStep[];
  completed: boolean;
  progress: number;
}

export default function ActionPlanScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [plans, setPlans] = useState<ActionPlan[]>([]);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/financial-coach/recommendations');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.actionPlans || []);
      }
    } catch (error) {
      console.error('Error fetching action plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans();
  }, [fetchPlans]);

  const toggleStep = async (planId: string, stepId: string) => {
    // Optimistic update
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        const updatedSteps = plan.steps.map(step =>
          step.id === stepId ? { ...step, completed: !step.completed } : step
        );
        const completedSteps = updatedSteps.filter(s => s.completed).length;
        const progress = (completedSteps / updatedSteps.length) * 100;
        return { ...plan, steps: updatedSteps, progress, completed: progress === 100 };
      }
      return plan;
    }));

    // API call
    try {
      await fetch(`/api/ai/financial-coach/action-plans/${planId}/steps/${stepId}`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error updating step:', error);
      // Revert on error
      fetchPlans();
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

  const filteredPlans = plans.filter(plan => {
    if (filter === 'active') return !plan.completed;
    if (filter === 'completed') return plan.completed;
    return true;
  });

  if (loading && plans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Action Plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({plans.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
            Active ({plans.filter(p => !p.completed).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>
            Completed ({plans.filter(p => p.completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {filteredPlans.map((plan) => (
          <Card key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(plan.priority) }]}>
                <Text style={styles.priorityText}>{plan.priority.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>{plan.description}</Text>
            
            <View style={styles.progressContainer}>
              <ProgressBar progress={plan.progress / 100} color={theme.colors.primary} />
              <Text style={styles.progressText}>{Math.round(plan.progress)}% complete</Text>
            </View>

            <View style={styles.stepsContainer}>
              {plan.steps.map((step) => (
                <TouchableOpacity
                  key={step.id}
                  style={styles.stepRow}
                  onPress={() => toggleStep(plan.id, step.id)}
                >
                  <Ionicons
                    name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={step.completed ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.stepText, step.completed && styles.stepTextCompleted]}>
                    {step.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {plan.completed && (
              <View style={styles.completedBanner}>
                <Ionicons name="trophy" size={20} color="#10B981" />
                <Text style={styles.completedText}>Plan Completed!</Text>
              </View>
            )}
          </Card>
        ))}

        {filteredPlans.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No {filter} action plans</Text>
          </View>
        )}
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  planCard: {
    margin: theme.spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  planTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  progressContainer: {
    marginBottom: theme.spacing.md,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  stepsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: theme.spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  stepTextCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});

