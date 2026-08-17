/**
 * useCoaching Hook
 * Manages behavioral coaching sessions for mobile app
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api/client";
import {
  toCoachReply,
  questionRejectionReason,
  type ApiPersonalizedAdvice,
} from "../services/api/coachReplyAdapter";

type CoachingTopic =
  | "budgeting"
  | "saving"
  | "investing"
  | "debt"
  | "credit"
  | "mindset";

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
  role: "coach" | "user";
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

/**
 * The coaching curriculum this app offers.
 *
 * NOT mock data, despite its old name: these are the sessions the product
 * teaches, the same kind of fixed catalogue as the goal list in onboarding.
 * They were being fetched from /ai/coaching/sessions — a route that has never
 * existed — with this array as the "fallback", so the request failed on every
 * launch and the catalogue was used anyway. It is now read directly and no
 * request is made.
 *
 * A user's PROGRESS through them is a different thing and is not stored yet;
 * `completed` is local to the session. See the note on completeSession.
 */
const COACHING_SESSIONS: CoachingSession[] = [
  {
    id: "1",
    topic: "budgeting",
    title: "Master Your Monthly Budget",
    summary:
      "Learn the 50/30/20 rule and create a budget that works for your lifestyle.",
    steps: [
      "Calculate your after-tax income",
      "List your essential expenses (50%)",
      "Plan discretionary spending (30%)",
      "Set savings goals (20%)",
      "Track and adjust weekly",
    ],
    duration: "10 min",
    completed: false,
  },
  {
    id: "2",
    topic: "saving",
    title: "Build Your Emergency Fund",
    summary:
      "Create a financial safety net that covers 3-6 months of expenses.",
    steps: [
      "Calculate your monthly essential costs",
      "Set your target (3x minimum)",
      "Open a high-yield savings account",
      "Automate weekly transfers",
      "Review progress monthly",
    ],
    duration: "8 min",
    completed: true,
    completedAt: "2026-01-15",
  },
  {
    id: "3",
    topic: "credit",
    title: "Boost Your Credit Score",
    summary:
      "Understand the factors that impact your score and actionable steps to improve it.",
    steps: [
      "Review your credit report for errors",
      "Pay bills on time (35% of score)",
      "Lower credit utilization below 30%",
      "Keep old accounts open",
      "Limit new credit applications",
    ],
    duration: "12 min",
    completed: false,
  },
  {
    id: "4",
    topic: "mindset",
    title: "Overcome Impulse Spending",
    summary: "Build healthy spending habits with psychological strategies.",
    steps: [
      "Identify your spending triggers",
      "Implement the 24-hour rule",
      'Create a "want vs need" checklist',
      "Set spending limits by category",
      "Celebrate small wins",
    ],
    duration: "7 min",
    completed: false,
  },
];

const INITIAL_MESSAGES: CoachingMessage[] = [
  {
    id: "1",
    role: "coach",
    content:
      "Hi! I'm your financial coach. I'm here to help you build better money habits. What would you like to work on today?",
    timestamp: new Date().toISOString(),
    suggestions: [
      "Help me budget better",
      "I want to save more",
      "Improve my credit score",
    ],
  },
];

export function useCoaching(): UseCoachingReturn {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CoachingSession | null>(
    null,
  );
  const [messages, setMessages] = useState<CoachingMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the curriculum.
   *
   * No request: the catalogue is product content that ships with the app.
   * This used to GET /ai/coaching/sessions and fall back to the same array
   * when that 404'd, which it always did.
   */
  const fetchSessions = useCallback(async () => {
    setSessions(COACHING_SESSIONS);
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
          role: "coach",
          content: `Great choice! Let's work on "${session.title}". ${session.summary}\n\nHere's what we'll cover:\n${session.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nReady to begin?`,
          timestamp: new Date().toISOString(),
          suggestions: ["Yes, let's start!", "Tell me more first"],
        },
      ]);
    },
    [sessions],
  );

  const completeSession = useCallback(
    async (sessionId: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, completed: true, completedAt: new Date().toISOString() }
            : s,
        ),
      );
      setCurrentSession(null);
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: "coach",
          content:
            "🎉 Congratulations on completing this session! You're building great financial habits. Would you like to start another session or take a break?",
          timestamp: new Date().toISOString(),
          suggestions: ["Start another session", "I'm done for now"],
        },
      ]);
    },
    [messages],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const userMessage: CoachingMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setError(null);

      // The advice endpoint validates 10-500 characters and answers a 400 with
      // a Zod issue list. Saying so here beats sending "ok" and rendering an
      // opaque failure the user cannot act on.
      const rejection = questionRejectionReason(message);
      if (rejection) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "coach",
            content: rejection,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      setIsLoading(true);

      try {
        // /ai/financial-coach/advice is the real coach: authenticated,
        // rate-limited to 10/min and backed by ModelRouter. It takes a single
        // `question` — it has no conversation-history parameter, so the
        // history this used to send was going nowhere even in principle.
        const res = await api.post<{
          data?: ApiPersonalizedAdvice;
          answer?: string;
        }>("/ai/financial-coach/advice", { question: message.trim() });

        const payload = res.success
          ? ((res.data as { data?: ApiPersonalizedAdvice })?.data ??
            (res.data as ApiPersonalizedAdvice))
          : null;
        const reply = toCoachReply(payload);

        if (!reply) {
          // No canned substitute. A coach that did not answer must not appear
          // to have answered — getCoachResponse used to fill this silence with
          // one of five hardcoded paragraphs picked by substring match, and
          // because the old endpoint never existed that was every reply any
          // user ever saw.
          setError(
            res.success
              ? "The coach did not have an answer for that. Try rephrasing?"
              : "I could not reach your coach just now. Please try again.",
          );
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "coach",
            content: reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Coach request failed:", err);
        setError("I could not reach your coach just now. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession],
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

/*
 * getCoachResponse and getCoachSuggestions are gone.
 *
 * getCoachResponse substring-matched the user's message for "budget", "save",
 * "credit" or "yes" and returned one of five hardcoded paragraphs, otherwise a
 * generic one. getCoachSuggestions returned a fixed chip list unrelated to
 * anything the coach said. Because /ai/coaching/chat did not exist, these were
 * not a fallback — they were the product.
 */

export default useCoaching;
