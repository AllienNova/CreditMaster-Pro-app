/**
 * Chat Input Component
 * Phase 6.2: Message input with character limit and sanitization
 */

"use client";

import React, { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 2000;

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }
    }
  };

  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            data-testid="chat-input"
            className={`w-full px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white dark:bg-slate-800"} ${isAtLimit ? "border-red-500" : "border-gray-300 dark:border-slate-600"}`}
            style={{ minHeight: "44px", maxHeight: "150px" }}
          />

          {/* Character count */}
          <div
            data-testid={isAtLimit ? "char-counter-error" : "char-counter"}
            className={`absolute bottom-2 right-2 text-xs ${
              isAtLimit
                ? "text-red-600 font-semibold"
                : isNearLimit
                  ? "text-yellow-600"
                  : "text-gray-400 dark:text-slate-500"
            }`}
          >
            {characterCount}/{maxLength}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          data-testid="send-button"
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            disabled || !message.trim()
              ? "bg-gray-300 text-gray-500 dark:text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          }`}
          style={{ minHeight: "44px" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};
