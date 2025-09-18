import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

interface CreditScore {
  score: number;
  bureau: string;
  change: number;
  date: string;
}

interface DashboardStats {
  totalItems: number;
  activeDisputes: number;
  successRate: number;
  pointsImproved: number;
}

const DashboardScreen = () => {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [creditScores, setCreditScores] = useState<CreditScore[]>([
    { score: 650, bureau: 'Experian', change: +15, date: '2024-01-15' },
    { score: 645, bureau: 'Equifax', change: +12, date: '2024-01-15' },
    { score: 655, bureau: 'TransUnion', change: +18, date: '2024-01-15' },
  ]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 12,
    activeDisputes: 5,
    successRate: 73,
    pointsImproved: 45,
  });

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'dispute_success',
      title: 'Collection Account Removed',
      description: 'Capital One collection successfully disputed',
      date: '2 hours ago',
      impact: '+8 points',
    },
    {
      id: 2,
      type: 'dispute_pending',
      title: 'Late Payment Dispute',
      description: 'Chase Bank late payment under review',
      date: '1 day ago',
      impact: 'Pending',
    },
    {
      id: 3,
      type: 'improvement',
      title: 'Credit Utilization Improved',
      description: 'Utilization decreased to 15%',
      date: '3 days ago',
      impact: '+5 points',
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const averageScore = Math.round(
    creditScores.reduce((sum, score) => sum + score.score, 0) / creditScores.length
  );

  const getScoreColor = (score: number) => {
    if (score >= 750) return '#10b981';
    if (score >= 700) return '#f59e0b';
    if (score >= 650) return '#ef4444';
    return '#dc2626';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'dispute_success':
        return 'checkmark-circle';
      case 'dispute_pending':
        return 'time';
      case 'improvement':
        return 'trending-up';
      default:
        return 'information-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.userName}>
                {user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Button
                title="Scan Report"
                onPress={() => {}}
                variant="secondary"
                size="small"
                icon={<Ionicons name="camera" size={16} color="#667eea" />}
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Credit Score Overview */}
          <Card style={styles.scoreCard}>
            <Text style={styles.sectionTitle}>Credit Score Overview</Text>
            
            <View style={styles.averageScore}>
              <Text style={[styles.scoreNumber, { color: getScoreColor(averageScore) }]}>
                {averageScore}
              </Text>
              <Text style={styles.scoreLabel}>Average Score</Text>
              <View style={styles.scoreChange}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.scoreChangeText}>+15 this month</Text>
              </View>
            </View>

            <View style={styles.bureauScores}>
              {creditScores.map((score, index) => (
                <View key={index} style={styles.bureauScore}>
                  <Text style={styles.bureauName}>{score.bureau}</Text>
                  <Text style={[styles.bureauNumber, { color: getScoreColor(score.score) }]}>
                    {score.score}
                  </Text>
                  <View style={styles.bureauChange}>
                    <Ionicons 
                      name={score.change > 0 ? "arrow-up" : "arrow-down"} 
                      size={12} 
                      color={score.change > 0 ? "#10b981" : "#ef4444"} 
                    />
                    <Text style={[
                      styles.bureauChangeText,
                      { color: score.change > 0 ? "#10b981" : "#ef4444" }
                    ]}>
                      {score.change > 0 ? '+' : ''}{score.change}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="document-text" size={24} color="#667eea" />
                <Text style={styles.statNumber}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>Credit Items</Text>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="shield-checkmark" size={24} color="#f59e0b" />
                <Text style={styles.statNumber}>{stats.activeDisputes}</Text>
                <Text style={styles.statLabel}>Active Disputes</Text>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="trophy" size={24} color="#10b981" />
                <Text style={styles.statNumber}>{stats.successRate}%</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </Card>

            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="trending-up" size={24} color="#8b5cf6" />
                <Text style={styles.statNumber}>+{stats.pointsImproved}</Text>
                <Text style={styles.statLabel}>Points Gained</Text>
              </View>
            </Card>
          </View>

          {/* Quick Actions */}
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actions}>
              <Button
                title="Upload Report"
                onPress={() => {}}
                variant="primary"
                style={styles.actionButton}
                icon={<Ionicons name="cloud-upload" size={16} color="#ffffff" />}
              />
              <Button
                title="Start Dispute"
                onPress={() => {}}
                variant="outline"
                style={styles.actionButton}
                icon={<Ionicons name="shield-checkmark" size={16} color="#667eea" />}
              />
            </View>
          </Card>

          {/* Recent Activity */}
          <Card style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Button
                title="View All"
                onPress={() => {}}
                variant="ghost"
                size="small"
              />
            </View>

            <View style={styles.activityList}>
              {recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Ionicons 
                      name={getActivityIcon(activity.type)} 
                      size={20} 
                      color="#667eea" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                    <Text style={styles.activityDate}>{activity.date}</Text>
                  </View>
                  <View style={styles.activityImpact}>
                    <Text style={[
                      styles.activityImpactText,
                      { color: activity.impact.includes('+') ? '#10b981' : '#64748b' }
                    ]}>
                      {activity.impact}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    padding: 24,
    paddingTop: -16,
  },
  scoreCard: {
    marginBottom: 24,
    marginTop: -16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
  },
  averageScore: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  scoreChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  scoreChangeText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  bureauScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bureauScore: {
    alignItems: 'center',
  },
  bureauName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  bureauNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bureauChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  bureauChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  activityCard: {
    marginBottom: 24,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  activityImpact: {
    alignItems: 'flex-end',
  },
  activityImpactText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;

