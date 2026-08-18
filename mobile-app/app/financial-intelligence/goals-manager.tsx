/**
 * Goals Manager Mobile Screen - Phase 2.6.3
 * Financial goals tracking with CRUD operations and auto-save
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width } = Dimensions.get("window");

// TypeScript Interfaces
interface Goal {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "active" | "completed" | "paused";
  category: string;
  autoSaveEnabled: boolean;
  autoSaveAmount?: number;
  progress: {
    percentage: number;
    velocity: number;
    estimatedCompletion: string;
  };
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  amount: number;
  date: string;
  achieved: boolean;
  description: string;
}

interface AutoSaveConfig {
  enabled: boolean;
  amount: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  recommendedAmount?: number;
}

/**
 * GoalCards Component
 * Swipeable cards for each financial goal with progress visualization
 */
interface GoalCardsProps {
  goals: Goal[];
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleAutoSave: (goalId: string, enabled: boolean) => void;
}

const GoalCards: React.FC<GoalCardsProps> = ({
  goals,
  onEditGoal,
  onDeleteGoal,
  onToggleAutoSave,
}) => {
  const [swipedGoalId, setSwipedGoalId] = useState<string | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent":
        return theme.colors.error;
      case "high":
        return theme.colors.warning;
      case "medium":
        return theme.colors.primary;
      case "low":
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "paused":
        return "pause-circle";
      default:
        return "play-circle";
    }
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteGoal(goal.id),
        },
      ],
    );
  };

  if (goals.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Ionicons
          name="flag-outline"
          size={64}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>No Goals Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first financial goal to get started!
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.goalsContainer}>
      {goals.map((goal) => (
        <Card key={goal.id} style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <Ionicons
                name={getStatusIcon(goal.status)}
                size={24}
                color={getPriorityColor(goal.priority)}
              />
              <View style={styles.goalTitleContainer}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalCategory}>{goal.category}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onEditGoal(goal)}>
              <Ionicons
                name="create-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {goal.description && (
            <Text style={styles.goalDescription}>{goal.description}</Text>
          )}

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.amountRow}>
              <Text style={styles.currentAmount}>
                {formatCurrency(goal.currentAmount)}
              </Text>
              <Text style={styles.targetAmount}>
                of {formatCurrency(goal.targetAmount)}
              </Text>
            </View>

            <ProgressBars progress={goal.progress.percentage} />

            <View style={styles.progressMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metaText}>
                  Due {formatDate(goal.targetDate)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name="trending-up"
                  size={16}
                  color={theme.colors.success}
                />
                <Text style={styles.metaText}>
                  {goal.progress.velocity.toFixed(1)}% velocity
                </Text>
              </View>
            </View>
          </View>

          {/* Milestones */}
          {goal.milestones && goal.milestones.length > 0 && (
            <View style={styles.milestonesSection}>
              <Text style={styles.milestonesTitle}>Milestones</Text>
              <View style={styles.milestonesTimeline}>
                {goal.milestones.slice(0, 3).map((milestone, index) => (
                  <View key={milestone.id} style={styles.milestoneItem}>
                    <View
                      style={[
                        styles.milestoneMarker,
                        milestone.achieved && styles.milestoneAchieved,
                      ]}
                    >
                      {milestone.achieved && (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      )}
                    </View>
                    <View style={styles.milestoneContent}>
                      <Text style={styles.milestoneAmount}>
                        {formatCurrency(milestone.amount)}
                      </Text>
                      <Text style={styles.milestoneDate}>
                        {formatDate(milestone.date)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Auto-Save Toggle */}
          <View style={styles.autoSaveSection}>
            <View style={styles.autoSaveInfo}>
              <Ionicons name="sync" size={20} color={theme.colors.primary} />
              <Text style={styles.autoSaveText}>
                Auto-Save {goal.autoSaveEnabled ? "ON" : "OFF"}
                {goal.autoSaveAmount &&
                  ` - ${formatCurrency(goal.autoSaveAmount)}/month`}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.autoSaveToggle,
                goal.autoSaveEnabled && styles.autoSaveToggleActive,
              ]}
              onPress={() => onToggleAutoSave(goal.id, !goal.autoSaveEnabled)}
            >
              <View
                style={[
                  styles.autoSaveThumb,
                  goal.autoSaveEnabled && styles.autoSaveThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.goalActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEditGoal(goal)}
            >
              <Ionicons name="create" size={18} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(goal)}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
              <Text
                style={[styles.actionButtonText, { color: theme.colors.error }]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </View>
  );
};

/**
 * ProgressBars Component
 * Animated progress indicators with smooth animations
 */
interface ProgressBarsProps {
  progress: number;
}

const ProgressBars: React.FC<ProgressBarsProps> = ({ progress }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return theme.colors.success;
    if (progress >= 75) return theme.colors.primary;
    if (progress >= 50) return theme.colors.warning;
    return theme.colors.error;
  };

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: widthInterpolation,
              backgroundColor: getProgressColor(progress),
            },
          ]}
        />
      </View>
      <Text style={styles.progressPercentage}>{progress.toFixed(1)}%</Text>
    </View>
  );
};

