/**
 * Fynvita Goodwill Letters Screen
 * Request late payment removal
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const LETTER_TEMPLATES = [
  {
    id: "first_late",
    title: "First-Time Late Payment",
    description: "For your first late payment with a creditor",
    successRate: 65,
  },
  {
    id: "hardship",
    title: "Financial Hardship",
    description: "When you experienced temporary financial difficulty",
    successRate: 55,
  },
  {
    id: "loyal_customer",
    title: "Loyal Customer Appeal",
    description: "For long-standing accounts with good history",
    successRate: 60,
  },
  {
    id: "medical",
    title: "Medical Emergency",
    description: "When medical issues caused the late payment",
    successRate: 70,
  },
  {
    id: "general",
    title: "General Goodwill",
    description: "Standard request for payment removal",
    successRate: 45,
  },
];

export default function GoodwillScreen() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creditorName, setCreditorName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

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
          <Text style={styles.title}>Goodwill Letters</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="mail" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.infoTitle}>Request Late Payment Removal</Text>
          <Text style={styles.infoText}>
            A goodwill letter asks creditors to remove late payments from your
            credit report as a gesture of goodwill.
          </Text>
        </Card>

        {/* Success Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Success</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Be polite and take responsibility
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>Explain your situation briefly</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Highlight your positive payment history
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.tipText}>
              Send via certified mail with return receipt
            </Text>
          </View>
        </Card>

        {/* Template Selection */}
        <Text style={styles.sectionTitle}>Choose a Template</Text>
        {LETTER_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            onPress={() => setSelectedTemplate(template.id)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.templateCard,
                selectedTemplate === template.id && styles.templateCardSelected,
              ]}
            >
              <View style={styles.templateRow}>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateDescription}>
                    {template.description}
                  </Text>
                </View>
                <View style={styles.templateRight}>
                  <View
                    style={[
                      styles.successBadge,
                      {
                        backgroundColor:
                          template.successRate >= 60 ? "#D1FAE5" : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.successText,
                        {
                          color:
                            template.successRate >= 60 ? "#059669" : "#D97706",
                        },
                      ]}
                    >
                      {template.successRate}%
                    </Text>
                  </View>
                  <Text style={styles.successLabel}>success</Text>
                </View>
              </View>
              {selectedTemplate === template.id && (
                <View style={styles.radioSelected}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}

        {/* Form Fields */}
        {selectedTemplate && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Letter Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Creditor Name</Text>
              <TextInput
                style={styles.input}
                value={creditorName}
                onChangeText={setCreditorName}
                placeholder="e.g., Chase Bank"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Account Number (last 4 digits)
              </Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="XXXX"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => router.push("/dispute/new")}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Letter</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Warning */}
        <Card style={styles.warningCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.warningText}>
            Goodwill letters are requests, not demands. Creditors are not
            obligated to remove accurate information. Success depends on your
            relationship with the creditor and circumstances.
          </Text>
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
  infoCard: { alignItems: "center", marginBottom: theme.spacing.md },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  tipsCard: { marginBottom: theme.spacing.lg },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tipText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  templateCard: { marginBottom: theme.spacing.sm, position: "relative" },
  templateCardSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  templateRow: { flexDirection: "row", alignItems: "center" },
  templateInfo: { flex: 1 },
  templateTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  templateDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  templateRight: { alignItems: "center" },
  successBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  successText: { fontSize: 14, fontWeight: "600" },
  successLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioSelected: { position: "absolute", top: -8, right: -8 },
  formCard: { marginTop: theme.spacing.md },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: theme.spacing.lg,
    backgroundColor: "#EFF6FF",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 18,
  },
});
