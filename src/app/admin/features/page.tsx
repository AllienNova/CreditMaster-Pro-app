"use client";



/*
 * WHAT THIS REPLACED, and why nothing is wired in its place.
 *
 * `initialFlags` invented six feature flags — ai_dispute_v2 at 100% rollout,
 * credit_score_simulator, and so on — with toggles and rollout sliders that
 * changed React state and nothing else.
 *
 * THERE IS A REAL FLAG SYSTEM, AND THIS IS NOT IT. `public.feature_flags`
 * (migration 20260516000000) is `key, enabled, description, updated_at`, read
 * ONLY through the service-role client in src/lib/flags/index.ts, with the
 * AUTH-04 kill-switch depending on it. There is no HTTP route to read or
 * write it — `isFlagEnabled(key)` is server-side.
 *
 * So this page could not be wired without building that route, and it should
 * not be wired to the shape it had: the invented flags carry `rollout` and
 * `environment`, and the real table has NEITHER column. An operator dragging a
 * slider to "50% rollout" or picking "staging only" would be configuring
 * something the flag system cannot express — a control implying a capability
 * that does not exist, which is worse than a missing screen because it looks
 * like governance.
 *
 * The screen now says what is true and offers no controls. Wiring it needs a
 * GET/PATCH route over feature_flags, classified in the auth inventory, and a
 * decision about whether rollout and environment targeting are wanted at all.
 */

export default function AdminFeaturesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Feature Flags
      </h1>
      <p className="text-gray-600 dark:text-slate-300 mb-8">
        Flag administration is not available from this screen
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 max-w-3xl">
        <p className="text-gray-900 dark:text-white font-medium mb-2">
          Flags are real, but they cannot be managed here yet
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
          Fynvita reads feature flags from <code>public.feature_flags</code>
          through the service-role client only, and no HTTP route exposes them
          for reading or editing. This screen previously showed six flags that
          did not exist, with toggles and rollout sliders that changed nothing.
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Percentage rollout and per-environment targeting are not supported at
          all — the table stores a key and a boolean. Those controls implied a
          capability the flag system does not have, so they are gone rather
          than disabled.
        </p>
      </div>
    </div>
  );
}
