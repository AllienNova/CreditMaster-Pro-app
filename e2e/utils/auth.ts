import type { Page } from '@playwright/test';

export const AUTH_STORAGE_STATE = 'e2e/.auth/user.json';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_ACCESS_TOKEN = 'test-access-token';

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;
}

function getSupabaseStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return 'sb-auth-token';
  }

  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    return 'sb-auth-token';
  }

  return `sb-${match[1]}-auth-token`;
}

function buildSession() {
  const now = Math.floor(Date.now() / 1000);

  return {
    access_token: DEFAULT_ACCESS_TOKEN,
    refresh_token: 'test-refresh-token',
    expires_in: 60 * 60 * 24,
    expires_at: now + 60 * 60 * 24,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        full_name: 'Test User',
      },
    },
  };
}

export function buildStorageState() {
  const baseUrl = getBaseUrl();
  const hostname = new URL(baseUrl).hostname;
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const session = buildSession();
  const sessionValue = JSON.stringify(session);

  return {
    cookies: [
      {
        name: 'sb-access-token',
        value: DEFAULT_ACCESS_TOKEN,
        domain: hostname,
        path: '/',
        httpOnly: false,
        secure: baseUrl.startsWith('https://'),
        sameSite: 'Lax',
        expires,
      },
      {
        name: 'supabase-auth-token',
        value: DEFAULT_ACCESS_TOKEN,
        domain: hostname,
        path: '/',
        httpOnly: false,
        secure: baseUrl.startsWith('https://'),
        sameSite: 'Lax',
        expires,
      },
    ],
    origins: [
      {
        origin: baseUrl,
        localStorage: [
          {
            name: getSupabaseStorageKey(),
            value: sessionValue,
          },
          {
            name: 'supabase.auth.token',
            value: sessionValue,
          },
        ],
      },
    ],
  };
}

export async function restoreAuthSession(page: Page) {
  const baseUrl = getBaseUrl();
  const hostname = new URL(baseUrl).hostname;
  const session = buildSession();
  const sessionValue = JSON.stringify(session);
  const storageKey = getSupabaseStorageKey();

  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: DEFAULT_ACCESS_TOKEN,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: baseUrl.startsWith('https://'),
      sameSite: 'Lax',
    },
    {
      name: 'supabase-auth-token',
      value: DEFAULT_ACCESS_TOKEN,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: baseUrl.startsWith('https://'),
      sameSite: 'Lax',
    },
  ]);

  await page.goto(baseUrl);
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
      localStorage.setItem('supabase.auth.token', value);
    },
    [storageKey, sessionValue]
  );
}
