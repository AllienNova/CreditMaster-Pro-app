/**
 * Per-service liveness probes for the admin health dashboard (FR-303 / M4-1).
 *
 * Honesty contract (Wave 7): a service is NEVER reported `healthy` unless a
 * real, credential-bearing liveness call to it actually succeeded. The
 * underlying clients all tolerate an empty API key (they construct fine with
 * `""`), so an unconfigured service would otherwise read as green — the exact
 * fake-green defect this route replaces (`src/lib/monitoring/health.ts` pings
 * nothing and always returns healthy). Each probe therefore:
 *
 *   1. gates on required env being present + non-empty → `unknown` if not
 *      ("cannot assess", honestly — never `healthy`);
 *   2. runs one cheap, read-only, time-bounded liveness call →
 *      `healthy` on success, `down` on any error or timeout.
 *
 * Secrets are never read into a result: only env *presence* is checked, and a
 * failure detail is the SDK's own error message, never a key value.
 */

import "openai/shims/node";
import OpenAI from "openai";
import Stripe from "stripe";
import { Resend } from "resend";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { CountryCode } from "plaid";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlaidClient } from "@/lib/financial/plaid-client";

/** Per-service result. `unknown` = not configured; `down` = probe failed. */
export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceHealth {
  service: string;
  status: ServiceStatus;
  detail?: string;
}

export interface SystemHealth {
  status: ServiceStatus;
  checkedAt: string;
  services: ServiceHealth[];
}

/** Probes run in parallel; each is bounded so a hung dependency never blocks. */
const PROBE_TIMEOUT_MS = 3000;

const AIML_DEFAULT_BASE_URL = "https://api.aimlapi.com/v1";
const AWS_DEFAULT_REGION = "us-east-1";

/** True only if every named env var is present and non-empty. */
function hasEnv(...names: string[]): boolean {
  return names.every((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** Cap detail length so a verbose vendor error body never bloats the response. */
const MAX_DETAIL_LENGTH = 200;

function errorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : "probe failed";
  return message.slice(0, MAX_DETAIL_LENGTH);
}

/** Reject after `ms` so a slow/hung liveness call resolves to `down`. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`probe timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Run one probe. `configured` is the honesty gate: when false, the liveness
 * call is never made and the service reports `unknown` — an unconfigured
 * dependency must never masquerade as healthy.
 */
async function probe(
  service: string,
  configured: boolean,
  liveness: () => Promise<void>,
): Promise<ServiceHealth> {
  if (!configured) {
    return { service, status: "unknown", detail: "not configured" };
  }
  try {
    await withTimeout(liveness(), PROBE_TIMEOUT_MS);
    return { service, status: "healthy" };
  } catch (error) {
    return { service, status: "down", detail: errorDetail(error) };
  }
}

export function probeSupabase(): Promise<ServiceHealth> {
  const configured =
    hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    (hasEnv("SUPABASE_SERVICE_ROLE_KEY") ||
      hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  return probe("Supabase", configured, async () => {
    // head+count avoids returning rows; `profiles` is the canonical table the
    // auth layer already resolves roles from, so it is guaranteed to exist.
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" });
    if (error) throw new Error(error.message);
  });
}

export function probeStripe(): Promise<ServiceHealth> {
  return probe("Stripe", hasEnv("STRIPE_SECRET_KEY"), async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    await stripe.balance.retrieve();
  });
}

export function probeAIML(): Promise<ServiceHealth> {
  return probe("AIML", hasEnv("AIML_API_KEY"), async () => {
    const client = new OpenAI({
      apiKey: process.env.AIML_API_KEY as string,
      baseURL: process.env.AIML_BASE_URL || AIML_DEFAULT_BASE_URL,
    });
    await client.models.list();
  });
}

export function probePlaid(): Promise<ServiceHealth> {
  const configured = hasEnv("PLAID_CLIENT_ID", "PLAID_SECRET");
  return probe("Plaid", configured, async () => {
    // institutionsGet validates client_id + secret against Plaid; count 1 keeps
    // it cheap. getPlaidClient() reuses the app's configured SDK instance.
    await getPlaidClient().institutionsGet({
      count: 1,
      offset: 0,
      country_codes: [CountryCode.Us],
    });
  });
}

export function probeS3(): Promise<ServiceHealth> {
  const configured = hasEnv(
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
  );
  return probe("S3", configured, async () => {
    const client = new S3Client({
      region: process.env.AWS_REGION || AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    await client.send(
      new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET }),
    );
  });
}

export function probeResend(): Promise<ServiceHealth> {
  return probe("Resend", hasEnv("RESEND_API_KEY"), async () => {
    const resend = new Resend(process.env.RESEND_API_KEY as string);
    const { error } = await resend.apiKeys.list();
    if (error) throw new Error(error.message || "Resend API error");
  });
}

const PROBES: Array<() => Promise<ServiceHealth>> = [
  probeSupabase,
  probeStripe,
  probeAIML,
  probePlaid,
  probeS3,
  probeResend,
];

/** Worst component wins: any `down` → down; else any unconfigured → degraded. */
function overallStatus(services: ServiceHealth[]): ServiceStatus {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "unknown" || s.status === "degraded")) {
    return "degraded";
  }
  return "healthy";
}

export async function probeAllServices(): Promise<SystemHealth> {
  const services = await Promise.all(PROBES.map((run) => run()));
  return {
    status: overallStatus(services),
    checkedAt: new Date().toISOString(),
    services,
  };
}
