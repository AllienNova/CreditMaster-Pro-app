/**
 * Fynvita AI Dispute Assistant
 * Conversational dispute creation with document scanning
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface Message {
  id: string;
  type: "ai" | "user" | "system";
  content: string;
  options?: string[];
  timestamp: Date;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    type: "ai",
    content:
      "Hi! I'm your AI Dispute Assistant. I'll help you create a professional dispute letter. What type of item would you like to dispute?",
    options: [
      "Late Payment",
      "Collection Account",
      "Inquiry",
      "Account Error",
      "Identity Theft",
      "Other",
    ],
    timestamp: new Date(),
  },
];

const DISPUTE_TYPES = [
  {
    id: "late_payment",
    label: "Late Payment",
    icon: "time",
    description: "Dispute incorrect late payment marks",
  },
  {
    id: "collection",
    label: "Collection Account",
    icon: "alert-circle",
    description: "Challenge collection accounts",
  },
  {
    id: "inquiry",
    label: "Hard Inquiry",
    icon: "search",
    description: "Remove unauthorized inquiries",
  },
  {
    id: "account_error",
    label: "Account Error",
    icon: "warning",
    description: "Fix incorrect account information",
  },
  {
    id: "identity_theft",
    label: "Identity Theft",
    icon: "shield",
    description: "Report fraudulent accounts",
  },
];

export default function NewDisputeScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: option,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setSelectedType(option.toLowerCase().replace(" ", "_"));
    setStep(2);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `Got it! You want to dispute a ${option}. Which credit bureau is reporting this item?`,
        options: ["Experian", "Equifax", "TransUnion", "All Three"],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 500);
  };

  const handleBureauSelect = (bureau: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: bureau,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setStep(3);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "Please provide the creditor/company name and account number (if known). You can also upload a document or screenshot of the item.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 500);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    if (step === 3) {
      setStep(4);
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content:
            "What is the reason for your dispute? Be specific about why this item is inaccurate.",
          options: [
            "Not My Account",
            "Paid in Full",
            "Never Late",
            "Wrong Balance",
            "Wrong Date",
            "Other Reason",
          ],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 500);
    } else if (step === 4) {
      setStep(5);
      setTimeout(() => {
        const systemMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "system",
          content: "✅ Dispute letter generated! Review and submit below.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
      }, 1000);
    }
  };

  const handleReasonSelect = (reason: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: reason,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setStep(5);

    setTimeout(() => {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: "✅ Dispute letter generated! Review and submit below.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>AI Dispute Assistant</Text>
            <Text style={styles.subtitle}>Step {step} of 5</Text>
          </View>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, { width: `${(step / 5) * 100}%` }]}
          />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.type === "user" && styles.messageRowUser,
              ]}
            >
              {message.type === "ai" && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color="#8B5CF6" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.type === "user"
                    ? styles.userBubble
                    : message.type === "system"
                      ? styles.systemBubble
                      : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.type === "user" && styles.userMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {/* Options */}
          {messages[messages.length - 1]?.options && (
            <View style={styles.optionsContainer}>
              {messages[messages.length - 1].options!.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.optionButton}
                  onPress={() => {
                    if (step === 1) handleOptionSelect(option);
                    else if (step === 2) handleBureauSelect(option);
                    else if (step === 4) handleReasonSelect(option);
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Generated Letter Preview */}
          {step === 5 && (
            <Card style={styles.letterPreview}>
              <View style={styles.letterHeader}>
                <Ionicons
                  name="document-text"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.letterTitle}>Dispute Letter Ready</Text>
              </View>
              <Text style={styles.letterPreviewText}>
                Your personalized dispute letter has been generated using
                FCRA-compliant language...
              </Text>
              <View style={styles.letterActions}>
                <TouchableOpacity style={styles.previewButton}>
                  <Ionicons name="eye" size={18} color={theme.colors.primary} />
                  <Text style={styles.previewButtonText}>Preview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => router.push("/disputes")}
                >
                  <Text style={styles.submitButtonText}>Submit Dispute</Text>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Input Area */}
        {(step === 3 || step === 4) &&
          !messages[messages.length - 1]?.options && (
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons
                  name="camera"
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your response..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? "#fff" : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  headerCenter: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  helpButton: { padding: 4 },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: theme.spacing.lg },
  messageRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    alignItems: "flex-end",
  },
  messageRowUser: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: "#DCFCE7",
    alignSelf: "center",
    maxWidth: "90%",
  },
  messageText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  userMessageText: { color: "#fff" },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.sm,
    marginLeft: 40,
  },
  optionButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: { fontSize: 13, color: theme.colors.primary, fontWeight: "500" },
  letterPreview: { marginTop: theme.spacing.md, marginLeft: 40 },
  letterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  letterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 8,
  },
  letterPreviewText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  letterActions: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },
  previewButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
    marginLeft: 6,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginLeft: 8,
  },
  submitButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginRight: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  attachButton: { padding: 8, marginRight: 8 },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.border },
});
