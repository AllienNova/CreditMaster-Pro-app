"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type AssistantState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface ConversationEntry {
  role: "user" | "assistant";
  text: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventCustom {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventCustom {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventCustom) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventCustom) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const SYSTEM_PROMPT = `You are Fynvita's AI financial assistant. You help users with credit health, budgeting, saving, investing, debt management, and financial planning. Keep responses concise (2-3 sentences for voice) and actionable. If a question is outside finance, politely redirect to financial topics.`;

async function sendToChat(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to get response");
  }
  return data.data.content;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function PulsingRing() {
  return (
    <>
      <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
      <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-20" />
    </>
  );
}

function WaveformBars() {
  return (
    <div
      className="flex items-center gap-0.5 h-4"
      aria-hidden="true"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-0.5 bg-red-400 rounded-full animate-pulse"
          style={{
            height: `${8 + Math.random() * 8}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: `${0.4 + Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [continuousMode, setContinuousMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef("");
  const shouldRestartRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSpeechSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;
  }, []);

  const processQuery = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userEntry: ConversationEntry = { role: "user", text: text.trim() };
      setConversation((prev) => [...prev, userEntry]);
      setState("processing");
      setTranscript("");

      const chatMessages = [
        ...conversation.map((e) => ({ role: e.role, content: e.text })),
        { role: "user", content: text.trim() },
      ];

      try {
        const reply = await sendToChat(chatMessages);
        const assistantEntry: ConversationEntry = {
          role: "assistant",
          text: reply,
        };
        setConversation((prev) => [...prev, assistantEntry]);

        if (synthRef.current && isSpeechSupported) {
          synthRef.current.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => setState("speaking");
          utterance.onend = () => {
            setState("idle");
            if (continuousMode && shouldRestartRef.current) {
              startListeningInternal();
            }
          };
          utterance.onerror = () => setState("idle");

          synthRef.current.speak(utterance);
        } else {
          setState("idle");
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to get response";
        setErrorMessage(msg);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      }
    },
    [conversation, isSpeechSupported, continuousMode],
  );

  const startListeningInternal = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore abort errors
      }
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";

    recognition.onresult = (event: SpeechRecognitionEventCustom) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current += final;
      }
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setErrorMessage(
        event.error === "not-allowed"
          ? "Microphone access denied. Please allow microphone permissions."
          : `Could not hear you clearly. Please try again.`,
      );
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    };

    recognition.onend = () => {
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) {
        processQuery(finalText);
      } else if (state === "listening") {
        setState("idle");
      }
    };

    try {
      recognition.start();
      setState("listening");
      setTranscript("");
      setErrorMessage("");
    } catch {
      setErrorMessage("Failed to start speech recognition. Please try again.");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [processQuery, state]);

  const startListening = useCallback(() => {
    shouldRestartRef.current = true;
    startListeningInternal();
  }, [startListeningInternal]);

  const stopAll = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState("idle");
    setTranscript("");
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    processQuery(textInput);
    setTextInput("");
  }, [textInput, processQuery]);

  const togglePanel = useCallback(() => {
    if (isOpen) {
      stopAll();
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, stopAll]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setTranscript("");
    setErrorMessage("");
    setState("idle");
  }, []);

  const isBusy = state === "listening" || state === "processing" || state === "speaking";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="w-80 sm:w-96 max-h-[70vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-label="Voice Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Fynvita Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={() => setContinuousMode((p) => !p)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                    continuousMode
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400",
                  )}
                  aria-label={
                    continuousMode
                      ? "Disable continuous listening"
                      : "Enable continuous listening"
                  }
                  title={
                    continuousMode
                      ? "Continuous mode on"
                      : "Continuous mode off"
                  }
                >
                  Auto
                </button>
              )}
              {conversation.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  aria-label="Clear conversation"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={togglePanel}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close voice assistant"
              >
                <CloseIcon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px] max-h-[40vh]">
            {conversation.length === 0 && state === "idle" && (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">
                {isSpeechSupported
                  ? "Tap the mic or type a question about your finances."
                  : "Type a question about your finances."}
              </p>
            )}

            {conversation.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-xl px-3 py-2 max-w-[85%]",
                  entry.role === "user"
                    ? "ml-auto bg-emerald-500 text-white"
                    : "mr-auto bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100",
                )}
              >
                {entry.text}
              </div>
            ))}

            {/* Live transcript */}
            {state === "listening" && transcript && (
              <div className="ml-auto text-sm rounded-xl px-3 py-2 max-w-[85%] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 italic">
                {transcript}
              </div>
            )}

            {/* Processing */}
            {state === "processing" && (
              <div className="mr-auto flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 px-3 py-2">
                <span className="flex gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {state === "error" && errorMessage && (
            <div className="mx-4 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Status bar when listening/speaking */}
          {(state === "listening" || state === "speaking") && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
              {state === "listening" && (
                <>
                  <WaveformBars />
                  <span className="text-xs text-red-500 font-medium">
                    Listening...
                  </span>
                </>
              )}
              {state === "speaking" && (
                <>
                  <SpeakerIcon className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span className="text-xs text-blue-500 font-medium">
                    Speaking...
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={stopAll}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Stop"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 dark:border-slate-700">
            {isSpeechSupported && (
              <button
                type="button"
                onClick={
                  state === "listening" ? stopAll : startListening
                }
                disabled={state === "processing" || state === "speaking"}
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  state === "listening"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600",
                  (state === "processing" || state === "speaking") &&
                    "opacity-50 cursor-not-allowed",
                )}
                aria-label={
                  state === "listening"
                    ? "Stop listening"
                    : "Start listening"
                }
              >
                {state === "listening" ? (
                  <StopIcon className="w-4 h-4" />
                ) : (
                  <MicIcon className="w-5 h-5" />
                )}
              </button>
            )}

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              placeholder="Ask about your finances..."
              disabled={isBusy}
              className={cn(
                "flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors",
                isBusy && "opacity-50 cursor-not-allowed",
              )}
              aria-label="Type your question"
            />

            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isBusy}
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all bg-emerald-500 text-white hover:bg-emerald-600",
                (!textInput.trim() || isBusy) &&
                  "opacity-50 cursor-not-allowed",
              )}
              aria-label="Send message"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={togglePanel}
        className={cn(
          "relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
          isOpen
            ? "bg-gray-600 hover:bg-gray-700 text-white"
            : "bg-emerald-500 hover:bg-emerald-600 text-white",
        )}
        aria-label={isOpen ? "Close voice assistant" : "Open voice assistant"}
        aria-expanded={isOpen}
      >
        {state === "listening" && <PulsingRing />}
        <span className="relative z-10">
          {isOpen ? (
            <CloseIcon className="w-6 h-6" />
          ) : state === "listening" ? (
            <MicIcon className="w-6 h-6" />
          ) : state === "speaking" ? (
            <SpeakerIcon className="w-6 h-6" />
          ) : (
            <MicIcon className="w-6 h-6" />
          )}
        </span>
      </button>
    </div>
  );
}
