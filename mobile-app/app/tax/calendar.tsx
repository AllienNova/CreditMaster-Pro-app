/**
 * Tax Calendar Screen - Mobile App
 *
 * Visual calendar showing tax deadlines, reminders, and recommended actions.
 * Helps users stay on track with their tax obligations and optimization opportunities.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTaxStore } from "../../src/store/taxStore";

type EventType = "deadline" | "reminder" | "recommendation" | "payment";
type PriorityType = "critical" | "high" | "medium" | "low";

const eventTypeColors: Record<EventType, { bg: string; text: string }> = {
  deadline: { bg: "#FEE2E2", text: "#991B1B" },
  payment: { bg: "#F3E8FF", text: "#6B21A8" },
  reminder: { bg: "#DBEAFE", text: "#1E40AF" },
  recommendation: { bg: "#FEF3C7", text: "#92400E" },
};

const priorityColors: Record<PriorityType, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#3B82F6",
  low: "#9CA3AF",
};

// Mock data for tax events (would come from API in production)
const TAX_EVENTS_2026 = [
  {
    id: "1",
    title: "Q4 Estimated Tax Payment Due",
    description: "Final quarterly estimated tax payment for the prior year",
    date: "2026-01-15",
    type: "payment" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Estimated Taxes",
  },
  {
    id: "2",
    title: "Tax Filing Deadline",
    description: "Federal and state income tax returns due (or extension)",
    date: "2026-04-15",
    type: "deadline" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Filing",
  },
  {
    id: "3",
    title: "Q1 Estimated Tax Payment Due",
    description: "First quarterly estimated tax payment for current year",
    date: "2026-04-15",
    type: "payment" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Estimated Taxes",
  },
  {
    id: "4",
    title: "Q2 Estimated Tax Payment Due",
    description: "Second quarterly estimated tax payment",
    date: "2026-06-15",
    type: "payment" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Estimated Taxes",
  },
  {
    id: "5",
    title: "Q3 Estimated Tax Payment Due",
    description: "Third quarterly estimated tax payment",
    date: "2026-09-15",
    type: "payment" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Estimated Taxes",
  },
  {
    id: "6",
    title: "Extended Tax Return Deadline",
    description: "Final deadline for extended returns",
    date: "2026-10-15",
    type: "deadline" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Filing",
  },
  {
    id: "7",
    title: "Review 401(k) Contributions",
    description: "Ensure you're on track to max out 401(k) by year-end",
    date: "2026-11-01",
    type: "reminder" as EventType,
    priority: "high" as PriorityType,
    isCompleted: false,
    category: "Retirement",
  },
  {
    id: "8",
    title: "Tax-Loss Harvesting Review",
    description: "Review portfolio for tax-loss harvesting opportunities",
    date: "2026-11-15",
    type: "recommendation" as EventType,
    priority: "high" as PriorityType,
    isCompleted: false,
    category: "Investment",
  },
  {
    id: "9",
    title: "Charitable Giving Deadline",
    description: "Make charitable donations for current year deduction",
    date: "2026-12-31",
    type: "deadline" as EventType,
    priority: "medium" as PriorityType,
    isCompleted: false,
    category: "Deductions",
  },
  {
    id: "10",
    title: "401(k) Contribution Deadline",
    description: "Last day to make 401(k) contributions for the year",
    date: "2026-12-31",
    type: "deadline" as EventType,
    priority: "critical" as PriorityType,
    isCompleted: false,
    category: "Retirement",
  },
];

export default function TaxCalendarScreen() {
  const {
    events: storeEvents,
    isLoadingCalendar,
    fetchEvents,
    completeEvent,
    createReminder,
  } = useTaxStore();

  const [events, setEvents] = useState(TAX_EVENTS_2026);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">(
    "upcoming",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    date: "",
    category: "Custom",
  });

  const categories = useMemo(() => {
    const cats = new Set(events.map((e) => e.category));
    return ["all", ...Array.from(cats)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        if (filter === "upcoming" && event.isCompleted) return false;
        if (filter === "completed" && !event.isCompleted) return false;
        if (categoryFilter !== "all" && event.category !== categoryFilter)
          return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, filter, categoryFilter]);

  const upcomingCritical = useMemo(() => {
    const now = new Date();
    return events
      .filter(
        (e) =>
          !e.isCompleted &&
          e.priority === "critical" &&
          new Date(e.date) >= now,
      )
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )[0];
  }, [events]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diff < 0) return "Past";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `${diff} days`;
    if (diff <= 30) return `${Math.ceil(diff / 7)} weeks`;
    return `${Math.ceil(diff / 30)} months`;
  };

  const handleToggleComplete = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, isCompleted: !e.isCompleted } : e,
      ),
    );
  };

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.date) {
      Alert.alert("Error", "Please enter a title and date");
      return;
    }

    const newEvent = {
      id: `custom-${Date.now()}`,
      title: newReminder.title,
      description: newReminder.description || "Custom reminder",
      date: newReminder.date,
      type: "reminder" as EventType,
      priority: "medium" as PriorityType,
      isCompleted: false,
      category: newReminder.category || "Custom",
    };

    setEvents((prev) => [...prev, newEvent]);
    setShowAddModal(false);
    setNewReminder({
      title: "",
      description: "",
      date: "",
      category: "Custom",
    });
    Alert.alert("Success", "Reminder added");
  };

  const handleSetNotification = (event: (typeof events)[0]) => {
    Alert.alert(
      "Set Reminder",
      `Would you like to be reminded about "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "1 day before",
          onPress: () => Alert.alert("Reminder set for 1 day before"),
        },
        {
          text: "1 week before",
          onPress: () => Alert.alert("Reminder set for 1 week before"),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Critical Deadline Alert */}
        {upcomingCritical && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Upcoming Critical Deadline</Text>
              <Text style={styles.alertText}>
                {upcomingCritical.title} — {formatDate(upcomingCritical.date)} (
                {getDaysUntil(upcomingCritical.date)})
              </Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterButtons}>
              {(["all", "upcoming", "completed"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[
                    styles.filterButton,
                    filter === f && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filter === f && styles.filterButtonTextActive,
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(cat)}
                style={[
                  styles.categoryChip,
                  categoryFilter === cat && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryFilter === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat === "all" ? "All Categories" : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Events List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tax Events & Deadlines</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No events match your filters</Text>
            </View>
          ) : (
            filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  event.isCompleted && styles.eventCardCompleted,
                ]}
                onPress={() => handleSetNotification(event)}
              >
                <View
                  style={[
                    styles.eventPriorityBar,
                    { backgroundColor: priorityColors[event.priority] },
                  ]}
                />

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleComplete(event.id)}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      event.isCompleted && styles.checkboxChecked,
                    ]}
                  >
                    {event.isCompleted && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.eventContent}>
                  <View style={styles.eventTags}>
                    <View
                      style={[
                        styles.eventTypeBadge,
                        { backgroundColor: eventTypeColors[event.type].bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventTypeBadgeText,
                          { color: eventTypeColors[event.type].text },
                        ]}
                      >
                        {event.type}
                      </Text>
                    </View>
                    <Text style={styles.eventCategory}>{event.category}</Text>
                  </View>

                  <Text
                    style={[
                      styles.eventTitle,
                      event.isCompleted && styles.eventTitleCompleted,
                    ]}
                  >
                    {event.title}
                  </Text>
                  <Text style={styles.eventDescription}>
                    {event.description}
                  </Text>
                </View>

                <View style={styles.eventDate}>
                  <Text style={styles.eventDateText}>
                    {formatDate(event.date)}
                  </Text>
                  <Text
                    style={[
                      styles.eventDaysUntil,
                      getDaysUntil(event.date) === "Today" &&
                        styles.eventDaysUntilToday,
                    ]}
                  >
                    {getDaysUntil(event.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Legend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Types</Text>
          <View style={styles.legendGrid}>
            {(
              Object.entries(eventTypeColors) as [
                EventType,
                { bg: string; text: string },
              ][]
            ).map(([type, colors]) => (
              <View key={type} style={styles.legendItem}>
                <View
                  style={[styles.legendBadge, { backgroundColor: colors.bg }]}
                >
                  <Text
                    style={[styles.legendBadgeText, { color: colors.text }]}
                  >
                    {type}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <LinearGradient
            colors={["#F59E0B", "#EA580C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Never Miss a Deadline</Text>
            <Text style={styles.ctaSubtitle}>
              Get reminders via push notification before important tax dates
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Set Up Reminders</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={newReminder.title}
                onChangeText={(v) =>
                  setNewReminder({ ...newReminder, title: v })
                }
                placeholder="e.g., Review estimated taxes"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={newReminder.description}
                onChangeText={(v) =>
                  setNewReminder({ ...newReminder, description: v })
                }
                placeholder="Optional description"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newReminder.date}
                onChangeText={(v) =>
                  setNewReminder({ ...newReminder, date: v })
                }
                placeholder="2026-04-15"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddReminder}
              >
                <Text style={styles.modalButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEE2E2",
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991B1B",
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    color: "#78716C",
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  filterButtonActive: {
    backgroundColor: "#F59E0B",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#78716C",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#78716C",
  },
  categoryChipTextActive: {
    color: "#92400E",
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },
  addText: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#78716C",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardCompleted: {
    opacity: 0.6,
  },
  eventPriorityBar: {
    width: 4,
    alignSelf: "stretch",
  },
  checkbox: {
    padding: 16,
    paddingRight: 8,
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  eventContent: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 8,
  },
  eventTags: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  eventTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  eventCategory: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1917",
    marginBottom: 4,
  },
  eventTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  eventDescription: {
    fontSize: 13,
    color: "#78716C",
  },
  eventDate: {
    padding: 16,
    paddingLeft: 8,
    alignItems: "flex-end",
  },
  eventDateText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1917",
  },
  eventDaysUntil: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  eventDaysUntilToday: {
    color: "#DC2626",
    fontWeight: "bold",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  legendBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  ctaCard: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  ctaGradient: {
    padding: 24,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1917",
  },
  modalClose: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1C1917",
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
