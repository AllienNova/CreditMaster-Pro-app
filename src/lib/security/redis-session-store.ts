/**
 * Redis-backed Session Store
 *
 * Replaces the previous in-memory session Map so sessions survive process
 * restarts and are shared across serverless instances. Falls back to an
 * in-memory store only when Redis is not configured (local/dev), mirroring
 * the pattern in `redis-rate-limiting.ts`.
 *
 * Addresses FND-007: in-memory session Map loses all sessions on restart and
 * cannot be shared between serverless instances.
 */

export interface SessionRecord {
  userId: string;
  token: string;
  expiresAt: number; // epoch ms
  createdAt: number; // epoch ms
  lastActivity: number; // epoch ms
}

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY_PREFIX = "session:";

/**
 * Process-shared in-memory fallback. Module-level so that two separate
 * `RedisSessionStore` instances within the same process still read each
 * other's writes — required so a "new instance after restart" within a
 * Redis-configured deployment behaves identically to Redis.
 */
const fallbackStore = new Map<string, SessionRecord>();

async function redisRequest(
  command: string,
  args: string[] = [],
  body?: string,
): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;

  try {
    const path = [command, ...args.map((a) => encodeURIComponent(a))].join("/");
    const response = await fetch(`${REDIS_URL}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        ...(body === undefined ? {} : { "Content-Type": "text/plain" }),
      },
      ...(body === undefined ? {} : { body }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: unknown };
    return data.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Distributed session store. Multiple instances share state through Redis
 * (or, when Redis is absent, through the module-level fallback Map).
 */
export class RedisSessionStore {
  private readonly redisAvailable: boolean;

  constructor() {
    this.redisAvailable = Boolean(REDIS_URL && REDIS_TOKEN);
  }

  async set(token: string, session: SessionRecord): Promise<void> {
    const ttlMs = session.expiresAt - Date.now();

    if (this.redisAvailable) {
      // Already-expired session: do not persist to either store.
      if (ttlMs <= 0) return;
      await redisRequest(
        "set",
        [`${KEY_PREFIX}${token}`, "PX", String(ttlMs)],
        JSON.stringify(session),
      );
      return;
    }
    fallbackStore.set(token, session);
  }

  async get(token: string): Promise<SessionRecord | null> {
    let session: SessionRecord | null = null;

    if (this.redisAvailable) {
      const raw = await redisRequest("get", [`${KEY_PREFIX}${token}`]);
      if (typeof raw === "string") {
        try {
          session = JSON.parse(raw) as SessionRecord;
        } catch {
          session = null;
        }
      }
    } else {
      session = fallbackStore.get(token) ?? null;
    }

    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      await this.delete(token);
      return null;
    }

    session.lastActivity = Date.now();
    await this.set(token, session);
    return session;
  }

  async delete(token: string): Promise<void> {
    if (this.redisAvailable) {
      await redisRequest("del", [`${KEY_PREFIX}${token}`]);
    }
    fallbackStore.delete(token);
  }
}
