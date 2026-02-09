/**
 * useCoaching Hook
 * Manages behavioral coaching sessions for mobile app
 */

import { useState, useEffect, useCallback } from 'react';

type CoachingTopic =
  | 'budgeting'
  | 'saving'
  | 'investing'
  | 'debt'
  | 'credit'
  | 'mindset';

interface CoachingSession {
  id: string;
  topic: CoachingTopic;
  title: string;
  summary: string;
  steps: string[];
  duration: string;
  completed: boolean;
  completedAt?: string;
}

interface CoachingMessage {
  id: string;
  role: 'coach' | 'user';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

interface UseCoachingReturn {
  sessions: CoachingSession[];
  activeSessions: CoachingSession[];
  completedSessions: CoachingSession[];
  currentSession: CoachingSession | null;
  messages: CoachingMessage[];
  isLoading: boolean;
  error: string | null;
  startSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  fetchSessions: () => Promise<void>;
}

const MOCK_SESSIONS: CoachingSession[] = [
  {
    id: '1',
    topic: 'budgeting',
    title: 'Master Your Monthly Budget',
    summary:
      'Learn the 50/30/20 rule and create a budget that works for your lifestyle.',
    steps: [
      'Calculate your after-tax income',
      'List your essential expenses (50%)',
      'Plan discretionary spending (30%)',
      'Set savings goals (20%)',
      'Track and adjust weekly',
    ],
    duration: '10 min',
    completed: false,
  },
  {
    id: '2',
    topic: 'saving',
    title: 'Build Your Emergency Fund',
    summary:
      'Create a financial safety net that covers 3-6 months of expenses.',
    steps: [
      'Calculate your monthly essential costs',
      'Set your target (3x minimum)',
      'Open a high-yield savings account',
      'Automate weekly transfers',
      'Review progress monthly',
    ],
    duration: '8 min',
    completed: true,
    completedAt: '2026-01-15',
  },
  {
    id: '3',
    topic: 'credit',
    title: 'Boost Your Credit Score',
    summary:
      'Understand the factors that impact your score and actionable steps to improve it.',
    steps: [
      'Review your credit report for errors',
      'Pay bills on time (35% of score)',
      'Lower credit utilization below 30%',
      'Keep old accounts open',
      'Limit new credit applications',
    ],
    duration: '12 min',
    completed: false,
  },
  {
    id: '4',
    topic: 'mindset',
    title: 'Overcome Impulse Spending',
    summary: 'Build healthy spending habits with psychological strategies.',
    steps: [
      'Identify your spending triggers',
      'Implement the 24-hour rule',
      'Create a "want vs need" checklist',
      'Set spending limits by category',
      'Celebrate small wins',
    ],
    duration: '7 min',
    completed: false,
  },
];

const INITIAL_MESSAGES: CoachingMessage[] = [
  {
    id: '1',
    role: 'coach',
    content:
      "Hi! I'm your financial coach. I'm here to help you build better money habits. What would you like to work on today?",
    timestamp: new Date().toISOString(),
    suggestions: [
      'Help me budget better',
      'I want to save more',
      'Improve my credit score',
    ],
  },
];

export function useCoaching(): UseCoachingReturn {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CoachingSession | null>(
    null
  );
  const [messages, setMessages] = useState<CoachingMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/coaching/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        // Fallback to mock data if API unavailable
        setSessions(MOCK_SESSIONS);
      }
    } catch (err) {
      // Fallback to mock data on network error
      setSessions(MOCK_SESSIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      setCurrentSession(session);
      setMessages([
        ...INITIAL_MESSAGES,
        {
          id: Date.now().toString(),
          role: 'coach',
          content: `Great choice! Let's work on "${session.title}". ${session.summary}\n\nHere's what we'll cover:\n${session.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReady to begin?`,
          timestamp: new Date().toISOString(),
          suggestions: ["Yes, let's start!", 'Tell me more first'],
        },
      ]);
    },
    [sessions]
  );

  const completeSession = useCallback(
    async (sessionId: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, completed: true, completedAt: new Date().toISOString() }
            : s
        )
      );
      setCurrentSession(null);
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: 'coach',
          content:
            "🎉 Congratulations on completing this session! You're building great financial habits. Would you like to start another session or take a break?",
          timestamp: new Date().toISOString(),
          suggestions: ['Start another session', "I'm done for now"],
        },
      ]);
    },
    [messages]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const userMessage: CoachingMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/ai/coaching/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: currentSession?.id,
            sessionTopic: currentSession?.topic,
            conversationHistory: messages.slice(-10).map((m) => ({
              role: m.role === 'coach' ? 'assistant' : 'user',
              content: m.content,
            })),
          }),
        });

        let coachResponse: CoachingMessage;
        if (response.ok) {
          const data = await response.json();
          coachResponse = {
            id: (Date.now() + 1).toString(),
            role: 'coach',
            content: data.response || getCoachResponse(message, currentSession),
            timestamp: new Date().toISOString(),
            suggestions: data.suggestions || getCoachSuggestions(message, currentSession),
          };
        } else {
          // Fallback to local response generation
          coachResponse = {
            id: (Date.now() + 1).toString(),
            role: 'coach',
            content: getCoachResponse(message, currentSession),
            timestamp: new Date().toISOString(),
            suggestions: getCoachSuggestions(message, currentSession),
          };
        }

        setMessages((prev) => [...prev, coachResponse]);
      } catch (err) {
        // Fallback to local response on network error
        const fallbackResponse: CoachingMessage = {
          id: (Date.now() + 1).toString(),
          role: 'coach',
          content: getCoachResponse(message, currentSession),
          timestamp: new Date().toISOString(),
          suggestions: getCoachSuggestions(message, currentSession),
        };
        setMessages((prev) => [...prev, fallbackResponse]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  useEffect(() => {
    fetchSessions();
  }, []);

  const activeSessions = sessions.filter((s) => !s.completed);
  const completedSessions = sessions.filter((s) => s.completed);

  return {
    sessions,
    activeSessions,
    completedSessions,
    currentSession,
    messages,
    isLoading,
    error,
    startSession,
    completeSession,
    sendMessage,
    fetchSessions,
  };
}

function getCoachResponse(
  message: string,
  session: CoachingSession | null
): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('budget')) {
    return 'Budgeting is the foundation of financial health! The key is to track every dollar and assign it a purpose. Have you tried the 50/30/20 rule? 50% for needs, 30% for wants, and 20% for savings and debt repayment.';
  }
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    return "Saving is easier when it's automatic! Try setting up automatic transfers on payday - even $25 a week adds up to $1,300 a year. What's your current savings goal?";
  }
  if (lowerMessage.includes('credit')) {
    return 'Your credit score is influenced by 5 main factors: payment history (35%), credit utilization (30%), length of credit history (15%), credit mix (10%), and new credit (10%). Which area would you like to focus on?';
  }
  if (lowerMessage.includes('yes') || lowerMessage.includes('start')) {
    return session
      ? `Perfect! Let's begin with step 1: ${session.steps[0]}. Take a moment to think about this, and let me know when you're ready to move on.`
      : 'Great enthusiasm! What financial topic would you like to tackle first?';
  }

  return "That's a great point! Financial wellness is a journey, not a destination. Every small step counts. What specific aspect would you like to explore further?";
}

function getCoachSuggestions(
  message: string,
  session: CoachingSession | null
): string[] {
  if (session) {
    return ['Next step', 'Explain more', 'Skip this step', 'End session'];
  }
  return ['Help me budget', 'Saving tips', 'Credit advice', 'Debt payoff'];
}

export default useCoaching;
