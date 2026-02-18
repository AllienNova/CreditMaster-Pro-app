import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../constants/theme";

const bureauColors = {
  experian: "#0066CC",
  equifax: "#CC0000",
  transunion: "#00AA00",
};

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "accounts",
  );

  const report = {
    id,
    bureau: "experian",
    score: 720,
    date: "2024-01-15",
    accounts: [
      {
        name: "Chase Freedom",
        type: "Credit Card",
        balance: 2500,
        limit: 10000,
        status: "Current",
        opened: "2019-03-15",
      },
      {
        name: "Bank of America",
        type: "Auto Loan",
        balance: 15000,
        limit: 25000,
        status: "Current",
        opened: "2021-06-01",
      },
      {
        name: "Capital One",
        type: "Credit Card",
        balance: 500,
        limit: 5000,
        status: "Current",
        opened: "2020-01-10",
      },
    ],
    negativeItems: [
      {
        creditor: "Medical Collections",
        amount: 450,
        date: "2022-08-15",
        type: "Collection",
      },
    ],
    inquiries: [
      { creditor: "Auto Dealer", date: "2024-01-10", type: "Hard" },
      { creditor: "Credit Card Company", date: "2023-11-20", type: "Hard" },
    ],
    publicRecords: [],
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const Section = ({ title, icon, count, children, sectionKey }: any) => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() =>
          setExpandedSection(expandedSection === sectionKey ? null : sectionKey)
        }
      >
        <View style={styles.sectionLeft}>
          <Ionicons name={icon} size={20} color={lightTheme.colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
        <Ionicons
          name={expandedSection === sectionKey ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>
      {expandedSection === sectionKey && (
        <View style={styles.sectionContent}>{children}</View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Report</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.scoreCard,
          {
            borderLeftColor:
              bureauColors[report.bureau as keyof typeof bureauColors],
          },
        ]}
      >
        <Text style={styles.bureauName}>
          {report.bureau.charAt(0).toUpperCase() + report.bureau.slice(1)}
        </Text>
        <Text style={styles.scoreValue}>{report.score}</Text>
        <Text style={styles.scoreLabel}>Credit Score</Text>
        <Text style={styles.reportDate}>Report Date: {report.date}</Text>
      </View>

      <Section
        title="Accounts"
        icon="card-outline"
        count={report.accounts.length}
        sectionKey="accounts"
      >
        {report.accounts.map((account, idx) => (
          <View key={idx} style={styles.accountItem}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text
                style={[
                  styles.accountStatus,
                  {
                    color: account.status === "Current" ? "#00AA00" : "#CC0000",
                  },
                ]}
              >
                {account.status}
              </Text>
            </View>
            <Text style={styles.accountType}>{account.type}</Text>
            <View style={styles.accountDetails}>
              <Text style={styles.detailText}>
                Balance: ${account.balance.toLocaleString()}
              </Text>
              <Text style={styles.detailText}>
                Limit: ${account.limit.toLocaleString()}
              </Text>
            </View>
            <View style={styles.utilizationBar}>
              <View
                style={[
                  styles.utilizationFill,
                  { width: `${(account.balance / account.limit) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </Section>

      <Section
        title="Negative Items"
        icon="warning-outline"
        count={report.negativeItems.length}
        sectionKey="negative"
      >
        {report.negativeItems.map((item, idx) => (
          <View key={idx} style={styles.negativeItem}>
            <View style={styles.negativeHeader}>
              <Text style={styles.negativeCreditor}>{item.creditor}</Text>
              <Text style={styles.negativeAmount}>${item.amount}</Text>
            </View>
            <Text style={styles.negativeType}>
              {item.type} • {item.date}
            </Text>
            <TouchableOpacity
              style={styles.disputeButton}
              onPress={() => router.push("/dispute/create")}
            >
              <Text style={styles.disputeButtonText}>Dispute This Item</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      <Section
        title="Inquiries"
        icon="search-outline"
        count={report.inquiries.length}
        sectionKey="inquiries"
      >
        {report.inquiries.map((inquiry, idx) => (
          <View key={idx} style={styles.inquiryItem}>
            <Text style={styles.inquiryCreditor}>{inquiry.creditor}</Text>
            <Text style={styles.inquiryDate}>
              {inquiry.date} • {inquiry.type} Inquiry
            </Text>
          </View>
        ))}
      </Section>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/reports/comparison")}
        >
          <Ionicons name="git-compare-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Compare Bureaus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push("/dispute/create")}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={lightTheme.colors.primary}
          />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Start Dispute
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  scoreCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: "center",
  },
  bureauName: {
    fontSize: 14,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
  },
  scoreLabel: { fontSize: 14, color: "#666" },
  reportDate: { fontSize: 12, color: "#999", marginTop: 8 },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  badge: {
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  accountItem: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 12,
  },
  accountHeader: { flexDirection: "row", justifyContent: "space-between" },
  accountName: { fontSize: 16, fontWeight: "600" },
  accountStatus: { fontSize: 12, fontWeight: "600" },
  accountType: { fontSize: 12, color: "#666", marginTop: 2 },
  accountDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailText: { fontSize: 12, color: "#666" },
  utilizationBar: {
    height: 4,
    backgroundColor: "#eee",
    borderRadius: 2,
    marginTop: 8,
  },
  utilizationFill: {
    height: "100%",
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 2,
  },
  negativeItem: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 12,
  },
  negativeHeader: { flexDirection: "row", justifyContent: "space-between" },
  negativeCreditor: { fontSize: 16, fontWeight: "600" },
  negativeAmount: { fontSize: 16, fontWeight: "600", color: "#CC0000" },
  negativeType: { fontSize: 12, color: "#666", marginTop: 4 },
  disputeButton: {
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  disputeButtonText: { color: "#E65100", fontWeight: "600" },
  inquiryItem: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 12,
  },
  inquiryCreditor: { fontSize: 14, fontWeight: "600" },
  inquiryDate: { fontSize: 12, color: "#666", marginTop: 2 },
  actions: { padding: 16, gap: 12 },
  actionButton: {
    flexDirection: "row",
    backgroundColor: lightTheme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: lightTheme.colors.primary,
  },
  secondaryButtonText: { color: lightTheme.colors.primary },
});
