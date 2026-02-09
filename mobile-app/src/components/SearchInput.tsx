/**
 * Fynvita Search Input Component
 * Search input with suggestions and clear button
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  Keyboard,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Suggestion {
  id: string;
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions?: Suggestion[];
  onSuggestionPress?: (suggestion: Suggestion) => void;
  onSubmit?: (text: string) => void;
  autoFocus?: boolean;
  showClearButton?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search...',
  suggestions = [],
  onSuggestionPress,
  onSubmit,
  autoFocus = false,
  showClearButton = true,
}: SearchInputProps) {
  const { colors, spacing, borderRadius, fontSize, shadow, iconSize } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const showSuggestions = isFocused && suggestions.length > 0 && value.length > 0;

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: Suggestion) => {
    onChangeText(suggestion.text);
    onSuggestionPress?.(suggestion);
    Keyboard.dismiss();
  };

  const handleSubmit = () => {
    onSubmit?.(value);
    Keyboard.dismiss();
  };

  const styles = useMemo(() => ({
    container: {
      position: 'relative',
      zIndex: 10,
    } as ViewStyle,
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: isFocused ? colors.primary : colors.border,
      height: 48,
    } as ViewStyle,
    input: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.text,
      marginLeft: spacing.sm,
      paddingVertical: 0,
    } as TextStyle,
    clearButton: {
      padding: 4,
    } as ViewStyle,
    suggestionsContainer: {
      position: 'absolute',
      top: 52,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 200,
      ...shadow.md,
    } as ViewStyle,
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,
    suggestionText: {
      fontSize: fontSize.sm,
      color: colors.text,
    } as TextStyle,
  }), [colors, spacing, borderRadius, fontSize, shadow, isFocused]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={iconSize.md} color={colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {showClearButton && value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                {item.icon && (
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginRight: spacing.sm }}
                  />
                )}
                <Text style={styles.suggestionText}>{item.text}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

export default SearchInput;
