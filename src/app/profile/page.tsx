"use client";

/**
 * Profile.
 *
 * WHAT THIS PAGE USED TO SHOW EVERY USER AS THEIR OWN.
 *
 *   name "John Doe", email "john@example.com", phone "(555) 123-4567",
 *   "Premium Member", "Member since January 2024", avatar initials "JD"
 *   stats: Credit Score 720, Items Removed 12, Success Rate 78%
 *   achievements: "First Dispute — earned Nov 15, 2024"
 *   activity: "Dispute resolved — Late payment removed from Experian, 2 hours ago"
 *
 * The identity itself was hardcoded, so the screen told you your own name was
 * John Doe. `audit:screen-data` caught only half of that: the profile lived in
 * a `useState` object literal rather than a module-level array, which is
 * outside what that detector inspects. It found the two arrays and missed the
 * person.
 *
 * "Save" was theatre as well — the button flipped `isEditing` and nothing
 * else. No request was ever made, so an edit lasted until the next page load.
 *
 * WHAT IT READS NOW. All four routes already existed:
 *   GET   /api/profile                    -> { profile: { full_name, email, phone,
 *                                              created_at, subscription, ... },
 *                                              stats: { creditScore, totalDisputes,
 *                                              resolvedDisputes, successRate } }
 *   PATCH /api/profile                    -> allowed fields: full_name, phone,
 *                                              address, avatar_url
 *   GET   /api/activity                   -> { activities: [...] } (503 on failure,
 *                                              never a mock)
 *   GET   /api/gamification/achievements  -> { success, data: { achievements } },
 *                                              backed by achievement_definitions
 *                                              and user_achievements
 *
 * "Items Removed" is now "Disputes Resolved", for the same reason as on
 * /analytics: the stats block counts resolved disputes, and a resolved dispute
 * is not an item removed from a credit report.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface Profile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  subscription?: { plan?: string | null; tier?: string | null } | null;
}

interface Stats {
  creditScore?: number | null;
  totalDisputes?: number | null;
  resolvedDisputes?: number | null;
  successRate?: number | null;
}

interface Activity {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

interface Achievement {
  id: string;
  status: string;
  completedAt: string | null;
  achievement: {
    name: string;
    description: string;
    icon: string;
    tier: string;
  };
}

/** Initials from the real name; falls back to the email, then to nothing. */
function initials(profile: Profile | null): string {
  const name = profile?.full_name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  const email = profile?.email?.trim();
  return email ? email[0].toUpperCase() : "";
}

function formatMonth(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const body = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok
        ? await r.value.json().catch(() => null)
        : null;

    const [profileRes, activityRes, achievementsRes] = await Promise.allSettled([
      fetch("/api/profile"),
      fetch("/api/activity"),
      fetch("/api/gamification/achievements"),
    ]);
    const [profileJson, activityJson, achievementsJson] = await Promise.all([
      body(profileRes),
      body(activityRes),
      body(achievementsRes),
    ]);

    if (profileJson?.profile) {
      const p = profileJson.profile as Profile;
      setProfile(p);
      setStats((profileJson.stats as Stats | undefined) ?? null);
      setDraft({ full_name: p.full_name ?? "", phone: p.phone ?? "" });
    } else {
      setProfile(null);
      setError(
        "We could not load your profile. Nothing here is filled in for you — try again in a moment.",
      );
    }

    setActivities(
      Array.isArray(activityJson?.activities)
        ? (activityJson.activities as Activity[])
        : [],
    );
    setAchievements(
      Array.isArray(achievementsJson?.data?.achievements)
        ? (achievementsJson.data.achievements as Achievement[])
        : [],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Actually writes. The old button only toggled isEditing, so an edit
     survived until the next page load and no further. */
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setError("We could not save your changes.");
      } else {
        setIsEditing(false);
        await load();
      }
    } catch {
      setError("We could not save your changes.");
    }
    setSaving(false);
  };

  const planLabel =
    profile?.subscription?.plan ?? profile?.subscription?.tier ?? null;
  const memberSince = formatMonth(profile?.created_at);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link
            href="/dashboard"
            className="text-emerald-100 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800/20 flex items-center justify-center text-4xl font-bold">
              {initials(profile)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {profile?.full_name || "Your profile"}
              </h1>
              {profile?.email && (
                <p className="text-emerald-100">{profile.email}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                {planLabel && (
                  <span className="px-3 py-1 bg-white dark:bg-slate-800/20 rounded-full text-sm">
                    {planLabel} Member
                  </span>
                )}
                {memberSince && (
                  <span className="text-sm text-emerald-100">
                    Member since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Your profile is unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Stats, all from /api/profile's own stats block. */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Credit Score", value: stats?.creditScore },
                {
                  // Not "Items Removed": the route counts resolved disputes.
                  label: "Disputes Resolved",
                  value: stats?.resolvedDisputes,
                },
                {
                  label: "Success Rate",
                  value:
                    typeof stats?.successRate === "number"
                      ? `${Math.round(stats.successRate)}%`
                      : undefined,
                },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-center"
                >
                  <p className="text-3xl font-bold text-emerald-500">
                    {tile.value ?? "—"}
                  </p>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    {tile.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Personal Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Personal Information
                </h2>
                <button
                  onClick={() => (isEditing ? save() : setIsEditing(true))}
                  disabled={saving || !profile}
                  className="text-emerald-500 hover:text-emerald-600 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEditing ? "Save" : "Edit"}
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        aria-label="Full Name"
                        value={draft.full_name}
                        onChange={(e) =>
                          setDraft({ ...draft, full_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {profile?.full_name || "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profile?.email || "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        aria-label="Phone"
                        value={draft.phone}
                        onChange={(e) =>
                          setDraft({ ...draft, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {profile?.phone || "Not set"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">
                      Plan
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {planLabel || "Free"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
              </div>
              {loading ? (
                <div className="p-6 h-24 animate-pulse bg-gray-100 dark:bg-slate-700" />
              ) : activities.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 dark:text-slate-400">
                  Nothing has happened on your account yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {activities.slice(0, 8).map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 flex items-center gap-4"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {activity.message}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400 dark:text-slate-500">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Achievements
              </h2>
            </div>
            {achievements.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 dark:text-slate-400">
                No achievements yet.
              </p>
            ) : (
              <div className="p-4 space-y-3">
                {achievements.map((item) => {
                  const earned = item.status === "completed";
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg ${
                        earned
                          ? "bg-emerald-50 dark:bg-emerald-900/20"
                          : "bg-gray-50 dark:bg-slate-900 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          name={item.achievement.icon}
                          className="text-2xl inline-block"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.achievement.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {item.achievement.description}
                          </p>
                          {earned && item.completedAt && (
                            <p className="text-xs text-emerald-500 mt-1">
                              Earned {formatMonth(item.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
