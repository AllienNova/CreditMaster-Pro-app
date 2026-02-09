import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, Line, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Theme constants
const theme = {
  colors: {
    primary: '#10B981',
    primaryDark: '#059669',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

type VitalityGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
type TrendDirection = 'improving' | 'stable' | 'declining';
type ComponentCategory = 'credit' | 'spending' | 'savings' | 'debt' | 'investments';

interface QuickWin {
  id: string;
  title: string;
  description: string;
  impact: number;
  category: ComponentCategory;
  actionUrl?: string;
}

interface ComponentScore {
  score: number;
  weight: number;
  trend: TrendDirection;
  details: Record<string, any>;
}

interface VitalityScoreData {
  overall: number;
  grade: VitalityGrade;
  percentile: number;
  trend: TrendDirection;
  trendPercentage: number;
  components: {
    credit: ComponentScore;
    spending: ComponentScore;
    savings: ComponentScore;
    debt: ComponentScore;
    investments: ComponentScore;
  };
  quickWins: QuickWin[];
  nextMilestone: {
    target: number;
    title: string;
    description: string;
    pointsNeeded: number;
  };
  history: { date: string; score: number }[];
}

// Mock data - replace with API call
const mockVitalityData: VitalityScoreData = {
  overall: 78,
  grade: 'B+',
  percentile: 72,
  trend: 'improving',
  trendPercentage: 5.2,
  components: {
    credit: { score: 85, weight: 0.25, trend: 'improving', details: { creditScore: 720, utilization: 25 } },
    spending: { score: 70, weight: 0.20, trend: 'stable', details: { budgetAdherence: 0.85 } },
    savings: { score: 65, weight: 0.20, trend: 'improving', details: { emergencyFund: 2.5 } },
    debt: { score: 75, weight: 0.20, trend: 'stable', details: { debtToIncome: 0.28 } },
    investments: { score: 80, weight: 0.15, trend: 'improving', details: { diversification: 0.75 } },
  },
  quickWins: [
    { id: '1', title: 'Pay down credit card', description: 'Reduce balance by $500 to lower utilization', impact: 8, category: 'credit' },
    { id: '2', title: 'Set up auto-save', description: 'Automate $100/month to savings', impact: 5, category: 'savings' },
    { id: '3', title: 'Review subscriptions', description: 'Cancel unused subscriptions', impact: 3, category: 'spending' },
  ],
  nextMilestone: {
    target: 80,
    title: 'Score Champion',
    description: 'Reach 80+ vitality score',
    pointsNeeded: 2,
  },
  history: [
    { date: '2025-12-01', score: 72 },
    { date: '2025-12-15', score: 74 },
    { date: '2026-01-01', score: 76 },
    { date: '2026-01-10', score: 78 },
  ],
};

function getGradeColor(grade: VitalityGrade): string {
  if (grade.startsWith('A')) return '#10B981';
  if (grade.startsWith('B')) return '#3B82F6';
  if (grade.startsWith('C')) return '#F59E0B';
  if (grade.startsWith('D')) return '#F97316';
  return '#EF4444';
}

function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'improving': return 'trending-up';
    case 'declining': return 'trending-down';
    default: return 'remove';
  }
}

function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case 'improving': return '#10B981';
    case 'declining': return '#EF4444';
    default: return '#6B7280';
  }
}

function getComponentIcon(category: ComponentCategory): string {
  switch (category) {
    case 'credit': return 'card';
    case 'spending': return 'cart';
    case 'savings': return 'wallet';
    case 'debt': return 'trending-down';
    case 'investments': return 'stats-chart';
  }
}

function getComponentColor(category: ComponentCategory): string {
  switch (category) {
    case 'credit': return '#3B82F6';
    case 'spending': return '#10B981';
    case 'savings': return '#8B5CF6';
    case 'debt': return '#F59E0B';
    case 'investments': return '#EC4899';
  }
}

