import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../constants/theme';

interface DisputeCardProps {
  id: string;
  status: 'draft' | 'pending' | 'in_progress' | 'resolved' | 'rejected';
  bureau: string;
  type: string;
  creditor: string;
  createdAt: string;
  onPress?: () => void;
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  draft: { color: '#666', bg: '#F5F5F5', label: 'Draft', icon: 'create-outline' },
  pending: { color: '#E65100', bg: '#FFF3E0', label: 'Pending', icon: 'time-outline' },
  in_progress: { color: '#0066CC', bg: '#E3F2FD', label: 'In Progress', icon: 'hourglass-outline' },
  resolved: { color: '#00AA00', bg: '#E8F5E9', label: 'Resolved', icon: 'checkmark-circle-outline' },
  rejected: { color: '#CC0000', bg: '#FFEBEE', label: 'Rejected', icon: 'close-circle-outline' },
};

const bureauColors: Record<string, string> = {
  experian: '#0066CC',
  equifax: '#CC0000',
  transunion: '#00AA00',
};

export function DisputeCard({
  id,
  status,
  bureau,
  type,
  creditor,
  createdAt,
  onPress,
}: DisputeCardProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const bureauColor = bureauColors[bureau.toLowerCase()] || '#666';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/dispute/${id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.bureauBadge, { backgroundColor: `${bureauColor}15` }]}>
          <Text style={[styles.bureauText, { color: bureauColor }]}>
            {bureau.charAt(0).toUpperCase() + bureau.slice(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.creditor} numberOfLines={1}>{creditor}</Text>
        <Text style={styles.type}>{type}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#999" />
          <Text style={styles.date}>{formatDate(createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>

      {status === 'in_progress' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressText}>Processing with bureau</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bureauBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bureauText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 12,
  },
  creditor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  type: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
  },
});

export default DisputeCard;

