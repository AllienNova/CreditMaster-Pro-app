/**
 * Chat Message List Component
 * Phase 6.2: Displays chat messages with role-based styling
 */

"use client";

import React from "react";
import { ChatMessage, MessageRole } from "@/lib/ai/types/financial-chat.types";
import { format } from "date-fns";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  messagesEndRef,
}) => {
  const formatTimestamp = (timestamp: Date) => {
    return format(new Date(timestamp), "h:mm a");
  };

  const getMessageStyles = (role: MessageRole) => {
    switch (role) {
      case MessageRole.USER:
        return "bg-blue-600 text-white ml-auto";
      case MessageRole.ASSISTANT:
        return "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white mr-auto";
      case MessageRole.SYSTEM:
        return "bg-yellow-100 text-yellow-900 mx-auto text-center";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white";
    }
  };

  const getMessageAlignment = (role: MessageRole) => {
    switch (role) {
      case MessageRole.USER:
        return "justify-end";
      case MessageRole.ASSISTANT:
        return "justify-start";
      case MessageRole.SYSTEM:
        return "justify-center";
      default:
        return "justify-start";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-slate-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2 text-sm">
              No messages yet. Start a conversation!
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${getMessageAlignment(message.role)}`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${getMessageStyles(message.role)}`}
            data-testid={
              message.role === MessageRole.ASSISTANT
                ? "assistant-message"
                : message.role === MessageRole.USER
                  ? "user-message"
                  : "system-message"
            }
          >
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div
              className={`text-xs mt-1 ${message.role === MessageRole.USER ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}
              data-testid="message-timestamp"
            >
              {formatTimestamp(message.timestamp)}
            </div>

            {/* Display suggested actions if available */}
            {message.metadata?.suggestedActions &&
              message.metadata.suggestedActions.length > 0 && (
                <div className="mt-3 space-y-2" data-testid="suggested-actions">
                  <p className="text-xs font-semibold">Suggested Actions:</p>
                  {message.metadata.suggestedActions.map(
                    (
                      action: { label: string; action?: string },
                      index: number,
                    ) => (
                      <button
                        key={index}
                        data-testid="suggested-action"
                        className="block w-full text-left text-xs bg-white dark:bg-slate-800 bg-opacity-20 hover:bg-opacity-30 rounded px-2 py-1 transition-colors"
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              )}

            {/* Display educational content if available */}
            {message.metadata?.educationalContent &&
              message.metadata.educationalContent.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold">Learn More:</p>
                  {message.metadata.educationalContent.map(
                    (
                      content: { title: string; summary?: string },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="text-xs bg-white dark:bg-slate-800 bg-opacity-20 rounded px-2 py-1"
                      >
                        <p className="font-medium">{content.title}</p>
                        <p className="text-xs opacity-90">{content.summary}</p>
                      </div>
                    ),
                  )}
                </div>
              )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-4 py-2">
            <div className="flex space-x-2">
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
