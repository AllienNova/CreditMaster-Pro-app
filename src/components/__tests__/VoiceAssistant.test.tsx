/**
 * VoiceAssistant Component Tests
 */

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { server } from "@/__tests__/mocks/server";
import VoiceAssistant from "../voice-assistant/VoiceAssistant";

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
}

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text?: string) {
    this.text = text || "";
  }
}

const mockSpeak = jest.fn();
const mockCancel = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, "SpeechRecognition", {
    writable: true,
    configurable: true,
    value: MockSpeechRecognition,
  });
  Object.defineProperty(window, "speechSynthesis", {
    writable: true,
    configurable: true,
    value: { speak: mockSpeak, cancel: mockCancel },
  });
  (global as Record<string, unknown>).SpeechSynthesisUtterance =
    MockSpeechSynthesisUtterance;
});

function setupChatHandler(
  response = "Here is your financial advice.",
  status = 200,
) {
  server.use(
    rest.post("http://localhost/api/ai/chat", (_req, res, ctx) => {
      return res(
        ctx.status(status),
        ctx.json(
          status === 200
            ? { success: true, data: { content: response } }
            : { success: false, error: response },
        ),
      );
    }),
  );
}

describe("VoiceAssistant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupChatHandler();
  });

  it("renders floating action button", () => {
    render(<VoiceAssistant />);
    expect(
      screen.getByRole("button", { name: /open voice assistant/i }),
    ).toBeInTheDocument();
  });

  it("opens panel when FAB is clicked", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /voice assistant/i }),
    ).toBeInTheDocument();
  });

  it("closes panel when FAB is clicked again", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click the FAB again (now shows close icon)
    const buttons = screen.getAllByRole("button", {
      name: /close voice assistant/i,
    });
    // FAB is the last one
    fireEvent.click(buttons[buttons.length - 1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows text input when panel is open", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByPlaceholderText(/ask about your finances/i),
    ).toBeInTheDocument();
  });

  it("shows microphone button in input area", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByRole("button", { name: /start listening/i }),
    ).toBeInTheDocument();
  });

  it("sends text query and shows response", async () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, {
      target: { value: "How do I improve my credit?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Here is your financial advice."),
      ).toBeInTheDocument();
    });
  });

  it("sends text query on Enter key", async () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, { target: { value: "budget tips" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("budget tips")).toBeInTheDocument();
    });
  });

  it("shows user message in conversation", async () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, {
      target: { value: "What is my credit score?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(
        screen.getByText("What is my credit score?"),
      ).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    setupChatHandler("Unauthorized", 401);

    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
    });
  });

  it("clears conversation when clear button is clicked", async () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /clear conversation/i }),
    );

    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("toggles continuous mode", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const autoButton = screen.getByRole("button", {
      name: /enable continuous listening/i,
    });
    fireEvent.click(autoButton);

    expect(
      screen.getByRole("button", { name: /disable continuous listening/i }),
    ).toBeInTheDocument();
  });

  it("shows processing state while waiting for response", async () => {
    // Use a slow handler
    server.use(
      rest.post("http://localhost/api/ai/chat", (_req, res, ctx) => {
        return res(
          ctx.delay(500),
          ctx.json({
            success: true,
            data: { content: "Delayed response" },
          }),
        );
      }),
    );

    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(/ask about your finances/i);
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/thinking/i)).toBeInTheDocument();
    });
  });

  it("does not send empty text", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const sendButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButton);

    // No user message should appear
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  it("has proper aria-expanded on FAB", () => {
    render(<VoiceAssistant />);
    const fab = screen.getByRole("button", { name: /open voice assistant/i });
    expect(fab).toHaveAttribute("aria-expanded", "false");
  });

  it("shows placeholder text when no conversation", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByText(/tap the mic or type a question/i),
    ).toBeInTheDocument();
  });

  it("clears input after sending", async () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );

    const input = screen.getByPlaceholderText(
      /ask about your finances/i,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});

describe("VoiceAssistant without speech support", () => {
  beforeEach(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      writable: true,
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      writable: true,
      configurable: true,
      value: undefined,
    });
    setupChatHandler();
  });

  afterEach(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      writable: true,
      configurable: true,
      value: MockSpeechRecognition,
    });
  });

  it("hides mic button when speech not supported", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.queryByRole("button", { name: /start listening/i }),
    ).not.toBeInTheDocument();
  });

  it("still allows text input when speech not supported", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByPlaceholderText(/ask about your finances/i),
    ).toBeInTheDocument();
  });

  it("shows text-only placeholder when speech not supported", () => {
    render(<VoiceAssistant />);
    fireEvent.click(
      screen.getByRole("button", { name: /open voice assistant/i }),
    );
    expect(
      screen.getByText(/type a question about your finances/i),
    ).toBeInTheDocument();
  });
});
