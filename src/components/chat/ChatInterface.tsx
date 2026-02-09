/**
 * Financial Chat Interface Component
 * Phase 6.2: Main chat interface with zero trust security
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatMessage, ChatSession, ChatResponse, MessageRole } from '@/lib/ai/types/financial-chat.types';
import DOMPurify from 'isomorphic-dompurify';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { ChatSidebar } from './ChatSidebar';

interface ChatInterfaceProps {
  initialSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialSessionId,
  onSessionChange,
}) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionValidationInterval = useRef<NodeJS.Timeout | null>(null);
  const bypassAuth = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true';

  // ZERO TRUST: Verify authentication
  const verifyAuthentication = useCallback(async () => {
    if (bypassAuth) {
      setIsAuthenticated(true);
      setUserId('e2e-user');
      return true;
    }
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setIsAuthenticated(false);
        setUserId(null);
        return false;
      }
      setIsAuthenticated(true);
      setUserId(user.id);
      return true;
    } catch (err) {
      setIsAuthenticated(false);
      return false;
    }
  }, [bypassAuth, supabase]);

  // ZERO TRUST: Validate session ownership
  const validateSessionOwnership = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!userId) return false;
    if (bypassAuth) return true;
    try {
      const response = await fetch(`/api/chat/financial/sessions/${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.session?.userId === userId;
    } catch (err) {
      return false;
    }
  }, [bypassAuth, userId]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    const isAuth = await verifyAuthentication();
    if (!isAuth) return;
    try {
      const response = await fetch('/api/chat/financial/sessions?limit=20', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError('Failed to load chat sessions');
    }
  }, [verifyAuthentication]);

  // Load messages
  const loadMessages = useCallback(async (sessionId: string) => {
    const isAuth = await verifyAuthentication();
    if (!isAuth) return;
    const isOwner = await validateSessionOwnership(sessionId);
    if (!isOwner) {
      setError('Unauthorized access to session');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/financial/sessions/${sessionId}/messages?limit=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [verifyAuthentication, validateSessionOwnership]);

  // Send message with XSS protection
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || !isAuthenticated) {
      setError('Please select a session and ensure you are logged in');
      return;
    }
    // ZERO TRUST: Sanitize input
    const sanitizedContent = DOMPurify.sanitize(content.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    if (!sanitizedContent || sanitizedContent.length === 0) {
      setError('Message cannot be empty');
      return;
    }
    if (sanitizedContent.length > 2000) {
      setError('Message too long (max 2000 characters)');
      return;
    }
    const isOwner = await validateSessionOwnership(currentSessionId);
    if (!isOwner) {
      setError('Unauthorized: Session ownership validation failed');
      return;
    }
    setIsLoading(true);
    setError(null);
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSessionId,
      role: MessageRole.USER,
      content: sanitizedContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, tempUserMessage]);
    try {
      const response = await fetch('/api/chat/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: currentSessionId, message: sanitizedContent, streaming: false }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      const data: ChatResponse = await response.json();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: currentSessionId,
        role: MessageRole.ASSISTANT,
        content: data.message,
        timestamp: new Date(),
        metadata: data.metadata,
      };
      setMessages(prev => [...prev, assistantMessage]);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, isAuthenticated, validateSessionOwnership]);

  // Create new session
  const createNewSession = useCallback(async (title?: string) => {
    const isAuth = await verifyAuthentication();
    if (!isAuth) return;
    try {
      const response = await fetch('/api/chat/financial/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();
      const newSession = data.session;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      onSessionChange?.(newSession.id);
    } catch (err) {
      setError('Failed to create new session');
    }
  }, [verifyAuthentication, onSessionChange]);

  // Switch session
  const switchSession = useCallback(async (sessionId: string) => {
    const isOwner = await validateSessionOwnership(sessionId);
    if (!isOwner) {
      setError('Access denied to this session');
      return;
    }
    setCurrentSessionId(sessionId);
    setMessages([]);
    await loadMessages(sessionId);
    onSessionChange?.(sessionId);
  }, [validateSessionOwnership, loadMessages, onSessionChange]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    const isOwner = await validateSessionOwnership(sessionId);
    if (!isOwner) {
      setError('Access denied to this session');
      return;
    }
    try {
      const response = await fetch(`/api/chat/financial/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete session');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to delete session');
    }
  }, [validateSessionOwnership, currentSessionId]);

  // Initialize and periodic validation
  useEffect(() => {
    verifyAuthentication().then(isAuth => {
      if (isAuth) {
        loadSessions();
        if (initialSessionId) loadMessages(initialSessionId);
      }
    });
    // ZERO TRUST: Periodic re-authentication every 5 minutes
    sessionValidationInterval.current = setInterval(() => {
      verifyAuthentication();
    }, 5 * 60 * 1000);
    return () => {
      if (sessionValidationInterval.current) clearInterval(sessionValidationInterval.current);
    };
  }, [verifyAuthentication, loadSessions, loadMessages, initialSessionId]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-slate-300">Please log in to access the financial chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900" data-testid="chat-container">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={switchSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
      />
      <div className="flex-1 flex flex-col">
        <ChatHeader currentSessionId={currentSessionId} sessions={sessions} />
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4" data-testid="error-message">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        <ChatMessageList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
        <ChatInput
          onSendMessage={sendMessage}
          disabled={!currentSessionId || isLoading}
          placeholder={currentSessionId ? 'Ask about your finances...' : 'Select or create a session to start chatting'}
        />
      </div>
    </div>
  );
};
