/**
 * Phase 6.3.2: ChatInput Component
 * Multi-line text input with character counter and XSS protection
 */

import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DOMPurify from 'isomorphic-dompurify';
import { lightTheme as theme } from '../../constants/theme';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading = false,
  disabled = false,
  maxLength = 2000,
}) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const inputRef = useRef<TextInput>(null);

  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isAtLimit = charCount >= maxLength;

  const handleSend = () => {
    if (!text.trim() || loading || disabled) return;

    // ZERO TRUST: Sanitize input
    const sanitized = DOMPurify.sanitize(text.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    if (!sanitized || sanitized.length === 0) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(sanitized);
    setText('');
    setInputHeight(40);
  };

  const handleContentSizeChange = (event: any) => {
    const height = event.nativeEvent.contentSize.height;
    // Max 4 lines (approximately 100px)
    setInputHeight(Math.min(Math.max(40, height), 100));
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { height: inputHeight },
            isAtLimit && styles.inputError,
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Ask about your finances..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={maxLength}
          editable={!disabled && !loading}
          onContentSizeChange={handleContentSizeChange}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        
        <Text
          style={[
            styles.charCounter,
            isAtLimit ? styles.charCounterError : isNearLimit ? styles.charCounterWarning : {},
          ]}
        >
          {charCount}/{maxLength}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!text.trim() || loading || disabled) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!text.trim() || loading || disabled}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="send" size={22} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  charCounter: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCounterWarning: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  charCounterError: {
    color: '#DC2626',
    fontWeight: '600',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});

