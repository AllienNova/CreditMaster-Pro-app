import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import {
  lightTheme as theme,
  getScoreColor,
  getScoreLabel,
} from "../constants/theme";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  change?: number;
}

export function ScoreGauge({
  score,
  size = 200,
  strokeWidth = 12,
  showLabel = true,
  change,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const minScore = 300;
  const maxScore = 850;
  const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
  const progress = (normalizedScore - minScore) / (maxScore - minScore);
  const strokeDashoffset = circumference - progress * circumference;
  const scoreColor = getScoreColor(score);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
        {showLabel && (
          <Text style={styles.scoreLabel}>{getScoreLabel(score)}</Text>
        )}
        {change !== undefined && (
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: change >= 0 ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                {
                  color:
                    change >= 0 ? theme.colors.success : theme.colors.error,
                },
              ]}
            >
              {change >= 0 ? "+" : ""}
              {change}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreContainer: {
    position: "absolute",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
