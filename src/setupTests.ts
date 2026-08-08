import "@testing-library/jest-dom";

// Test-only placeholder for the bank-credential encryption key
// (20260801000020). NOT a secret and never used against a real database — it
// exists so requireTokenEncryptionKey()'s length check passes under jest.
// Real values live in Doppler as BANK_TOKEN_ENCRYPTION_KEY. Set only when
// absent so a suite that deliberately provides its own is not overridden.
process.env.BANK_TOKEN_ENCRYPTION_KEY ??=
  "test-only-not-a-real-key-0000000000000000";

// Polyfill IntersectionObserver for jsdom (used by framer-motion whileInView / ScrollReveal)
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class IntersectionObserverMock {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(private callback: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
}

// Polyfill window.matchMedia for jsdom (used by useReducedMotion and framer-motion)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// Import OpenAI shims for Node.js environment
import "openai/shims/node";

// Polyfill fetch for tests (required by Stripe SDK, OpenAI SDK, etc.)
import { TextEncoder, TextDecoder } from "util";
import fetch, { Response, Request, Headers } from "node-fetch";
import { ReadableStream, WritableStream, TransformStream } from "stream/web";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill fetch, Response, Request, and Headers for MSW
// Use jest.fn() to make fetch mockable in tests
global.fetch = jest.fn(fetch as any) as any;
global.Response = Response as any;
global.Request = Request as any;
global.Headers = Headers as any;

// Polyfill Web Streams API for MSW
global.ReadableStream = ReadableStream as any;
global.WritableStream = WritableStream as any;
global.TransformStream = TransformStream as any;

// Fix for MSW v2 Promise compatibility
// Ensure Promise constructor is properly available
if (typeof global.Promise === "undefined") {
  global.Promise = Promise;
}

// Polyfill BroadcastChannel for MSW
class BroadcastChannelMock {
  constructor(public name: string) {}
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}
global.BroadcastChannel = BroadcastChannelMock as any;

// Set base URL for tests (only in jsdom environment)
// Skip location mocking to avoid jsdom navigation errors
// Tests can mock window.location individually if needed

// Import MSW server setup
import "./__tests__/mocks/server";

// Mock Request and Response for Next.js API routes
if (typeof Request === "undefined") {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    body: any;

    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers as any);
      this.body = init?.body;
    }

    async json() {
      return JSON.parse(this.body || "{}");
    }

    async text() {
      return this.body || "";
    }
  } as any;
}

// Mock NextResponse for API routes
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      status: init?.status || 200,
      json: async () => data,
      headers: new Headers(init?.headers as any),
    }),
    redirect: (url: string) => ({
      status: 307,
      headers: new Headers({ Location: url }),
    }),
  },
  NextRequest: class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;

    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers as any);
      this.nextUrl = new URL(this.url);
    }

    async json() {
      return {};
    }
  },
}));

// Suppress console errors during tests (optional - comment out for debugging)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args: any[]) => {
//     if (args[0]?.includes?.('Warning:')) return;
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });
