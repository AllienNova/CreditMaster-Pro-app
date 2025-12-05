import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  bureau?: string;
  change?: number;
  showLabel?: boolean;
}

const bureauColors: Record<string, string> = {
  experian: '#0066CC',
  equifax: '#CC0000',
  transunion: '#00AA00',
  default: '#6366F1',
};

export function ScoreGauge({
  score,
  maxScore = 850,
  size = 150,
  strokeWidth = 12,
  bureau = 'default',
  change,
  showLabel = true,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score / maxScore, 1);
  const strokeDashoffset = circumference * (1 - percentage * 0.75); // 270 degrees arc
  const color = bureauColors[bureau] || bureauColors.default;

  const getScoreRating = (score: number): string => {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 740) return '#00AA00';
    if (score >= 670) return '#8BC34A';
    if (score >= 580) return '#FF9800';
    return '#CC0000';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Background arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        
        {/* Score arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      <View style={styles.centerContent}>
        <Text style={[styles.score, { color: getScoreColor(score) }]}>{score}</Text>
        {showLabel && (
          <Text style={styles.rating}>{getScoreRating(score)}</Text>
        )}
        {change !== undefined && (
          <View style={[styles.changeContainer, { backgroundColor: change >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
            <Text style={[styles.change, { color: change >= 0 ? '#00AA00' : '#CC0000' }]}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  changeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ScoreGauge;

