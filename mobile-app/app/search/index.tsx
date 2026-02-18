import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../constants/theme";

type SearchResult = {
  id: string;
  type: "dispute" | "report" | "loan" | "document" | "setting";
  title: string;
  subtitle: string;
  route: string;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [recentSearches] = useState([
    "Experian dispute",
    "PSLF program",
    "Credit score",
  ]);

  const quickActions = [
    {
      icon: "add-circle",
      label: "New Dispute",
      route: "/dispute/create",
      color: "#FF9800",
    },
    {
      icon: "cloud-upload",
      label: "Upload Report",
      route: "/reports/upload",
      color: "#0066CC",
    },
    {
      icon: "calculator",
      label: "Loan Calculator",
      route: "/loans/calculator",
      color: "#00AA00",
    },
    {
      icon: "chatbubbles",
      label: "AI Assistant",
      route: "/chat",
      color: "#9C27B0",
    },
  ];

  const allItems: SearchResult[] = [
    {
      id: "1",
      type: "dispute",
      title: "Medical Collection Dispute",
      subtitle: "Pending • Experian",
      route: "/dispute/1",
    },
    {
      id: "2",
      type: "dispute",
      title: "Late Payment Dispute",
      subtitle: "Resolved • Equifax",
      route: "/dispute/2",
    },
    {
      id: "3",
      type: "report",
      title: "Experian Credit Report",
      subtitle: "Jan 15, 2024 • Score: 720",
      route: "/reports/1",
    },
    {
      id: "4",
      type: "report",
      title: "TransUnion Credit Report",
      subtitle: "Jan 10, 2024 • Score: 705",
      route: "/reports/2",
    },
    {
      id: "5",
      type: "loan",
      title: "Federal Student Loan",
      subtitle: "$45,000 • 6.8% APR",
      route: "/loans/1",
    },
    {
      id: "6",
      type: "document",
      title: "Dispute Letter - Collections",
      subtitle: "Generated Dec 20, 2023",
      route: "/document/1",
    },
    {
      id: "7",
      type: "setting",
      title: "Notification Settings",
      subtitle: "Manage your alerts",
      route: "/profile/settings",
    },
  ];

  const filteredResults =
    query.length > 0
      ? allItems.filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(query.toLowerCase()),
        )
      : [];

  const getIcon = (type: string) => {
    switch (type) {
      case "dispute":
        return { name: "document-text", color: "#FF9800" };
      case "report":
        return { name: "analytics", color: "#0066CC" };
      case "loan":
        return { name: "school", color: "#00AA00" };
      case "document":
        return { name: "folder", color: "#9C27B0" };
      case "setting":
        return { name: "settings", color: "#607D8B" };
      default:
        return { name: "ellipse", color: "#666" };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search disputes, reports, loans..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholderTextColor="#999"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {query.length === 0 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActions}>
                {quickActions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickAction}
                    onPress={() => router.push(action.route as any)}
                  >
                    <View
                      style={[
                        styles.quickActionIcon,
                        { backgroundColor: `${action.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={24}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              {recentSearches.map((search, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentItem}
                  onPress={() => setQuery(search)}
                >
                  <Ionicons name="time-outline" size={18} color="#999" />
                  <Text style={styles.recentText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.results}>
            {filteredResults.length > 0 ? (
              filteredResults.map((result) => {
                const icon = getIcon(result.type);
                return (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.resultItem}
                    onPress={() => router.push(result.route as any)}
                  >
                    <View
                      style={[
                        styles.resultIcon,
                        { backgroundColor: `${icon.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={icon.name as any}
                        size={20}
                        color={icon.color}
                      />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={styles.resultTitle}>{result.title}</Text>
                      <Text style={styles.resultSubtitle}>
                        {result.subtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>No results found</Text>
                <Text style={styles.noResultsHint}>Try different keywords</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    gap: 12,
  },
  backButton: { padding: 4 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickAction: {
    width: "47%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: { fontSize: 14, fontWeight: "500", color: "#333" },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  recentText: { fontSize: 16, color: "#333" },
  results: { padding: 16 },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  resultSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  noResults: { alignItems: "center", paddingVertical: 48 },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  noResultsHint: { fontSize: 14, color: "#999", marginTop: 4 },
});
