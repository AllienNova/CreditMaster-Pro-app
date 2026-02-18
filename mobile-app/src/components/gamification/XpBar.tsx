/**
 * XP Progress Bar Component for Mobile
 * Shows user's current XP and progress to next level
 */

import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { lightTheme as theme } from "../../constants/theme";

interface XpBarProps {
  currentXp: number;
  xpToNextLevel: number;
  currentLevel: number;
  levelTitle?: string;
  showDetails?: boolean;
  animate?: boolean;
}

export function XpBar({
  currentXp,
  xpToNextLevel,
  currentLevel,
  levelTitle,
  showDetails = true,
  animate = true,
}: XpBarProps) {
  const progress = Math.min((currentXp / xpToNextLevel) * 100, 100);
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animate) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(progress);
    }
  }, [progress, animate, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {showDetails && (
        <View style={styles.header}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>Level {currentLevel}</Text>
            {levelTitle && <Text style={styles.titleText}>{levelTitle}</Text>}
          </View>
          <Text style={styles.xpText}>
            {currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
          </Text>
        </View>
      )}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View
            style={[styles.barFill, { width: widthInterpolated }]}
          />
        </View>
      </View>
      {showDetails && (
        <Text style={styles.remainingText}>
          {(xpToNextLevel - currentXp).toLocaleString()} XP to next level
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  levelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  titleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  xpText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  barContainer: {
    width: "100%",
  },
  barBackground: {
    height: 10,
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  remainingText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
  },
});

export default XpBar;
