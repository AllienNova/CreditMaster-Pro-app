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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme } from "../../src/constants/theme";
import { useCoaching } from "../../src/hooks/useCoaching";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
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

  // Coaching integration
  const {
    activeSessions,
    currentSession,
    startSession,
    sendMessage: sendCoachingMessage,
  } = useCoaching();

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const responses: Record<string, string> = {
      "How can I improve my score?":
        "Great question! Here are the top ways to improve your credit score:\n\n1. **Pay bills on time** - Payment history is 35% of your score\n2. **Reduce credit utilization** - Keep it below 30%, ideally under 10%\n3. **Don't close old accounts** - Length of credit history matters\n4. **Limit hard inquiries** - Only apply for credit when needed\n5. **Dispute errors** - Check your reports for inaccuracies\n\nWould you like me to analyze your specific situation?",
      "Explain my credit utilization":
        "Credit utilization is the percentage of your available credit that you're using. For example, if you have a $10,000 credit limit and a $3,000 balance, your utilization is 30%.\n\n**Your current utilization:** 28%\n\n**Recommendations:**\n- Aim for under 30% (you're close!)\n- Ideal is under 10%\n- Pay down balances before statement closes\n- Consider requesting credit limit increases",
      "Help me dispute an item":
        "I'd be happy to help you dispute an item! Let me guide you through the process:\n\n1. **Identify the item** - Which account or item do you want to dispute?\n2. **Choose the reason** - Common reasons include:\n   - Not my account\n   - Incorrect balance\n   - Wrong payment status\n   - Account should be removed\n\n3. **Select bureaus** - Which bureaus are reporting this?\n\nWould you like me to start a dispute wizard for you?",
      "What affects my score most?":
        "Your credit score is calculated using these factors:\n\n📊 **Payment History (35%)**\nMost important! Late payments hurt significantly.\n\n💳 **Credit Utilization (30%)**\nHow much of your available credit you're using.\n\n📅 **Length of History (15%)**\nOlder accounts help your score.\n\n🔍 **Credit Mix (10%)**\nHaving different types of credit.\n\n📝 **New Credit (10%)**\nRecent applications and inquiries.\n\nBased on your profile, focusing on utilization would have the biggest impact!",
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        responses[text] ||
        "I understand you're asking about credit. Let me help you with that. Could you provide more details about what specific aspect of your credit you'd like to discuss?",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
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
        {messages.map((message) => (
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
                  name="sparkles"
                  size={20}
                  color={lightTheme.colors.primary}
                />
              </View>
            )}
            <View
              style={[
                styles.messageContent,
                message.role === "user"
                  ? styles.userContent
                  : styles.assistantContent,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === "user" && styles.userText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}
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
              <Text style={styles.typingText}>Thinking...</Text>
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
