/**
 * Smart Budget Mobile Screen - Enhanced
 * AI-powered budget creation and optimization with Phase 2.1 integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface BudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  percentUsed: number;
  daysRemaining: number;
  categories: BudgetCategory[];
  alerts: Array<{
    category: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

interface Recommendation {
  id: string;
  type: 'increase' | 'decrease' | 'reallocate';
  category: string;
  currentAmount: number;
  suggestedAmount: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

/**
 * Budget Overview Component
 * Monthly budget summary with progress bars
 */
interface BudgetOverviewProps {
  analysis: BudgetAnalysis;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ analysis }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return theme.colors.error;
    if (percentUsed >= 90) return theme.colors.warning;
    if (percentUsed >= 75) return theme.colors.primary;
    return theme.colors.success;
  };

  return (
    <Card style={styles.overviewCard}>
      <Text style={styles.cardTitle}>Monthly Budget Overview</Text>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Ionicons name="wallet" size={24} color={theme.colors.primary} />
          <Text style={styles.metricLabel}>Budgeted</Text>
          <Text style={styles.metricValue}>{formatCurrency(analysis.totalBudgeted)}</Text>
        </View>
        
        <View style={styles.metricBox}>
          <Ionicons name="trending-down" size={24} color={theme.colors.warning} />
          <Text style={styles.metricLabel}>Spent</Text>
          <Text style={[styles.metricValue, { color: getProgressColor(analysis.percentUsed) }]}>
            {formatCurrency(analysis.totalSpent)}
          </Text>
        </View>
        
        <View style={styles.metricBox}>
          <Ionicons name="cash" size={24} color={theme.colors.success} />
          <Text style={styles.metricLabel}>Remaining</Text>
          <Text style={styles.metricValue}>{formatCurrency(analysis.totalRemaining)}</Text>
        </View>
        
        <View style={styles.metricBox}>
          <Ionicons name="calendar" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Days Left</Text>
          <Text style={styles.metricValue}>{analysis.daysRemaining}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(analysis.percentUsed, 100)}%`,
                backgroundColor: getProgressColor(analysis.percentUsed),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {analysis.percentUsed.toFixed(1)}% of budget used
        </Text>
      </View>

      {analysis.alerts && analysis.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsTitle}>⚠️ Alerts</Text>
          {analysis.alerts.slice(0, 3).map((alert, idx) => (
            <View key={idx} style={styles.alertItem}>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

// Component will be continued in next edit

