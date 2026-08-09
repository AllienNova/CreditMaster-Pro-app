import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { useCoaching } from "../../src/hooks/useCoaching";
import api from "../../src/services/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  isError?: boolean;
  retryMessage?: string;
}

interface ChatApiResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  timestamp: string;
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: lightTheme.colors.textSecondary,
    marginHorizontal: 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hi! I'm your AI financial coach. I can help you with credit questions, budgeting advice, savings strategies, and personalized coaching sessions. What would you like to work on today?",
    timestamp: new Date(),
    suggestions: [
      "Start a coaching session",
      "Help me budget better",
      "Credit score tips",
      "Savings advice",
    ],
  },
];

const QUICK_PROMPTS = [
  "Start coaching session",
  "Help me budget",
  "Improve my credit",
  "Save more money",
];

export default function ChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Coaching integration
  const {
    activeSessions,
    currentSession,
    startSession,
    sendMessage: sendCoachingMessage,
  } = useCoaching();

  const getSessionId = (): string => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    return sessionIdRef.current;
  };

  const buildChatMessages = (conversationMessages: Message[]): Array<{ role: string; content: string }> => {
    return conversationMessages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const trimmed = text.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const chatMessages = buildChatMessages([...messages, userMessage]);
      const response = await api.post<ChatApiResponse>("/ai/chat", {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Fynvita's AI financial coach. Help users with credit scores, budgeting, savings strategies, debt management, and financial planning. Be concise, actionable, and encouraging.",
          },
          ...chatMessages,
        ],
        sessionId: getSessionId(),
      });

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.data.content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Couldn't get a response. Tap to retry.",
          timestamp: new Date(),
          isError: true,
          retryMessage: trimmed,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Couldn't get a response. Tap to retry.",
        timestamp: new Date(),
        isError: true,
        retryMessage: trimmed,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = (retryText: string, errorMessageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
    handleSendMessage(retryText);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={lightTheme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message) => {
          const isError = message.isError;
          const bubble = (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              {message.role === "assistant" && (
                <View style={styles.avatarContainer}>
                  <Ionicons
                    name={isError ? "alert-circle" : "sparkles"}
                    size={20}
                    color={isError ? lightTheme.colors.error ?? "#ef4444" : lightTheme.colors.primary}
                  />
                </View>
              )}
              <View
                style={[
                  styles.messageContent,
                  message.role === "user"
                    ? styles.userContent
                    : styles.assistantContent,
                  isError && styles.errorContent,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === "user" && styles.userText,
                    isError && styles.errorText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          );

          if (isError && message.retryMessage) {
            return (
              <TouchableOpacity
                key={message.id}
                activeOpacity={0.7}
                onPress={() => handleRetry(message.retryMessage!, message.id)}
              >
                {bubble}
              </TouchableOpacity>
            );
          }

          return bubble;
        })}
        {isTyping && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.avatarContainer}>
              <Ionicons
                name="sparkles"
                size={20}
                color={lightTheme.colors.primary}
              />
            </View>
            <View style={[styles.messageContent, styles.assistantContent]}>
              <TypingDots />
            </View>
          </View>
        )}
      </ScrollView>

      {messages.length === 1 && (
        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptButton}
              onPress={() => handleSendMessage(prompt)}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything about credit..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSendMessage(inputText)}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={
              inputText.trim() ? "#FFFFFF" : lightTheme.colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 48,
    backgroundColor: lightTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightTheme.colors.text,
  },
  onlineIndicator: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 4,
  },
  onlineText: { fontSize: 12, color: "#4CAF50" },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },
  messageBubble: { flexDirection: "row", marginBottom: 16 },
  userBubble: { justifyContent: "flex-end" },
  assistantBubble: { justifyContent: "flex-start" },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: lightTheme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  messageContent: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  userContent: {
    backgroundColor: lightTheme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: lightTheme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, color: lightTheme.colors.text, lineHeight: 22 },
  userText: { color: "#FFFFFF" },
  errorContent: {
    backgroundColor: (lightTheme.colors.error ?? "#ef4444") + "15",
    borderColor: (lightTheme.colors.error ?? "#ef4444") + "40",
    borderWidth: 1,
  },
  errorText: {
    color: lightTheme.colors.error ?? "#ef4444",
    fontStyle: "italic",
  },
  typingText: {
    fontSize: 15,
    color: lightTheme.colors.textSecondary,
    fontStyle: "italic",
  },
  quickPrompts: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 8 },
  promptButton: {
    backgroundColor: lightTheme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  promptText: { fontSize: 14, color: lightTheme.colors.primary },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: lightTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: lightTheme.colors.border },
});
