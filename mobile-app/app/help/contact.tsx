/**
 * Fynvita Contact Support Screen
 * Submit support tickets and contact options
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

const CONTACT_OPTIONS = [
  {
    icon: "mail",
    title: "Email",
    subtitle: "support@creditpro.com",
    action: "mailto:support@creditpro.com",
  },
  {
    icon: "call",
    title: "Phone",
    subtitle: "1-800-123-4567",
    action: "tel:+18001234567",
  },
  {
    icon: "chatbox",
    title: "Live Chat",
    subtitle: "Available 24/7",
    action: "chat",
  },
];

const TOPICS = [
  "General Inquiry",
  "Credit Score",
  "Disputes",
  "Billing",
  "Technical Issue",
  "Account",
  "Other",
];

export default function ContactSupportScreen() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactOption = (action: string) => {
    if (action === "chat") {
      router.push("/financial-intelligence/chat");
    } else {
      openExternalUrl(action);
    }
  };

  const handleSubmit = () => {
    if (!selectedTopic || !subject || !message) {
      Alert.alert(
        "Missing Information",
        "Please fill in all fields before submitting.",
      );
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        "Ticket Submitted",
        "We've received your support request. Our team will respond within 24 hours.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }, 1500);
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
          <Text style={styles.title}>Contact Support</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Quick Contact */}
        <Text style={styles.sectionTitle}>Quick Contact</Text>
        <View style={styles.contactOptions}>
          {CONTACT_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactOption}
              onPress={() => handleContactOption(option.action)}
            >
              <View style={styles.contactIcon}>
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.contactTitle}>{option.title}</Text>
              <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Ticket */}
        <Text style={styles.sectionTitle}>Submit a Ticket</Text>
        <Card style={styles.formCard}>
          {/* Topic */}
          <Text style={styles.fieldLabel}>Topic</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.topicsScroll}
          >
            {TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.topicChip,
                  selectedTopic === topic && styles.topicChipActive,
                ]}
                onPress={() => setSelectedTopic(topic)}
              >
                <Text
                  style={[
                    styles.topicText,
                    selectedTopic === topic && styles.topicTextActive,
                  ]}
                >
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Subject */}
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of your issue"
            placeholderTextColor={theme.colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
          />

          {/* Message */}
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Response Time */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Average Response Time</Text>
              <Text style={styles.infoSubtitle}>
                We typically respond within 2-4 hours during business hours
              </Text>
            </View>
          </View>
        </Card>

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
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  contactOptions: { flexDirection: "row", marginBottom: theme.spacing.md },
  contactOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    alignItems: "center",
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  contactTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  contactSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  formCard: { marginBottom: theme.spacing.md },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: theme.spacing.md,
  },
  topicsScroll: { marginBottom: 8 },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    marginRight: 8,
  },
  topicChipActive: { backgroundColor: theme.colors.primary },
  topicText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  topicTextActive: { color: "#fff" },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: { height: 120 },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  submitButtonDisabled: { backgroundColor: theme.colors.textSecondary },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  infoCard: {},
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoContent: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  infoSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
});