/**
 * AddGoalSheet Component
 * Bottom sheet modal for creating/editing goals
 */
interface AddGoalSheetProps {
  visible: boolean;
  goal?: Goal | null;
  onClose: () => void;
  onSave: (goalData: Partial<Goal>) => void;
}

const AddGoalSheet: React.FC<AddGoalSheetProps> = ({
  visible,
  goal,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setDescription(goal.description);
      setTargetAmount(goal.targetAmount.toString());
      setCurrentAmount(goal.currentAmount.toString());
      setTargetDate(goal.targetDate);
      setPriority(goal.priority);
      setCategory(goal.category);
    } else {
      // Reset form
      setName("");
      setDescription("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
      setPriority("medium");
      setCategory("");
    }
  }, [goal, visible]);

  const handleSave = () => {
    if (!name || !targetAmount || !targetDate) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const goalData: Partial<Goal> = {
      name,
      description,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      targetDate,
      priority,
      category,
    };

    onSave(goalData);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {goal ? "Edit Goal" : "Create New Goal"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Goal Name *</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View
                style={[
                  styles.formGroup,
                  { flex: 1, marginRight: theme.spacing.sm },
                ]}
              >
                <Text style={styles.formLabel}>Target Amount *</Text>
                <TextInput
                  style={styles.formInput}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  placeholder="$10,000"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View
                style={[
                  styles.formGroup,
                  { flex: 1, marginLeft: theme.spacing.sm },
                ]}
              >
                <Text style={styles.formLabel}>Current Amount</Text>
                <TextInput
                  style={styles.formInput}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  placeholder="$0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Date *</Text>
              <TextInput
                style={styles.formInput}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <TextInput
                style={styles.formInput}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g., Savings, Debt, Investment"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityButtons}>
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && styles.priorityButtonActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        priority === p && styles.priorityButtonTextActive,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={onClose}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveModalButton}
              onPress={handleSave}
            >
              <Text style={styles.saveModalButtonText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * AutoSaveConfig Component
 * Toggle and configuration for automatic savings
 */
interface AutoSaveConfigProps {
  goalId: string;
  config: AutoSaveConfig;
  onUpdate: (goalId: string, config: AutoSaveConfig) => void;
}

const AutoSaveConfigComponent: React.FC<AutoSaveConfigProps> = ({
  goalId,
  config,
  onUpdate,
}) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleToggle = () => {
    const newConfig = { ...localConfig, enabled: !localConfig.enabled };
    setLocalConfig(newConfig);
    onUpdate(goalId, newConfig);
  };

  const handleAmountChange = (amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    const newConfig = { ...localConfig, amount: newAmount };
    setLocalConfig(newConfig);
  };

  const handleFrequencyChange = (
    frequency: "daily" | "weekly" | "biweekly" | "monthly",
  ) => {
    const newConfig = { ...localConfig, frequency };
    setLocalConfig(newConfig);
    onUpdate(goalId, newConfig);
  };

  const handleSave = () => {
    onUpdate(goalId, localConfig);
    Alert.alert("Success", "Auto-save settings updated!");
  };

  return (
    <Card style={styles.autoSaveConfigCard}>
      <View style={styles.autoSaveConfigHeader}>
        <Text style={styles.cardTitle}>Auto-Save Configuration</Text>
        <TouchableOpacity
          style={[
            styles.autoSaveToggle,
            localConfig.enabled && styles.autoSaveToggleActive,
          ]}
          onPress={handleToggle}
        >
          <View
            style={[
              styles.autoSaveThumb,
              localConfig.enabled && styles.autoSaveThumbActive,
            ]}
          />
        </TouchableOpacity>
      </View>

      {localConfig.enabled && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Amount per Transfer</Text>
            <TextInput
              style={styles.formInput}
              value={localConfig.amount.toString()}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="$100"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {localConfig.recommendedAmount && (
              <Text style={styles.recommendedText}>
                Recommended: ${localConfig.recommendedAmount.toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Frequency</Text>
            <View style={styles.frequencyButtons}>
              {(["daily", "weekly", "biweekly", "monthly"] as const).map(
                (freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      localConfig.frequency === freq &&
                        styles.frequencyButtonActive,
                    ]}
                    onPress={() => handleFrequencyChange(freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        localConfig.frequency === freq &&
                          styles.frequencyButtonTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveConfigButton}
            onPress={handleSave}
          >
            <Text style={styles.saveConfigButtonText}>Save Configuration</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
};

/**
 * Main GoalsManagerScreen Component
 */
export default function GoalsManagerScreen() {
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const response = await fetch("/api/financial/goals");

      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching goals:", error);
      // NOT Alert.alert. This runs on mount, and a native alert is a separate
      // window: it covers the screen, offers only "OK" with no retry, and
      // stays up until dismissed — it also masked every route measured after
      // it in the device sweep. The action alerts elsewhere in this file are
      // fine; those follow something the user did.
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGoals();
  }, [fetchGoals]);

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setModalVisible(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setModalVisible(true);
  };

  const handleSaveGoal = async (goalData: Partial<Goal>) => {
    try {
      const url = editingGoal
        ? `/api/financial/goals/${editingGoal.id}`
        : "/api/financial/goals";

      const method = editingGoal ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalData),
      });

      if (response.ok) {
        Alert.alert(
          "Success",
          `Goal ${editingGoal ? "updated" : "created"} successfully!`,
        );
        fetchGoals();
      } else {
        Alert.alert("Error", "Failed to save goal. Please try again.");
      }
    } catch (error) {
      if (__DEV__) console.error("Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal. Please try again.");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/financial/goals/${goalId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        Alert.alert("Success", "Goal deleted successfully!");
        fetchGoals();
      } else {
        Alert.alert("Error", "Failed to delete goal. Please try again.");
      }
    } catch (error) {
      if (__DEV__) console.error("Error deleting goal:", error);
      Alert.alert("Error", "Failed to delete goal. Please try again.");
    }
  };

  const handleToggleAutoSave = async (goalId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/financial/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSaveEnabled: enabled }),
      });

      if (response.ok) {
        fetchGoals();
      }
    } catch (error) {
      if (__DEV__) console.error("Error toggling auto-save:", error);
    }
  };

    if (loadFailed && goals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            We could not load your goals.
          </Text>
          <TouchableOpacity onPress={fetchGoals}>
            <Text style={styles.retryTextState}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

if (loading && goals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        <GoalCards
          goals={goals}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
          onToggleAutoSave={handleToggleAutoSave}
        />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleCreateGoal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <AddGoalSheet
        visible={modalVisible}
        goal={editingGoal}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveGoal}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  retryTextState: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  // Empty state
  emptyCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.xl * 2,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  // GoalCards styles
  goalsContainer: {
    padding: theme.spacing.md,
  },
  goalCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  goalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  goalTitleContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  goalCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  goalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  // Progress section
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: theme.spacing.sm,
  },
  currentAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  targetAmount: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  // ProgressBars styles
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    minWidth: 50,
    textAlign: "right",
  },
  // Milestones
  milestonesSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  milestonesTimeline: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  milestoneItem: {
    alignItems: "center",
    flex: 1,
  },
  milestoneMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  milestoneAchieved: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  milestoneContent: {
    alignItems: "center",
  },
  milestoneAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  milestoneDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  // Auto-save section
  autoSaveSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  autoSaveInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  autoSaveText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  autoSaveToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    padding: 2,
    justifyContent: "center",
  },
  autoSaveToggleActive: {
    backgroundColor: theme.colors.success,
  },
  autoSaveThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  autoSaveThumbActive: {
    alignSelf: "flex-end",
  },
  // Goal actions
  goalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  // FAB
  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalFooter: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Form styles
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  formTextArea: {
    height: 80,
    paddingTop: theme.spacing.md,
    textAlignVertical: "top",
  },
  formRow: {
    flexDirection: "row",
  },
  recommendedText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
  },
  // Priority buttons
  priorityButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  priorityButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priorityButtonText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  priorityButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  // Frequency buttons
  frequencyButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  frequencyButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  frequencyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  frequencyButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  // Modal buttons
  cancelModalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  // AutoSaveConfig styles
  autoSaveConfigCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  autoSaveConfigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  saveConfigButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  saveConfigButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
