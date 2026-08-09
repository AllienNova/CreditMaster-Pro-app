/**
 * Webhook idempotency helper — claim-AFTER-success (FND-022).
 *
 * A webhook handler performs multiple network/HTTP side-effects, so it cannot be
 * wrapped in a single Postgres transaction with the sentinel insert. The dispatch
 * sequence is therefore: check the sentinel before dispatch, run the handler, and
 * mark the sentinel ONLY after the handler succeeds. On handler failure the
 * sentinel is not marked, so the route 400s and the provider retries.
 *
 * Both functions THROW on an RPC error — never swallow. A check or mark failure
 * must fail loud so the webhook route returns 400 and the provider retries;
 * silently treating a DB blip as "not processed" or "processed" would either
 * replay or lose the event.
 *
 * Uses a module-level lazy service-role Supabase client (the pattern from
 * src/lib/auth/resolve-role.ts) — the service-role key bypasses RLS, and the
 * RPCs are SECURITY DEFINER with EXECUTE granted only to service_role.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
      );
    }
    // Service-role client: bypasses RLS. Scoped to the SECURITY DEFINER
    // idempotency RPCs only — never reuse it for user-context operations.
    client = createClient(url, key);
  }
  return client;
}

export async function isWebhookEventProcessed(
  provider: string,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await getClient().rpc("is_webhook_event_processed", {
    p_provider: provider,
    p_event_id: eventId,
  });
  if (error) {
    throw new Error(
      `is_webhook_event_processed failed for ${provider}/${eventId}: ${error.message}`,
    );
  }
  // A null `data` with no error is an ambiguous "no result" — not the same as a
  // definitive "not processed". Treating it as false could replay an event;
  // fail loud so the route 400s and the provider retries.
  if (data === null) {
    throw new Error(
      `is_webhook_event_processed returned null for ${provider}/${eventId}`,
    );
  }
  return data === true;
}

export async function markWebhookEventProcessed(
  provider: string,
  eventId: string,
): Promise<void> {
  const { error } = await getClient().rpc("mark_webhook_event_processed", {
    p_provider: provider,
    p_event_id: eventId,
  });
  if (error) {
    throw new Error(
      `mark_webhook_event_processed failed for ${provider}/${eventId}: ${error.message}`,
    );
  }
}
