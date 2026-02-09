/**
 * Chat Sidebar Component
 * Phase 6.2: Session list with create/delete functionality
 */

'use client';

import React, { useState } from 'react';
import { ChatSession } from '@/lib/ai/types/financial-chat.types';
import { format } from 'date-fns';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: (title?: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateSession = () => {
    if (isCreating) {
      onNewSession(newSessionTitle.trim() || undefined);
      setNewSessionTitle('');
      setIsCreating(false);
    } else {
      setIsCreating(true);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewSessionTitle('');
  };

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirmId === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(sessionId);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const formatSessionDate = (date: Date) => {
    return format(new Date(date), 'MMM d, h:mm a');
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Chat</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">AI-powered financial advisor</p>
      </div>

      {/* New Session Button */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        {isCreating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              placeholder="Session title (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
              autoFocus
              data-testid="new-session-input"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateSession}
                data-testid="save-session-button"
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Create
              </button>
              <button
                onClick={handleCancelCreate}
                className="flex-1 px-3 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCreateSession}
            data-testid="new-session-button"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
            No chat sessions yet. Create one to get started!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700" data-testid="chat-session">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 ${
                  currentSessionId === session.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
                data-testid="session-item"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session.title || 'Untitled Chat'}
                    </h3>
                    {currentSessionId === session.id && (
                      <span
                        className="inline-flex items-center text-xs text-blue-600 mt-1"
                        data-testid="active-session"
                      >
                        Active
                      </span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {formatSessionDate(session.updatedAt)}
                    </p>
                    {session.metadata?.messageCount && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {session.metadata.messageCount} messages
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(session.id, e)}
                    className={`ml-2 p-1 rounded hover:bg-red-100 transition-colors ${
                      deleteConfirmId === session.id ? 'bg-red-100' : ''
                    }`}
                    title={deleteConfirmId === session.id ? 'Click again to confirm' : 'Delete session'}
                    data-testid="delete-session-button"
                  >
                    <svg
                      className={`w-4 h-4 ${deleteConfirmId === session.id ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
