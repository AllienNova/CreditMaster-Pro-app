/**
 * Fynvita Admin User Management Screen
 * View and manage users fetched from the API
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { api } from "../../src/services/api/client";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  subscriptions: { plan: string; status: string } | null;
}

interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_FILTERS = ["all", "active", "inactive", "suspended"] as const;

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchQuery) params.set("search", searchQuery);
      if (selectedFilter !== "all") params.set("status", selectedFilter);

      const response = await api.get<UsersResponse>(
        `/admin/users?${params.toString()}`,
      );

      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        throw new Error(response.error?.message || "Failed to fetch users");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedFilter]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "#22C55E";
      case "inactive":
        return "#F59E0B";
      case "suspended":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getPlanColor = (plan: string | undefined) => {
    switch (plan) {
      case "Enterprise":
        return "#8B5CF6";
      case "Premium":
        return theme.colors.primary;
      case "Basic":
        return "#3B82F6";
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderFooter = () => {
    if (!loading || users.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  if (error && users.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>User Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorState}>
          <Ionicons
            name="alert-circle"
            size={48}
            color="#EF4444"
          />
          <Text style={styles.errorTitle}>Failed to load users</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity onPress={fetchUsers}>
          <Ionicons name="refresh" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter === "all" ? "All Users" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            Page {page} of {totalPages || 1}
          </Text>
        </View>
      </View>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={renderFooter}
          renderItem={({ item }) => (
            <Card style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(item.full_name || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.full_name || "Unnamed user"}
                  </Text>
                  <Text style={styles.userEmail}>
                    {item.email || "No email"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${getStatusColor(item.status)}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {item.status || "unknown"}
                  </Text>
                </View>
              </View>
              <View style={styles.userDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color: getPlanColor(
                          item.subscriptions?.plan,
                        ),
                      },
                    ]}
                  >
                    {item.subscriptions?.plan || "Free"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Joined</Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons
                    name="eye"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons
                    name="mail"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionText}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="people"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.pageButton,
              page <= 1 && styles.pageButtonDisabled,
            ]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={page <= 1 ? theme.colors.textSecondary : theme.colors.primary}
            />
            <Text
              style={[
                styles.pageButtonText,
                page <= 1 && styles.pageButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            {page} / {totalPages || 1}
          </Text>
          <TouchableOpacity
            style={[
              styles.pageButton,
              page >= totalPages && styles.pageButtonDisabled,
            ]}
            onPress={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <Text
              style={[
                styles.pageButtonText,
                page >= totalPages && styles.pageButtonTextDisabled,
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                page >= totalPages
                  ? theme.colors.textSecondary
                  : theme.colors.primary
              }
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 8,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  filterTextActive: { color: "#fff" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  listContent: { padding: theme.spacing.lg, paddingTop: 0 },
  userCard: { marginBottom: theme.spacing.sm },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  userEmail: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  userDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  detailItem: { alignItems: "center" },
  detailLabel: { fontSize: 10, color: theme.colors.textSecondary },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: theme.spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: { fontSize: 13, color: theme.colors.primary, marginLeft: 4 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  pageButtonTextDisabled: { color: theme.colors.textSecondary },
  pageIndicator: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
