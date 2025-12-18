/**
 * CPFI Search Input Component
 * Search input with suggestions and clear button
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../constants/theme';

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

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
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
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
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
                    color={theme.colors.textSecondary} 
                    style={styles.suggestionIcon}
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 48,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionIcon: {
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
});

export default SearchInput;
