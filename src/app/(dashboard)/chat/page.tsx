/**
 * Financial Chat Page
 * Phase 6.2: Main page for financial chat interface
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface').then((mod) => mod.ChatInterface),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatInterface />
    </div>
  );
}