function HeroScore({ data }: { data: VitalityScoreData }) {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (data.overall / 100) * circumference;
  const center = size / 2;

  const gradeColor = getGradeColor(data.grade);
  const trendColor = getTrendColor(data.trend);
  const trendIcon = getTrendIcon(data.trend);

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroContent}>
        <View style={styles.scoreCircleContainer}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#059669" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#heroGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
          <View style={styles.scoreOverlay}>
            <Text style={styles.scoreValue}>{data.overall}</Text>
            <Text style={styles.scoreLabel}>Vitality Score</Text>
          </View>
        </View>

        <View style={styles.heroInfo}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeText}>{data.grade}</Text>
          </View>

          <View style={styles.trendBadge}>
            <Ionicons name={trendIcon as any} size={16} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {data.trend === 'improving' ? '+' : data.trend === 'declining' ? '-' : ''}
              {Math.abs(data.trendPercentage).toFixed(1)}%
            </Text>
          </View>

          <Text style={styles.percentileText}>
            Better than {data.percentile}% of users
          </Text>
        </View>
      </View>

      {/* Milestone Progress */}
      <View style={styles.milestoneSection}>
        <View style={styles.milestoneHeader}>
          <Ionicons name="trophy" size={16} color="#F59E0B" />
          <Text style={styles.milestoneTitle}>Next: {data.nextMilestone.title}</Text>
        </View>
        <View style={styles.milestoneProgress}>
          <View style={styles.milestoneTrack}>
            <View
              style={[
                styles.milestoneFill,
                { width: `${((data.overall / data.nextMilestone.target) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.milestonePoints}>
            {data.nextMilestone.pointsNeeded} pts to go
          </Text>
        </View>
      </View>
    </View>
  );
}

function QuickWinsCard({ wins }: { wins: QuickWin[] }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flash" size={20} color="#F59E0B" />
        <Text style={styles.sectionTitle}>Quick Wins</Text>
      </View>

      {wins.map((win, index) => (
        <TouchableOpacity key={win.id} style={styles.quickWinItem}>
          <View
            style={[
              styles.quickWinIcon,
              { backgroundColor: `${getComponentColor(win.category)}20` },
            ]}
          >
            <Ionicons
              name={getComponentIcon(win.category) as any}
              size={16}
              color={getComponentColor(win.category)}
            />
          </View>
          <View style={styles.quickWinContent}>
            <Text style={styles.quickWinTitle}>{win.title}</Text>
            <Text style={styles.quickWinDescription}>{win.description}</Text>
          </View>
          <View style={styles.quickWinImpact}>
            <Text style={styles.impactValue}>+{win.impact}</Text>
            <Text style={styles.impactLabel}>pts</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ComponentCard({
  name,
  category,
  score,
  trend,
  weight,
}: {
  name: string;
  category: ComponentCategory;
  score: number;
  trend: TrendDirection;
  weight: number;
}) {
  const color = getComponentColor(category);
  const trendColor = getTrendColor(trend);
  const trendIcon = getTrendIcon(trend);

  return (
    <View style={styles.componentCard}>
      <View style={styles.componentHeader}>
        <View style={[styles.componentIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={getComponentIcon(category) as any} size={18} color={color} />
        </View>
        <View style={styles.componentInfo}>
          <Text style={styles.componentName}>{name}</Text>
          <Text style={styles.componentWeight}>{(weight * 100).toFixed(0)}% weight</Text>
        </View>
        <View style={styles.componentScoreContainer}>
          <Text style={[styles.componentScore, { color }]}>{score}</Text>
          <View style={styles.componentTrend}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
          </View>
        </View>
      </View>
      <View style={styles.componentProgress}>
        <View style={styles.componentTrack}>
          <View style={[styles.componentFill, { width: `${score}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function TrendChart({ history }: { history: { date: string; score: number }[] }) {
  const chartWidth = SCREEN_WIDTH - 72;
  const chartHeight = 100;
  const padding = 10;

  if (history.length < 2) return null;

  const minScore = Math.min(...history.map(h => h.score)) - 5;
  const maxScore = Math.max(...history.map(h => h.score)) + 5;
  const range = maxScore - minScore;

  const points = history.map((h, i) => ({
    x: padding + (i / (history.length - 1)) * (chartWidth - 2 * padding),
    y: chartHeight - padding - ((h.score - minScore) / range) * (chartHeight - 2 * padding),
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="analytics" size={20} color="#3B82F6" />
        <Text style={styles.sectionTitle}>Score Trend</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((pct, i) => (
          <Line
            key={i}
            x1={padding}
            y1={padding + pct * (chartHeight - 2 * padding)}
            x2={chartWidth - padding}
            y2={padding + pct * (chartHeight - 2 * padding)}
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}
        {/* Line */}
        <Path
          d={pathD}
          stroke="#10B981"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#10B981" />
        ))}
      </Svg>

      <View style={styles.chartLabels}>
        {history.map((h, i) => (
          <Text key={i} style={styles.chartLabel}>
            {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function VitalityScreen() {
  const [data, setData] = useState<VitalityScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/financial/vitality-score');
      if (response.ok) {
        const vitalityData = await response.json();
        setData(vitalityData);
      } else {
        // Fallback to mock data if API unavailable
        setData(mockVitalityData);
      }
    } catch (error) {
      // Fallback to mock data on network error
      setData(mockVitalityData);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading vitality score...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Financial Vitality',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTitleStyle: { fontWeight: '600', color: '#111827' },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <HeroScore data={data} />

        <QuickWinsCard wins={data.quickWins} />

        <TrendChart history={data.history} />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pie-chart" size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Score Breakdown</Text>
          </View>

          <View style={styles.componentsList}>
            <ComponentCard
              name="Credit Health"
              category="credit"
              score={data.components.credit.score}
              trend={data.components.credit.trend}
              weight={data.components.credit.weight}
            />
            <ComponentCard
              name="Spending Habits"
              category="spending"
              score={data.components.spending.score}
              trend={data.components.spending.trend}
              weight={data.components.spending.weight}
            />
            <ComponentCard
              name="Savings"
              category="savings"
              score={data.components.savings.score}
              trend={data.components.savings.trend}
              weight={data.components.savings.weight}
            />
            <ComponentCard
              name="Debt Management"
              category="debt"
              score={data.components.debt.score}
              trend={data.components.debt.trend}
              weight={data.components.debt.weight}
            />
            <ComponentCard
              name="Investments"
              category="investments"
              score={data.components.investments.score}
              trend={data.components.investments.trend}
              weight={data.components.investments.weight}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Hero Section
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#111827',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 20,
    alignItems: 'flex-start',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentileText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Milestone
  milestoneSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  milestoneProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  milestonePoints: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  // Quick Wins
  quickWinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickWinIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWinContent: {
    flex: 1,
    marginLeft: 12,
  },
  quickWinTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  quickWinDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quickWinImpact: {
    alignItems: 'center',
    marginLeft: 12,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  impactLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  // Chart
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  // Components
  componentsList: {
    gap: 12,
  },
  componentCard: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  componentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  componentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  componentWeight: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  componentScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  componentScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  componentTrend: {
    marginTop: 2,
  },
  componentProgress: {
    marginTop: 4,
  },
  componentTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  componentFill: {
    height: '100%',
    borderRadius: 3,
  },
});
