import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface Dispute {
  id: string;
  title: string;
  bureau: string;
  strategy: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  createdDate: string;
  expectedResolution: string;
  description: string;
  impact: string;
}

const DisputesScreen = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [disputes] = useState<Dispute[]>([
    {
      id: '1',
      title: 'Capital One Collection Account',
      bureau: 'Experian',
      strategy: 'Debt Validation',
      status: 'investigating',
      createdDate: '2024-01-10',
      expectedResolution: '2024-02-10',
      description: 'Disputing collection account that appears to be inaccurate',
      impact: '+8-12 points',
    },
    {
      id: '2',
      title: 'Chase Bank Late Payment',
      bureau: 'Equifax',
      strategy: 'Goodwill Letter',
      status: 'pending',
      createdDate: '2024-01-12',
      expectedResolution: '2024-02-12',
      description: 'Requesting removal of late payment due to financial hardship',
      impact: '+5-8 points',
    },
    {
      id: '3',
      title: 'Discover Card High Utilization',
      bureau: 'TransUnion',
      strategy: 'Method of Verification',
      status: 'resolved',
      createdDate: '2024-01-05',
      expectedResolution: '2024-02-05',
      description: 'Successfully disputed incorrect balance reporting',
      impact: '+15 points',
    },
    {
      id: '4',
      title: 'Student Loan Default',
      bureau: 'Experian',
      strategy: 'Corey Gray Method',
      status: 'rejected',
      createdDate: '2024-01-08',
      expectedResolution: '2024-02-08',
      description: 'Dispute rejected, preparing escalation strategy',
      impact: 'Pending',
    },
  ]);

  const activeDisputes = disputes.filter(d => 
    d.status === 'pending' || d.status === 'investigating'
  );
  
  const completedDisputes = disputes.filter(d => 
    d.status === 'resolved' || d.status === 'rejected'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#10b981';
      case 'investigating':
        return '#f59e0b';
      case 'pending':
        return '#667eea';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'checkmark-circle';
      case 'investigating':
        return 'search';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getBureauColor = (bureau: string) => {
    switch (bureau.toLowerCase()) {
      case 'experian':
        return '#0066cc';
      case 'equifax':
        return '#ff6b35';
      case 'transunion':
        return '#00a651';
      default:
        return '#667eea';
    }
  };

  const handleStartNewDispute = () => {
    Alert.alert(
      'Start New Dispute',
      'This will analyze your credit reports and suggest the best dispute strategies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {} },
      ]
    );
  };

  const handleViewDispute = (dispute: Dispute) => {
    Alert.alert(
      dispute.title,
      `Strategy: ${dispute.strategy}\nBureau: ${dispute.bureau}\nStatus: ${dispute.status}\n\n${dispute.description}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'View Details', onPress: () => {} },
      ]
    );
  };

  const renderDispute = (dispute: Dispute) => (
    <Card 
      key={dispute.id} 
      style={styles.disputeCard}
      onPress={() => handleViewDispute(dispute)}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeTitle}>{dispute.title}</Text>
          <View style={styles.disputeMeta}>
            <View style={[styles.bureauBadge, { backgroundColor: getBureauColor(dispute.bureau) }]}>
              <Text style={styles.bureauText}>{dispute.bureau}</Text>
            </View>
            <Text style={styles.strategyText}>{dispute.strategy}</Text>
          </View>
        </View>
        
        <View style={styles.disputeStatus}>
          <Ionicons 
            name={getStatusIcon(dispute.status)} 
            size={20} 
            color={getStatusColor(dispute.status)} 
          />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(dispute.status) }
          ]}>
            {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.disputeDescription}>{dispute.description}</Text>

      <View style={styles.disputeFooter}>
        <View style={styles.disputeDates}>
          <Text style={styles.dateLabel}>Created:</Text>
          <Text style={styles.dateValue}>
            {new Date(dispute.createdDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.disputeImpact}>
          <Text style={styles.impactLabel}>Expected Impact:</Text>
          <Text style={[
            styles.impactValue,
            { color: dispute.impact.includes('+') ? '#10b981' : '#64748b' }
          ]}>
            {dispute.impact}
          </Text>
        </View>
      </View>

      {dispute.status === 'investigating' && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Investigation in progress...</Text>
            <Text style={styles.progressDays}>
              {Math.ceil((new Date(dispute.expectedResolution).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '65%' }]} />
          </View>
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Disputes</Text>
          <Text style={styles.subtitle}>
            Track and manage your credit repair disputes
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="shield-checkmark" size={24} color="#667eea" />
              <Text style={styles.statNumber}>{activeDisputes.length}</Text>
              <Text style={styles.statLabel}>Active Disputes</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="trophy" size={24} color="#10b981" />
              <Text style={styles.statNumber}>
                {disputes.filter(d => d.status === 'resolved').length}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="trending-up" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>73%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </Card>
        </View>

        {/* New Dispute Button */}
        <View style={styles.actionSection}>
          <Button
            title="Start New Dispute"
            onPress={handleStartNewDispute}
            variant="primary"
            style={styles.newDisputeButton}
            icon={<Ionicons name="add" size={16} color="#ffffff" />}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText
            ]}>
              Active ({activeDisputes.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText
            ]}>
              Completed ({completedDisputes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disputes List */}
        <View style={styles.disputesList}>
          {activeTab === 'active' ? (
            activeDisputes.length > 0 ? (
              activeDisputes.map(renderDispute)
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="shield-outline" size={48} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No Active Disputes</Text>
                  <Text style={styles.emptyDescription}>
                    Start your first dispute to begin improving your credit score
                  </Text>
                  <Button
                    title="Start Dispute"
                    onPress={handleStartNewDispute}
                    variant="outline"
                    style={styles.emptyButton}
                  />
                </View>
              </Card>
            )
          ) : (
            completedDisputes.length > 0 ? (
              completedDisputes.map(renderDispute)
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No Completed Disputes</Text>
                  <Text style={styles.emptyDescription}>
                    Your completed disputes will appear here
                  </Text>
                </View>
              </Card>
            )
          )}
        </View>

        {/* Tips Section */}
        <Card style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>💡 Dispute Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>
              • Our AI selects the most effective strategy for each item
            </Text>
            <Text style={styles.tip}>
              • Disputes typically take 30-45 days to complete
            </Text>
            <Text style={styles.tip}>
              • We automatically follow up and escalate when needed
            </Text>
            <Text style={styles.tip}>
              • Success rates are highest with Method of Verification
            </Text>
          </View>
        </Card>
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
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
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
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  newDisputeButton: {
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#667eea',
  },
  disputesList: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  disputeCard: {
    padding: 16,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeInfo: {
    flex: 1,
    marginRight: 12,
  },
  disputeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  disputeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bureauBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bureauText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  strategyText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  disputeStatus: {
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  disputeDates: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  dateValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  disputeImpact: {
    alignItems: 'flex-end',
  },
  impactLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  progressDays: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  emptyCard: {
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  tipsCard: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default DisputesScreen;

