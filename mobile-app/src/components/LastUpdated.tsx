/**
 * Last Updated Component
 * Displays when data was last fetched/updated with relative time
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../constants/theme';

interface LastUpdatedProps {
  timestamp: string | null;
  label?: string;
  showIcon?: boolean;
  size?: 'small' | 'medium';
}

export function LastUpdated({ 
  timestamp, 
  label = 'Last updated', 
  showIcon = true,
  size = 'small' 
}: LastUpdatedProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('Never');
      return;
    }

    const updateRelativeTime = () => {
      const now = new Date();
      const then = new Date(timestamp);

      // Check if date is invalid
      if (isNaN(then.getTime())) {
        setRelativeTime('Never');
        return;
      }

      const diffMs = now.getTime() - then.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        setRelativeTime('Just now');
      } else if (diffMins < 60) {
        setRelativeTime(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setRelativeTime(`${diffHours}h ago`);
      } else if (diffDays === 1) {
        setRelativeTime('Yesterday');
      } else if (diffDays < 7) {
        setRelativeTime(`${diffDays}d ago`);
      } else {
        setRelativeTime(then.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }));
      }
    };

    updateRelativeTime();
    
    // Update every minute
    const interval = setInterval(updateRelativeTime, 60000);
    
    return () => clearInterval(interval);
  }, [timestamp]);

  const styles = size === 'small' ? smallStyles : mediumStyles;

  return (
    <View style={styles.container}>
      {showIcon && (
        <Ionicons 
          name="time-outline" 
          size={size === 'small' ? 12 : 14} 
          color={theme.colors.textSecondary} 
        />
      )}
      <Text style={styles.text}>
        {label}: {relativeTime}
      </Text>
    </View>
  );
}

const smallStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});

const mediumStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});

