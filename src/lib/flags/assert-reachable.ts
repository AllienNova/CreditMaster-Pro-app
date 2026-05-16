import { isFlagEnabled, __clearFlagCache } from "./index";

/**
 * Boot-time assertion that the feature-flag table is reachable via the
 * service-role client. Throws loudly if the underlying Supabase call rejects
 * (e.g. a misconfigured SUPABASE_SERVICE_ROLE_KEY) so the process fails fast
 * instead of silently defaulting every flag to false.
 */
export async function assertFlagsReachable(): Promise<void> {
  __clearFlagCache();
  try {
    await isFlagEnabled("webhooks.enabled");
  } catch (cause) {
    throw new Error(
      "Feature-flag store unreachable: the Supabase service-role client failed " +
        "to read feature_flags. Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.",
      { cause },
    );
  }
}
