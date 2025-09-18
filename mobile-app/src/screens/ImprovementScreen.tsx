import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface ImprovementAction {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  impact: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: number;
}

interface ScoreProjection {
  timeframe: string;
  currentScore: number;
  projectedScore: number;
  improvement: number;
}

const ImprovementScreen = () => {
  const [activeTab, setActiveTab] = useState<'plan' | 'progress' | 'insights'>('plan');
  
  const [scoreProjections] = useState<ScoreProjection[]>([
    { timeframe: '30 days', currentScore: 650, projectedScore: 665, improvement: 15 },
    { timeframe: '60 days', currentScore: 650, projectedScore: 685, improvement: 35 },
    { timeframe: '90 days', currentScore: 650, projectedScore: 705, improvement: 55 },
    { timeframe: '180 days', currentScore: 650, projectedScore: 730, improvement: 80 },
  ]);

  const [actions, setActions] = useState<ImprovementAction[]>([
    {
      id: '1',
      title: 'Pay Down Credit Card Debt',
      description: 'Reduce credit utilization from 45% to under 30%',
      category: 'Debt Reduction',
      difficulty: 'medium',
      timeframe: '30-60 days',
      impact: '+15-25 points',
      status: 'in_progress',
      priority: 1,
    },
    {
      id: '2',
      title: 'Set Up Automatic Payments',
      description: 'Ensure 100% on-time payment history going forward',
      category: 'Payment History',
      difficulty: 'easy',
      timeframe: '1 day',
      impact: '+10-20 points',
      status: 'completed',
      priority: 2,
    },
    {
      id: '3',
      title: 'Request Credit Limit Increases',
      description: 'Contact existing creditors to increase available credit',
      category: 'Credit Utilization',
      difficulty: 'easy',
      timeframe: '7-14 days',
      impact: '+8-15 points',
      status: 'not_started',
      priority: 3,
    },
    {
      id: '4',
      title: 'Open New Credit Account',
      description: 'Add a secured credit card to improve credit mix',
      category: 'Credit Mix',
      difficulty: 'medium',
      timeframe: '30 days',
      impact: '+5-12 points',
      status: 'not_started',
      priority: 4,
    },
    {
      id: '5',
      title: 'Dispute Inaccurate Information',
      description: 'Challenge 3 questionable items on credit reports',
      category: 'Dispute Resolution',
      difficulty: 'hard',
      timeframe: '45-90 days',
      impact: '+20-40 points',
      status: 'in_progress',
      priority: 5,
    },
  ]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#f59e0b';
      case 'not_started':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in_progress':
        return 'time';
      case 'not_started':
        return 'radio-button-off';
      default:
        return 'help-circle';
    }
  };

  const handleActionPress = (action: ImprovementAction) => {
    if (action.status === 'completed') {
      Alert.alert(
        'Action Completed',
        `Great job! You've completed "${action.title}". This should improve your credit score by ${action.impact}.`
      );
    } else {
      Alert.alert(
        action.title,
        `${action.description}\n\nDifficulty: ${action.difficulty}\nTimeframe: ${action.timeframe}\nExpected Impact: ${action.impact}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: action.status === 'not_started' ? 'Start Action' : 'View Progress',
            onPress: () => {
              if (action.status === 'not_started') {
                setActions(prev => 
                  prev.map(a => 
                    a.id === action.id 
                      ? { ...a, status: 'in_progress' as const }
                      : a
                  )
                );
              }
            }
          },
        ]
      );
    }
  };

  const completedActions = actions.filter(a => a.status === 'completed').length;
  const totalActions = actions.length;
  const progressPercentage = (completedActions / totalActions) * 100;

  const renderPlanTab = () => (
    <View style={styles.tabContent}>
      {/* Score Projection */}
      <Card style={styles.projectionCard}>
        <Text style={styles.sectionTitle}>Score Projections</Text>
        <Text style={styles.projectionSubtitle}>
          Based on your current credit profile and planned actions
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectionsScroll}>
          {scoreProjections.map((projection, index) => (
            <View key={index} style={styles.projectionItem}>
              <Text style={styles.projectionTimeframe}>{projection.timeframe}</Text>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.projectionScore}
              >
                <Text style={styles.projectionNumber}>{projection.projectedScore}</Text>
              </LinearGradient>
              <View style={styles.projectionImprovement}>
                <Ionicons name="trending-up" size={12} color="#10b981" />
                <Text style={styles.projectionImprovementText}>+{projection.improvement}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Card>

      {/* Action Plan */}
      <Card style={styles.actionPlanCard}>
        <View style={styles.actionPlanHeader}>
          <Text style={styles.sectionTitle}>Your Action Plan</Text>
          <Text style={styles.actionPlanProgress}>
            {completedActions}/{totalActions} completed
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPercentage)}% complete</Text>
        </View>

        <View style={styles.actionsList}>
          {actions
            .sort((a, b) => a.priority - b.priority)
            .map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                onPress={() => handleActionPress(action)}
              >
                <View style={styles.actionIcon}>
                  <Ionicons 
                    name={getStatusIcon(action.status)} 
                    size={20} 
                    color={getStatusColor(action.status)} 
                  />
                </View>
                
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                  
                  <View style={styles.actionMeta}>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(action.difficulty) }
                    ]}>
                      <Text style={styles.difficultyText}>
                        {action.difficulty.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.actionTimeframe}>{action.timeframe}</Text>
                  </View>
                </View>
                
                <View style={styles.actionImpact}>
                  <Text style={styles.impactText}>{action.impact}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </Card>
    </View>
  );

  const renderProgressTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.progressOverviewCard}>
        <Text style={styles.sectionTitle}>Progress Overview</Text>
        
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatNumber}>{completedActions}</Text>
            <Text style={styles.progressStatLabel}>Actions Completed</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatNumber}>
              {actions.filter(a => a.status === 'in_progress').length}
            </Text>
            <Text style={styles.progressStatLabel}>In Progress</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatNumber}>+35</Text>
            <Text style={styles.progressStatLabel}>Points Gained</Text>
          </View>
        </View>

        <View style={styles.progressChart}>
          <Text style={styles.chartTitle}>Score Improvement Timeline</Text>
          {/* Simplified chart representation */}
          <View style={styles.chartContainer}>
            <View style={styles.chartBar}>
              <View style={[styles.chartFill, { height: '40%' }]} />
              <Text style={styles.chartLabel}>Jan</Text>
            </View>
            <View style={styles.chartBar}>
              <View style={[styles.chartFill, { height: '60%' }]} />
              <Text style={styles.chartLabel}>Feb</Text>
            </View>
            <View style={styles.chartBar}>
              <View style={[styles.chartFill, { height: '80%' }]} />
              <Text style={styles.chartLabel}>Mar</Text>
            </View>
            <View style={styles.chartBar}>
              <View style={[styles.chartFill, { height: '100%' }]} />
              <Text style={styles.chartLabel}>Apr</Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.insightsCard}>
        <Text style={styles.sectionTitle}>AI Insights</Text>
        
        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons name="trending-up" size={20} color="#10b981" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Excellent Progress</Text>
            <Text style={styles.insightDescription}>
              Your credit utilization has improved by 15% this month. Keep up the great work!
            </Text>
          </View>
        </View>

        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Opportunity Identified</Text>
            <Text style={styles.insightDescription}>
              Requesting credit limit increases could boost your score by 8-15 points.
            </Text>
          </View>
        </View>

        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#667eea" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Strategy Recommendation</Text>
            <Text style={styles.insightDescription}>
              Focus on debt reduction for maximum impact. This is your highest priority action.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tip}>
            • Pay down highest utilization cards first for maximum impact
          </Text>
          <Text style={styles.tip}>
            • Set up automatic payments to ensure perfect payment history
          </Text>
          <Text style={styles.tip}>
            • Check your credit reports monthly for new opportunities
          </Text>
          <Text style={styles.tip}>
            • Be patient - significant improvements take 3-6 months
          </Text>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Credit Improvement</Text>
        <Text style={styles.subtitle}>
          AI-powered plan to boost your credit score
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plan' && styles.activeTab]}
          onPress={() => setActiveTab('plan')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'plan' && styles.activeTabText
          ]}>
            Plan
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'progress' && styles.activeTabText
          ]}>
            Progress
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
          onPress={() => setActiveTab('insights')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'insights' && styles.activeTabText
          ]}>
            Insights
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'plan' && renderPlanTab()}
        {activeTab === 'progress' && renderProgressTab()}
        {activeTab === 'insights' && renderInsightsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#667eea',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  projectionCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  projectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  projectionsScroll: {
    marginHorizontal: -16,
  },
  projectionItem: {
    alignItems: 'center',
    marginHorizontal: 16,
    minWidth: 80,
  },
  projectionTimeframe: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  projectionScore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  projectionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  projectionImprovement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  projectionImprovementText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  actionPlanCard: {
    marginBottom: 24,
  },
  actionPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionPlanProgress: {
    fontSize: 14,
    color: '#64748b',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  actionsList: {
    gap: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionTimeframe: {
    fontSize: 12,
    color: '#64748b',
  },
  actionImpact: {
    alignItems: 'flex-end',
    gap: 4,
  },
  impactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  progressOverviewCard: {
    marginBottom: 24,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#334155',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  progressChart: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartFill: {
    width: 20,
    backgroundColor: '#667eea',
    borderRadius: 2,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  insightsCard: {
    marginBottom: 24,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  tipsCard: {
    marginBottom: 24,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default ImprovementScreen;

