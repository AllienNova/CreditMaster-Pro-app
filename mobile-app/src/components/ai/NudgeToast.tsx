/**
 * Nudge Toast Component for Mobile
 * Displays AI nudges as dismissible notifications
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../../constants/theme';

type NudgeType =
  | 'motivational'
  | 'progress'
  | 'warning'
  | 'celebration'
  | 'reminder'
  | 'insight'
  | 'coaching';

interface Nudge {
  id: string;
  nudgeType: NudgeType;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
}

interface NudgeToastProps {
  nudge: Nudge;
  onAccept: () => void;
  onDismiss: () => void;
  onSnooze?: () => void;
  onAction?: () => void;
}

const typeConfig: Record<
  NudgeType,
  { icon: string; color: string; bgColor: string }
> = {
  motivational: { icon: '💪', color: '#3B82F6', bgColor: '#EFF6FF' },
  progress: { icon: '📊', color: '#22C55E', bgColor: '#F0FDF4' },
  warning: { icon: '⚠️', color: '#F59E0B', bgColor: '#FFFBEB' },
  celebration: { icon: '🎉', color: '#A855F7', bgColor: '#FAF5FF' },
  reminder: { icon: '🔔', color: '#F97316', bgColor: '#FFF7ED' },
  insight: { icon: '💡', color: '#06B6D4', bgColor: '#ECFEFF' },
  coaching: { icon: '📚', color: '#6366F1', bgColor: '#EEF2FF' },
};

export function NudgeToast({
  nudge,
  onAccept,
  onDismiss,
  onSnooze,
  onAction,
}: NudgeToastProps) {
  const config = typeConfig[nudge.nudgeType];
  const slideAnim = React.useRef(new Animated.Value(100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bgColor, borderLeftColor: config.color },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{nudge.title}</Text>
          <Text style={styles.message}>{nudge.message}</Text>

          <View style={styles.actions}>
            {nudge.actionLabel && onAction && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: config.color }]}
                onPress={onAction}
              >
                <Text style={styles.actionButtonText}>{nudge.actionLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: config.color },
              ]}
              onPress={onAccept}
            >
              <Text style={styles.secondaryButtonText}>Got it</Text>
            </TouchableOpacity>
            {onSnooze && (
              <TouchableOpacity style={styles.textButton} onPress={onSnooze}>
                <Text style={styles.textButtonText}>Snooze</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  textButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textButtonText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 'auto',
  },
});

export default NudgeToast;
