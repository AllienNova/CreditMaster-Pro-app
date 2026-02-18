/**
 * Financial Chat Mobile Screen
 * Phase 6.3.1: Enhanced mobile chat with session management and Phase 6.1 backend integration
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { useAuth } from "../../hooks/useAuth";
import DOMPurify from "isomorphic-dompurify";

// Types matching Phase 6.1 backend
interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedActions?: Array<{ label: string; action: string }>;
    educationalContent?: Array<{ title: string; summary: string }>;
  };
}

interface ChatSession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  metadata?: {
    messageCount?: number;
  };
}

export default function FinancialChatScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const MAX_CHARS = 2000;

  // ZERO TRUST: Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // Load user sessions
  const loadSessions = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/chat/financial/sessions?limit=20", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to load sessions");

      const data = await response.json();
      setSessions(data.sessions || []);

      // Auto-select first session or create new one
      if (data.sessions && data.sessions.length > 0) {
        setCurrentSessionId(data.sessions[0].id);
        loadMessages(data.sessions[0].id);
      } else {
        createNewSession();
      }
    } catch (err) {
      if (__DEV__) console.error("Failed to load sessions:", err);
      setError("Failed to load chat sessions");
    }
  }, [user]);

  // Load messages for session
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/chat/financial/sessions/${sessionId}/messages?limit=100`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to load messages");

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      if (__DEV__) console.error("Failed to load messages:", err);
      setError("Failed to load messages");
    }
  }, []);

  // Create new session
  const createNewSession = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/chat/financial/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New Chat" }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const data = await response.json();
      const newSession = data.session;

      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      if (__DEV__) console.error("Failed to create session:", err);
      setError("Failed to create new session");
    }
  }, [user]);

  // Send message with XSS protection
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || loading || !currentSessionId) return;

    // ZERO TRUST: Sanitize input
    const sanitizedContent = DOMPurify.sanitize(inputText.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    if (!sanitizedContent || sanitizedContent.length === 0) {
      Alert.alert("Error", "Message cannot be empty");
      return;
    }

    if (sanitizedContent.length > MAX_CHARS) {
      Alert.alert("Error", `Message too long (max ${MAX_CHARS} characters)`);
      return;
    }

    // Optimistic UI update
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSessionId,
      role: "user",
      content: sanitizedContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputText("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: sanitizedContent,
          streaming: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message");
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: currentSessionId,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        metadata: data.metadata,
      };

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        assistantMessage,
      ]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      Alert.alert("Error", err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  }, [inputText, loading, currentSessionId]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentSessionId) {
      await loadMessages(currentSessionId);
    }
    setRefreshing(false);
  }, [currentSessionId, loadMessages]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    const isSystem = item.role === "system";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!isUser && !isSystem && (
          <View style={styles.aiAvatar}>
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : isSystem
                ? styles.systemBubble
                : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.aiTimestamp,
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          {/* Suggested Actions */}
          {item.metadata?.suggestedActions &&
            item.metadata.suggestedActions.length > 0 && (
              <View style={styles.suggestedActionsContainer}>
                <Text style={styles.suggestedActionsTitle}>
                  Suggested Actions:
                </Text>
                {item.metadata.suggestedActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestedActionButton}
                  >
                    <Text style={styles.suggestedActionText}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {/* Educational Content */}
          {item.metadata?.educationalContent &&
            item.metadata.educationalContent.length > 0 && (
              <View style={styles.educationalContentContainer}>
                <Text style={styles.educationalContentTitle}>Learn More:</Text>
                {item.metadata.educationalContent.map((content, index) => (
                  <View key={index} style={styles.educationalContentCard}>
                    <Text style={styles.educationalContentCardTitle}>
                      {content.title}
                    </Text>
                    <Text style={styles.educationalContentCardSummary}>
                      {content.summary}
                    </Text>
                  </View>
                ))}
              </View>
            )}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  };

  const quickActions = [
    { id: "1", text: "Check Portfolio", icon: "briefcase" },
    { id: "2", text: "Budget Analysis", icon: "calculator" },
    { id: "3", text: "Debt Strategy", icon: "trending-down" },
    { id: "4", text: "Investment Ideas", icon: "trending-up" },
  ];

  const charCount = inputText.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isAtLimit = charCount >= MAX_CHARS;

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons
            name="lock-closed"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.centerText}>Please log in to access chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                No messages yet. Start a conversation!
              </Text>
            </View>
          }
        />

        {/* Quick Actions */}
        {messages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionButton}
                  onPress={() => setInputText(action.text)}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.quickActionText}>{action.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, isAtLimit && styles.inputError]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your finances..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={MAX_CHARS}
            />
            <Text
              style={[
                styles.charCounter,
                isAtLimit
                  ? styles.charCounterError
                  : isNearLimit
                    ? styles.charCounterWarning
                    : {},
              ]}
            >
              {charCount}/{MAX_CHARS}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  centerText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  keyboardView: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#DC2626",
  },
  messagesList: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: theme.spacing.sm,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: "#FEF3C7",
    borderRadius: theme.borderRadius.md,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: "#E0E7FF",
    textAlign: "right",
  },
  aiTimestamp: {
    color: theme.colors.textSecondary,
  },
  suggestedActionsContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  suggestedActionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  suggestedActionButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  suggestedActionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  educationalContentContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  educationalContentTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  educationalContentCard: {
    backgroundColor: "#F9FAFB",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  educationalContentCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  educationalContentCardSummary: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quickActionsContainer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickActionText: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "flex-end",
  },
  inputWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    maxHeight: 100,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  charCounter: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  charCounterWarning: {
    color: "#F59E0B",
  },
  charCounterError: {
    color: "#DC2626",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
});
