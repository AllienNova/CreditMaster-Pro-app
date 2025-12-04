import '@testing-library/jest-dom';

// Import OpenAI shims for Node.js environment
import 'openai/shims/node';

// Polyfill fetch for tests (required by Stripe SDK, OpenAI SDK, etc.)
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock fetch globally for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  } as Response)
);

// Mock Request and Response for Next.js API routes
if (typeof Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    body: any;

    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }

    async text() {
      return this.body || '';
    }
  } as any;
}

// Mock NextResponse for API routes
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      status: init?.status || 200,
      json: async () => data,
      headers: new Headers(init?.headers),
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
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
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
