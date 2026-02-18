/**
 * Fynvita Sentiment Analysis Screen
 * News sentiment, social media, analyst ratings, insider activity
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import {
  DonutChart,
  BarChart,
  LineChart,
} from "../../../src/components/charts";

interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface AnalystRating {
  firm: string;
  rating: string;
  target: number;
  date: string;
}

interface InsiderTrade {
  name: string;
  title: string;
  type: "buy" | "sell";
  shares: number;
  value: string;
  date: string;
}

const OVERALL_SENTIMENT = {
  score: 72,
  label: "Bullish",
  change: "+5",
};

const SENTIMENT_BREAKDOWN = [
  { name: "Bullish", value: 58, color: theme.colors.success },
  { name: "Neutral", value: 28, color: theme.colors.warning },
  { name: "Bearish", value: 14, color: theme.colors.error },
];

const SENTIMENT_TREND = [
  { value: 65, label: "Mon" },
  { value: 68, label: "Tue" },
  { value: 62, label: "Wed" },
  { value: 70, label: "Thu" },
  { value: 72, label: "Fri" },
];

const SOCIAL_SENTIMENT = [
  { platform: "Twitter/X", sentiment: 68, mentions: "12.4K", trend: "up" },
  { platform: "Reddit", sentiment: 75, mentions: "3.2K", trend: "up" },
  { platform: "StockTwits", sentiment: 71, mentions: "5.8K", trend: "neutral" },
  { platform: "News", sentiment: 65, mentions: "847", trend: "down" },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    title: "Apple Vision Pro Sales Exceed Expectations in Q1",
    source: "Bloomberg",
    time: "2h ago",
    sentiment: "positive",
  },
  {
    title: "iPhone 16 Production Ramping Up Ahead of Schedule",
    source: "Reuters",
    time: "4h ago",
    sentiment: "positive",
  },
  {
    title: "Apple Faces New Antitrust Probe in EU",
    source: "Financial Times",
    time: "6h ago",
    sentiment: "negative",
  },
  {
    title: "Services Revenue Growth Continues Strong Momentum",
    source: "CNBC",
    time: "8h ago",
    sentiment: "positive",
  },
  {
    title: "Analysts Debate Apple's AI Strategy",
    source: "WSJ",
    time: "12h ago",
    sentiment: "neutral",
  },
];

const ANALYST_RATINGS: AnalystRating[] = [
  { firm: "Morgan Stanley", rating: "Overweight", target: 210, date: "Jan 5" },
  { firm: "Goldman Sachs", rating: "Buy", target: 205, date: "Jan 3" },
  { firm: "JP Morgan", rating: "Neutral", target: 185, date: "Dec 28" },
  { firm: "Bank of America", rating: "Buy", target: 220, date: "Dec 22" },
  { firm: "Citi", rating: "Neutral", target: 180, date: "Dec 20" },
];

const ANALYST_CONSENSUS = {
  buy: 32,
  hold: 8,
  sell: 2,
  avgTarget: 198.5,
  highTarget: 250,
  lowTarget: 155,
};

const INSIDER_TRADES: InsiderTrade[] = [
  {
    name: "Tim Cook",
    title: "CEO",
    type: "sell",
    shares: 50000,
    value: "$9.2M",
    date: "Jan 2",
  },
  {
    name: "Luca Maestri",
    title: "CFO",
    type: "sell",
    shares: 25000,
    value: "$4.5M",
    date: "Dec 28",
  },
  {
    name: "Jeff Williams",
    title: "COO",
    type: "buy",
    shares: 10000,
    value: "$1.8M",
    date: "Dec 15",
  },
];

const INSTITUTIONAL_ACTIVITY = {
  increased: 245,
  decreased: 189,
  newPositions: 42,
  soldOut: 28,
  netChange: "+$2.4B",
};

export default function SentimentAnalysisScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "news", label: "News" },
    { id: "analysts", label: "Analysts" },
    { id: "insiders", label: "Insiders" },
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return theme.colors.success;
      case "negative":
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "trending-up";
      case "negative":
        return "trending-down";
      default:
        return "remove";
    }
  };

  const getRatingColor = (rating: string) => {
    if (
      rating.toLowerCase().includes("buy") ||
      rating.toLowerCase().includes("overweight")
    ) {
      return theme.colors.success;
    }
    if (
      rating.toLowerCase().includes("sell") ||
      rating.toLowerCase().includes("underweight")
    ) {
      return theme.colors.error;
    }
    return theme.colors.warning;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Sentiment Analysis</Text>
          <Text style={styles.symbol}>{symbol || "AAPL"}</Text>
        </View>

        {/* Overall Sentiment Score */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>Overall Sentiment</Text>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: theme.colors.success + "20" },
              ]}
            >
              <Ionicons
                name="trending-up"
                size={14}
                color={theme.colors.success}
              />
              <Text
                style={[styles.changeText, { color: theme.colors.success }]}
              >
                {OVERALL_SENTIMENT.change} pts
              </Text>
            </View>
          </View>
          <View style={styles.scoreMain}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{OVERALL_SENTIMENT.score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={[styles.scoreStatus, { color: theme.colors.success }]}>
              {OVERALL_SENTIMENT.label}
            </Text>
          </View>
          <View style={styles.sentimentBar}>
            <View
              style={[
                styles.sentimentSegment,
                { flex: 58, backgroundColor: theme.colors.success },
              ]}
            />
            <View
              style={[
                styles.sentimentSegment,
                { flex: 28, backgroundColor: theme.colors.warning },
              ]}
            />
            <View
              style={[
                styles.sentimentSegment,
                { flex: 14, backgroundColor: theme.colors.error },
              ]}
            />
          </View>
          <View style={styles.sentimentLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <Text style={styles.legendText}>Bullish 58%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.warning },
                ]}
              />
              <Text style={styles.legendText}>Neutral 28%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.error },
                ]}
              />
              <Text style={styles.legendText}>Bearish 14%</Text>
            </View>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Sentiment Trend */}
            <Card style={styles.trendCard}>
              <Text style={styles.sectionTitle}>Sentiment Trend (5 Days)</Text>
              <LineChart
                data={SENTIMENT_TREND}
                height={150}
                color={theme.colors.primary}
                showDots
                showLabels
              />
            </Card>

            {/* Social Media Sentiment */}
            <Card style={styles.socialCard}>
              <Text style={styles.sectionTitle}>Social Media Sentiment</Text>
              {SOCIAL_SENTIMENT.map((item, idx) => (
                <View key={idx} style={styles.socialRow}>
                  <View style={styles.socialPlatform}>
                    <Ionicons
                      name={
                        item.platform === "Twitter/X"
                          ? "logo-twitter"
                          : item.platform === "Reddit"
                            ? "logo-reddit"
                            : item.platform === "StockTwits"
                              ? "chatbubbles"
                              : "newspaper"
                      }
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.platformName}>{item.platform}</Text>
                  </View>
                  <View style={styles.socialMeta}>
                    <Text style={styles.mentions}>
                      {item.mentions} mentions
                    </Text>
                  </View>
                  <View style={styles.socialScore}>
                    <Text
                      style={[
                        styles.scoreNum,
                        {
                          color:
                            item.sentiment >= 70
                              ? theme.colors.success
                              : item.sentiment >= 50
                                ? theme.colors.warning
                                : theme.colors.error,
                        },
                      ]}
                    >
                      {item.sentiment}
                    </Text>
                    <Ionicons
                      name={
                        item.trend === "up"
                          ? "arrow-up"
                          : item.trend === "down"
                            ? "arrow-down"
                            : "remove"
                      }
                      size={14}
                      color={
                        item.trend === "up"
                          ? theme.colors.success
                          : item.trend === "down"
                            ? theme.colors.error
                            : theme.colors.textSecondary
                      }
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* News Tab */}
        {activeTab === "news" && (
          <Card style={styles.newsCard}>
            <Text style={styles.sectionTitle}>Recent News</Text>
            {NEWS_ITEMS.map((news, idx) => (
              <TouchableOpacity key={idx} style={styles.newsItem}>
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {news.title}
                  </Text>
                  <View style={styles.newsMeta}>
                    <Text style={styles.newsSource}>{news.source}</Text>
                    <Text style={styles.newsTime}>{news.time}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.sentimentBadge,
                    {
                      backgroundColor: getSentimentColor(news.sentiment) + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getSentimentIcon(
                        news.sentiment,
                      ) as keyof typeof Ionicons.glyphMap
                    }
                    size={16}
                    color={getSentimentColor(news.sentiment)}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Analysts Tab */}
        {activeTab === "analysts" && (
          <>
            {/* Consensus */}
            <Card style={styles.consensusCard}>
              <Text style={styles.sectionTitle}>Analyst Consensus</Text>
              <View style={styles.consensusBar}>
                <View
                  style={[
                    styles.consensusSegment,
                    {
                      flex: ANALYST_CONSENSUS.buy,
                      backgroundColor: theme.colors.success,
                    },
                  ]}
                >
                  <Text style={styles.consensusText}>
                    {ANALYST_CONSENSUS.buy} Buy
                  </Text>
                </View>
                <View
                  style={[
                    styles.consensusSegment,
                    {
                      flex: ANALYST_CONSENSUS.hold,
                      backgroundColor: theme.colors.warning,
                    },
                  ]}
                >
                  <Text style={styles.consensusText}>
                    {ANALYST_CONSENSUS.hold}
                  </Text>
                </View>
                <View
                  style={[
                    styles.consensusSegment,
                    {
                      flex: ANALYST_CONSENSUS.sell,
                      backgroundColor: theme.colors.error,
                    },
                  ]}
                >
                  <Text style={styles.consensusText}>
                    {ANALYST_CONSENSUS.sell}
                  </Text>
                </View>
              </View>
              <View style={styles.targetGrid}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetValue}>
                    ${ANALYST_CONSENSUS.avgTarget}
                  </Text>
                  <Text style={styles.targetLabel}>Avg Target</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text
                    style={[
                      styles.targetValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    ${ANALYST_CONSENSUS.highTarget}
                  </Text>
                  <Text style={styles.targetLabel}>High</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text
                    style={[styles.targetValue, { color: theme.colors.error }]}
                  >
                    ${ANALYST_CONSENSUS.lowTarget}
                  </Text>
                  <Text style={styles.targetLabel}>Low</Text>
                </View>
              </View>
            </Card>

            {/* Recent Ratings */}
            <Card style={styles.ratingsCard}>
              <Text style={styles.sectionTitle}>Recent Ratings</Text>
              {ANALYST_RATINGS.map((rating, idx) => (
                <View key={idx} style={styles.ratingRow}>
                  <View style={styles.ratingInfo}>
                    <Text style={styles.ratingFirm}>{rating.firm}</Text>
                    <Text style={styles.ratingDate}>{rating.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.ratingBadge,
                      { backgroundColor: getRatingColor(rating.rating) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        { color: getRatingColor(rating.rating) },
                      ]}
                    >
                      {rating.rating}
                    </Text>
                  </View>
                  <Text style={styles.ratingTarget}>${rating.target}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Insiders Tab */}
        {activeTab === "insiders" && (
          <>
            {/* Institutional Activity */}
            <Card style={styles.institutionalCard}>
              <Text style={styles.sectionTitle}>
                Institutional Activity (Q4)
              </Text>
              <View style={styles.instGrid}>
                <View style={styles.instItem}>
                  <Ionicons
                    name="arrow-up-circle"
                    size={24}
                    color={theme.colors.success}
                  />
                  <Text style={styles.instValue}>
                    {INSTITUTIONAL_ACTIVITY.increased}
                  </Text>
                  <Text style={styles.instLabel}>Increased</Text>
                </View>
                <View style={styles.instItem}>
                  <Ionicons
                    name="arrow-down-circle"
                    size={24}
                    color={theme.colors.error}
                  />
                  <Text style={styles.instValue}>
                    {INSTITUTIONAL_ACTIVITY.decreased}
                  </Text>
                  <Text style={styles.instLabel}>Decreased</Text>
                </View>
                <View style={styles.instItem}>
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.instValue}>
                    {INSTITUTIONAL_ACTIVITY.newPositions}
                  </Text>
                  <Text style={styles.instLabel}>New</Text>
                </View>
                <View style={styles.instItem}>
                  <Ionicons
                    name="remove-circle"
                    size={24}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.instValue}>
                    {INSTITUTIONAL_ACTIVITY.soldOut}
                  </Text>
                  <Text style={styles.instLabel}>Sold Out</Text>
                </View>
              </View>
              <View style={styles.netChange}>
                <Text style={styles.netChangeLabel}>
                  Net Institutional Flow:
                </Text>
                <Text
                  style={[
                    styles.netChangeValue,
                    { color: theme.colors.success },
                  ]}
                >
                  {INSTITUTIONAL_ACTIVITY.netChange}
                </Text>
              </View>
            </Card>

            {/* Insider Trades */}
            <Card style={styles.insiderCard}>
              <Text style={styles.sectionTitle}>Recent Insider Trades</Text>
              {INSIDER_TRADES.map((trade, idx) => (
                <View key={idx} style={styles.tradeRow}>
                  <View style={styles.tradeInfo}>
                    <Text style={styles.tradeName}>{trade.name}</Text>
                    <Text style={styles.tradeTitle}>{trade.title}</Text>
                  </View>
                  <View style={styles.tradeDetails}>
                    <View
                      style={[
                        styles.tradeBadge,
                        {
                          backgroundColor:
                            trade.type === "buy"
                              ? theme.colors.success + "20"
                              : theme.colors.error + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tradeType,
                          {
                            color:
                              trade.type === "buy"
                                ? theme.colors.success
                                : theme.colors.error,
                          },
                        ]}
                      >
                        {trade.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.tradeValue}>{trade.value}</Text>
                    <Text style={styles.tradeDate}>{trade.date}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  symbol: { fontSize: 16, fontWeight: "600", color: theme.colors.primary },

  scoreCard: { marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: { fontSize: 12, fontWeight: "600" },
  scoreMain: { alignItems: "center", marginBottom: 16 },
  scoreCircle: { flexDirection: "row", alignItems: "baseline" },
  scoreValue: { fontSize: 48, fontWeight: "700", color: theme.colors.success },
  scoreMax: { fontSize: 20, color: theme.colors.textSecondary },
  scoreStatus: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  sentimentBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  sentimentSegment: { height: "100%" },
  sentimentLegend: { flexDirection: "row", justifyContent: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },

  tabContainer: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  trendCard: { marginBottom: theme.spacing.md },
  socialCard: { marginBottom: theme.spacing.md },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  socialPlatform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 120,
  },
  platformName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  socialMeta: { flex: 1 },
  mentions: { fontSize: 12, color: theme.colors.textSecondary },
  socialScore: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreNum: { fontSize: 16, fontWeight: "700" },

  newsCard: { marginBottom: theme.spacing.md },
  newsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  newsContent: { flex: 1 },
  newsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    lineHeight: 20,
  },
  newsMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  newsSource: { fontSize: 12, fontWeight: "500", color: theme.colors.primary },
  newsTime: { fontSize: 12, color: theme.colors.textSecondary },
  sentimentBadge: { padding: 8, borderRadius: 8, marginLeft: 12 },

  consensusCard: { marginBottom: theme.spacing.md },
  consensusBar: {
    flexDirection: "row",
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  consensusSegment: { justifyContent: "center", alignItems: "center" },
  consensusText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  targetGrid: { flexDirection: "row", justifyContent: "space-around" },
  targetItem: { alignItems: "center" },
  targetValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  targetLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  ratingsCard: { marginBottom: theme.spacing.md },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  ratingInfo: { flex: 1 },
  ratingFirm: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  ratingDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  ratingText: { fontSize: 12, fontWeight: "600" },
  ratingTarget: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    width: 60,
    textAlign: "right",
  },

  institutionalCard: { marginBottom: theme.spacing.md },
  instGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  instItem: { alignItems: "center" },
  instValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  instLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  netChange: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  netChangeLabel: { fontSize: 14, color: theme.colors.textSecondary },
  netChangeValue: { fontSize: 18, fontWeight: "700" },

  insiderCard: { marginBottom: theme.spacing.md },
  tradeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tradeInfo: { flex: 1 },
  tradeName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  tradeTitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tradeDetails: { flexDirection: "row", alignItems: "center", gap: 10 },
  tradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tradeType: { fontSize: 11, fontWeight: "700" },
  tradeValue: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  tradeDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: 50,
    textAlign: "right",
  },
});
