import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Theme constants
const theme = {
  colors: {
    primary: '#10B981',
    primaryDark: '#059669',
    background: '#FFFFFF',
    backgroundDark: '#1F2937',
    text: '#111827',
    textSecondary: '#6B7280',
    textDark: '#F9FAFB',
    textSecondaryDark: '#9CA3AF',
    border: '#E5E7EB',
    borderDark: '#374151',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

type VitalityGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
type TrendDirection = 'improving' | 'stable' | 'declining';

interface VitalityScoreData {
  overall: number;
  grade: VitalityGrade;
  trend: TrendDirection;
  trendPercentage: number;
  components: {
    credit: { score: number };
    spending: { score: number };
    savings: { score: number };
    debt: { score: number };
    investments: { score: number };
  };
}

interface VitalityScoreWidgetProps {
  data: VitalityScoreData;
  isLoading?: boolean;
  compact?: boolean;
}

function getGradeColor(grade: VitalityGrade): string {
  if (grade.startsWith('A')) return '#10B981';
  if (grade.startsWith('B')) return '#3B82F6';
  if (grade.startsWith('C')) return '#F59E0B';
  if (grade.startsWith('D')) return '#F97316';
  return '#EF4444';
}

function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'improving':
      return 'trending-up';
    case 'declining':
      return 'trending-down';
    default:
      return 'remove';
  }
}

function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case 'improving':
      return '#10B981';
    case 'declining':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

function CircularProgress({
  score,
  size = 120,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#10B981" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>
      </Defs>
      {/* Background circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="url(#scoreGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </Svg>
  );
}

function ComponentBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.componentBar}>
      <View style={styles.componentBarHeader}>
        <Text style={styles.componentBarLabel}>{label}</Text>
        <Text style={styles.componentBarScore}>{score}</Text>
      </View>
      <View style={styles.componentBarTrack}>
        <View
          style={[
            styles.componentBarFill,
            { width: `${score}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function LoadingSkeleton({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonCircle} />
        <View style={styles.skeletonTextGroup}>
          <View style={[styles.skeletonText, { width: 100 }]} />
          <View style={[styles.skeletonText, { width: 60, marginTop: 8 }]} />
        </View>
      </View>
      {!compact && (
        <View style={styles.skeletonBars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.skeletonText, { height: 8, marginTop: 12 }]} />
          ))}
        </View>
      )}
    </View>
  );
}

export function VitalityScoreWidget({
  data,
  isLoading = false,
  compact = false,
}: VitalityScoreWidgetProps) {
  const router = useRouter();

  if (isLoading) {
    return <LoadingSkeleton compact={compact} />;
  }

  const gradeColor = getGradeColor(data.grade);
  const trendIcon = getTrendIcon(data.trend);
  const trendColor = getTrendColor(data.trend);

  const handlePress = () => {
    router.push('/dashboard/vitality');
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <CircularProgress score={data.overall} size={compact ? 80 : 100} strokeWidth={compact ? 8 : 10} />
          <View style={styles.scoreOverlay}>
            <Text style={[styles.scoreValue, compact && styles.scoreValueCompact]}>
              {data.overall}
            </Text>
          </View>
        </View>

        <View style={styles.scoreInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, compact && styles.titleCompact]}>Financial Vitality</Text>
            <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
              <Text style={styles.gradeText}>{data.grade}</Text>
            </View>
          </View>

          <View style={styles.trendRow}>
            <Ionicons name={trendIcon as any} size={16} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {data.trend === 'improving' ? '+' : data.trend === 'declining' ? '-' : ''}
              {Math.abs(data.trendPercentage).toFixed(1)}% this month
            </Text>
          </View>

          {!compact && (
            <TouchableOpacity style={styles.detailsButton} onPress={handlePress}>
              <Text style={styles.detailsButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!compact && (
        <View style={styles.components}>
          <ComponentBar
            label="Credit"
            score={data.components.credit.score}
            color="#3B82F6"
          />
          <ComponentBar
            label="Spending"
            score={data.components.spending.score}
            color="#10B981"
          />
          <ComponentBar
            label="Savings"
            score={data.components.savings.score}
            color="#8B5CF6"
          />
          <ComponentBar
            label="Debt"
            score={data.components.debt.score}
            color="#F59E0B"
          />
          <ComponentBar
            label="Investments"
            score={data.components.investments.score}
            color="#EC4899"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerCompact: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  scoreValueCompact: {
    fontSize: 22,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  titleCompact: {
    fontSize: 14,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  components: {
    marginTop: 20,
    gap: 12,
  },
  componentBar: {
    gap: 4,
  },
  componentBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  componentBarScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  componentBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  componentBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Skeleton styles
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextGroup: {
    marginLeft: 16,
    flex: 1,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  skeletonBars: {
    marginTop: 20,
  },
});

export default VitalityScoreWidget;
