/**
 * Opportunity Radar Component
 * 
 * Mobile UI for the Instrument Selection Engine (ISE).
 * Displays ranked instruments with scores, regimes, and PCTT readiness.
 * Includes controls for tier mode, active set size, and auto-rotation.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Switch,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type AssetClass = 'stocks' | 'crypto' | 'forex' | 'futures' | 'options';
type UserTier = 'beginner' | 'pro' | 'quant';
type RegimeType = 'trend_up' | 'trend_down' | 'range' | 'transition';

interface RankedInstrument {
  rank: number;
  symbol: string;
  name?: string;
  assetClass: AssetClass;
  score: number;
  
  // Component scores
  liquidity: number;
  pcttFitness: number;
  opportunity: number;
  realizedEdge: number;
  
  // PCTT context
  regime: RegimeType;
  qScore: number;
  event: string;
  isPCTTReady: boolean;
  
  // Status
  isActive: boolean;
  inCooldown: boolean;
}

interface AgentThought {
  id: string;
  message: string;
  timestamp: Date;
  type: 'promotion' | 'demotion' | 'observation' | 'warning';
}

export interface OpportunityRadarProps {
  rankings?: RankedInstrument[];
  activeSymbols?: string[];
  agentThoughts?: AgentThought[];
  tier?: UserTier;
  maxActiveSize?: number;
  autoRotateEnabled?: boolean;
  onTierChange?: (tier: UserTier) => void;
  onMaxActiveSizeChange?: (size: number) => void;
  onAutoRotateToggle?: (enabled: boolean) => void;
  onSymbolPress?: (symbol: string) => void;
  onForceAdd?: (symbol: string) => void;
  onForceRemove?: (symbol: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0a0a0f',
  card: '#1a1a24',
  cardBorder: '#2a2a3a',
  text: '#ffffff',
  textSecondary: '#8a8a9a',
  green: '#26a69a',
  red: '#ef5350',
  orange: '#ff9800',
  blue: '#4a90d9',
  purple: '#9c27b0',
  
  // Tier colors
  beginner: '#4caf50',
  pro: '#2196f3',
  quant: '#9c27b0',
  
  // Regime colors
  trend_up: '#26a69a',
  trend_down: '#ef5350',
  range: '#ff9800',
  transition: '#9e9e9e',
};

const ASSET_CLASS_ICONS: Record<AssetClass, string> = {
  stocks: '📈',
  crypto: '₿',
  forex: '💱',
  futures: '📊',
  options: '⚡',
};

const TIER_DESCRIPTIONS: Record<UserTier, string> = {
  beginner: 'Safe • Liquid • Simple',
  pro: 'PCTT-First • Quality Setups',
  quant: 'Adaptive • Performance-Based',
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockRankings(count: number = 20): RankedInstrument[] {
  const symbols = [
    { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stocks' as AssetClass },
    { symbol: 'MSFT', name: 'Microsoft', assetClass: 'stocks' as AssetClass },
    { symbol: 'GOOGL', name: 'Alphabet', assetClass: 'stocks' as AssetClass },
    { symbol: 'BTCUSDT', name: 'Bitcoin', assetClass: 'crypto' as AssetClass },
    { symbol: 'ETHUSDT', name: 'Ethereum', assetClass: 'crypto' as AssetClass },
    { symbol: 'EURUSD', name: 'EUR/USD', assetClass: 'forex' as AssetClass },
    { symbol: 'GBPUSD', name: 'GBP/USD', assetClass: 'forex' as AssetClass },
    { symbol: 'ES', name: 'E-mini S&P', assetClass: 'futures' as AssetClass },
    { symbol: 'NQ', name: 'E-mini Nasdaq', assetClass: 'futures' as AssetClass },
    { symbol: 'SPY', name: 'SPY Options', assetClass: 'options' as AssetClass },
    { symbol: 'TSLA', name: 'Tesla', assetClass: 'stocks' as AssetClass },
    { symbol: 'NVDA', name: 'NVIDIA', assetClass: 'stocks' as AssetClass },
    { symbol: 'SOLUSDT', name: 'Solana', assetClass: 'crypto' as AssetClass },
    { symbol: 'USDJPY', name: 'USD/JPY', assetClass: 'forex' as AssetClass },
    { symbol: 'CL', name: 'Crude Oil', assetClass: 'futures' as AssetClass },
  ];
  
  const regimes: RegimeType[] = ['trend_up', 'trend_down', 'range', 'transition'];
  const events = ['idle', 'break_up', 'freeze_up', 'retest_up', 'entry_long'];
  
  return symbols.slice(0, count).map((item, idx) => {
    const score = Math.max(0.3, 1 - idx * 0.04 + (Math.random() - 0.5) * 0.1);
    const qScore = 0.5 + Math.random() * 0.4;
    const regime = regimes[Math.floor(Math.random() * regimes.length)];
    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
      rank: idx + 1,
      symbol: item.symbol,
      name: item.name,
      assetClass: item.assetClass,
      score,
      liquidity: 0.6 + Math.random() * 0.4,
      pcttFitness: 0.4 + Math.random() * 0.5,
      opportunity: 0.3 + Math.random() * 0.6,
      realizedEdge: 0.4 + Math.random() * 0.4,
      regime,
      qScore,
      event,
      isPCTTReady: event !== 'idle' && qScore >= 0.6,
      isActive: idx < 3,
      inCooldown: idx >= 10 && Math.random() > 0.7,
    };
  });
}

function generateMockThoughts(): AgentThought[] {
  return [
    {
      id: '1',
      message: '📈 BTCUSDT promoted → trend up, Q:78%, strong momentum',
      timestamp: new Date(),
      type: 'promotion',
    },
    {
      id: '2',
      message: '🎯 Top opportunity: NVDA (trend up, Score:85%)',
      timestamp: new Date(Date.now() - 60000),
      type: 'observation',
    },
    {
      id: '3',
      message: '📉 EURUSD demoted → dropped from top 5, low Q-score',
      timestamp: new Date(Date.now() - 120000),
      type: 'demotion',
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OpportunityRadar({
  rankings: propRankings,
  activeSymbols: propActiveSymbols,
  agentThoughts: propAgentThoughts,
  tier: propTier = 'pro',
  maxActiveSize: propMaxActiveSize = 5,
  autoRotateEnabled: propAutoRotateEnabled = true,
  onTierChange,
  onMaxActiveSizeChange,
  onAutoRotateToggle,
  onSymbolPress,
  onForceAdd,
  onForceRemove,
}: OpportunityRadarProps) {
  // State
  const [selectedTab, setSelectedTab] = useState<AssetClass | 'all'>('all');
  const [tier, setTier] = useState<UserTier>(propTier);
  const [maxActiveSize, setMaxActiveSize] = useState(propMaxActiveSize);
  const [autoRotate, setAutoRotate] = useState(propAutoRotateEnabled);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  
  // Use props or mock data
  const rankings = useMemo(() => 
    propRankings ?? generateMockRankings(),
    [propRankings]
  );
  
  const agentThoughts = useMemo(() =>
    propAgentThoughts ?? generateMockThoughts(),
    [propAgentThoughts]
  );
  
  // Filter by asset class
  const filteredRankings = useMemo(() => {
    if (selectedTab === 'all') return rankings;
    return rankings.filter(r => r.assetClass === selectedTab);
  }, [rankings, selectedTab]);
  
  // Handlers
  const handleTierChange = useCallback((newTier: UserTier) => {
    setTier(newTier);
    onTierChange?.(newTier);
  }, [onTierChange]);
  
  const handleMaxSizeChange = useCallback((size: number) => {
    setMaxActiveSize(size);
    onMaxActiveSizeChange?.(size);
  }, [onMaxActiveSizeChange]);
  
  const handleAutoRotateToggle = useCallback((enabled: boolean) => {
    setAutoRotate(enabled);
    onAutoRotateToggle?.(enabled);
  }, [onAutoRotateToggle]);
  
  const getRegimeColor = (regime: RegimeType) => COLORS[regime] || COLORS.textSecondary;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return COLORS.green;
    if (score >= 0.5) return COLORS.orange;
    return COLORS.red;
  };
  
  // Render instrument row
  const renderInstrument = ({ item }: { item: RankedInstrument }) => {
    const isExpanded = expandedSymbol === item.symbol;
    
    return (
      <TouchableOpacity
        style={[
          styles.instrumentRow,
          item.isActive && styles.instrumentActive,
          item.inCooldown && styles.instrumentCooldown,
        ]}
        onPress={() => {
          setExpandedSymbol(isExpanded ? null : item.symbol);
          onSymbolPress?.(item.symbol);
        }}
        activeOpacity={0.7}
      >
        {/* Main Row */}
        <View style={styles.instrumentMain}>
          {/* Rank */}
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{item.rank}</Text>
          </View>
          
          {/* Symbol & Name */}
          <View style={styles.symbolContainer}>
            <View style={styles.symbolRow}>
              <Text style={styles.assetIcon}>
                {ASSET_CLASS_ICONS[item.assetClass]}
              </Text>
              <Text style={styles.symbolText}>{item.symbol}</Text>
              {item.isActive && (
                <View style={styles.activeDot} />
              )}
              {item.isPCTTReady && (
                <Text style={styles.readyBadge}>PCTT</Text>
              )}
            </View>
            <Text style={styles.nameText}>{item.name}</Text>
          </View>
          
          {/* Score */}
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
              {(item.score * 100).toFixed(0)}%
            </Text>
            <View style={[
              styles.regimeBadge,
              { backgroundColor: getRegimeColor(item.regime) + '30' }
            ]}>
              <Text style={[styles.regimeText, { color: getRegimeColor(item.regime) }]}>
                {item.regime.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            {/* Score Breakdown */}
            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Liquidity</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${item.liquidity * 100}%`, backgroundColor: COLORS.blue }]} />
                </View>
                <Text style={styles.scoreValue}>{(item.liquidity * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>PCTT Fit</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${item.pcttFitness * 100}%`, backgroundColor: COLORS.green }]} />
                </View>
                <Text style={styles.scoreValue}>{(item.pcttFitness * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Opportunity</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${item.opportunity * 100}%`, backgroundColor: COLORS.orange }]} />
                </View>
                <Text style={styles.scoreValue}>{(item.opportunity * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Edge</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${item.realizedEdge * 100}%`, backgroundColor: COLORS.purple }]} />
                </View>
                <Text style={styles.scoreValue}>{(item.realizedEdge * 100).toFixed(0)}%</Text>
              </View>
            </View>
            
            {/* PCTT Info */}
            <View style={styles.pcttInfo}>
              <Text style={styles.pcttLabel}>Q-Score: {(item.qScore * 100).toFixed(0)}%</Text>
              <Text style={styles.pcttLabel}>Event: {item.event.replace('_', ' ')}</Text>
            </View>
            
            {/* Actions */}
            <View style={styles.actionButtons}>
              {item.isActive ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => onForceRemove?.(item.symbol)}
                >
                  <Text style={styles.actionButtonText}>Remove from Active</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.addButton]}
                  onPress={() => onForceAdd?.(item.symbol)}
                  disabled={item.inCooldown}
                >
                  <Text style={styles.actionButtonText}>
                    {item.inCooldown ? 'In Cooldown' : 'Add to Active'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.chartButton]}
                onPress={() => onSymbolPress?.(item.symbol)}
              >
                <Text style={styles.actionButtonText}>Open Chart</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Opportunity Radar</Text>
        <Text style={styles.subtitle}>
          {filteredRankings.length} instruments ranked
        </Text>
      </View>
      
      {/* Agent Thoughts Ticker */}
      <View style={styles.thoughtsContainer}>
        <Text style={styles.thoughtsTitle}>🤖 Agent Thoughts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {agentThoughts.map(thought => (
            <View key={thought.id} style={styles.thoughtCard}>
              <Text style={styles.thoughtText}>{thought.message}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsCard}>
        {/* Tier Selector */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Mode</Text>
          <View style={styles.tierButtons}>
            {(['beginner', 'pro', 'quant'] as UserTier[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tierButton,
                  tier === t && { backgroundColor: COLORS[t] + '30', borderColor: COLORS[t] }
                ]}
                onPress={() => handleTierChange(t)}
              >
                <Text style={[
                  styles.tierButtonText,
                  tier === t && { color: COLORS[t] }
                ]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.tierDescription}>{TIER_DESCRIPTIONS[tier]}</Text>
        
        {/* Active Set Size */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Active Set</Text>
          <View style={styles.sizeButtons}>
            {[1, 3, 5, 10].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeButton,
                  maxActiveSize === size && styles.sizeButtonActive
                ]}
                onPress={() => handleMaxSizeChange(size)}
              >
                <Text style={[
                  styles.sizeButtonText,
                  maxActiveSize === size && styles.sizeButtonTextActive
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Auto-Rotate Toggle */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Auto-Rotate</Text>
          <Switch
            value={autoRotate}
            onValueChange={handleAutoRotateToggle}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.green + '50' }}
            thumbColor={autoRotate ? COLORS.green : COLORS.textSecondary}
          />
        </View>
      </View>
      
      {/* Asset Class Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        {(['stocks', 'crypto', 'forex', 'futures', 'options'] as AssetClass[]).map(ac => (
          <TouchableOpacity
            key={ac}
            style={[styles.tab, selectedTab === ac && styles.tabActive]}
            onPress={() => setSelectedTab(ac)}
          >
            <Text style={[styles.tabText, selectedTab === ac && styles.tabTextActive]}>
              {ASSET_CLASS_ICONS[ac]} {ac.charAt(0).toUpperCase() + ac.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Rankings List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredRankings}
          renderItem={renderInstrument}
          keyExtractor={item => item.symbol}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Active</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.readyBadge}>PCTT</Text>
          <Text style={styles.legendText}>Ready</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.textSecondary }]} />
          <Text style={styles.legendText}>Cooldown</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  // Agent Thoughts
  thoughtsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  thoughtsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  thoughtCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  thoughtText: {
    fontSize: 12,
    color: COLORS.text,
  },
  
  // Controls
  controlsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  tierButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tierButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tierButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tierDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  sizeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    width: 36,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeButtonActive: {
    backgroundColor: COLORS.blue + '30',
    borderColor: COLORS.blue,
  },
  sizeButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sizeButtonTextActive: {
    color: COLORS.blue,
    fontWeight: '600',
  },
  
  // Tabs
  tabsContainer: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: COLORS.card,
  },
  tabActive: {
    backgroundColor: COLORS.blue + '30',
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.blue,
    fontWeight: '600',
  },
  
  // List
  listContainer: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  
  // Instrument Row
  instrumentRow: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  instrumentActive: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
  },
  instrumentCooldown: {
    opacity: 0.6,
  },
  instrumentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  symbolContainer: {
    flex: 1,
    marginLeft: 8,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginLeft: 6,
  },
  readyBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.green,
    backgroundColor: COLORS.green + '20',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 6,
  },
  nameText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  regimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  regimeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Expanded Details
  expandedDetails: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  scoreBreakdown: {
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    width: 80,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
    marginHorizontal: 8,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreValue: {
    width: 35,
    fontSize: 11,
    color: COLORS.text,
    textAlign: 'right',
  },
  pcttInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pcttLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: COLORS.green + '20',
  },
  removeButton: {
    backgroundColor: COLORS.red + '20',
  },
  chartButton: {
    backgroundColor: COLORS.blue + '20',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 16,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default OpportunityRadar;
