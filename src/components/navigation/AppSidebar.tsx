"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Gauge,
  Wallet,
  TrendingUp,
  Receipt,
  Store,
  Sparkles,
  Settings,
  Trophy,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { PRIMARY_NAV } from "@/lib/navigation/primary-nav";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gauge,
  Wallet,
  TrendingUp,
  Receipt,
  Store,
  Sparkles,
  Trophy,
  Settings,
};

/**
 * The group whose section owns `pathname`, so the right group is open on load.
 *
 * Longest-prefix wins: /financial/coach must open "AI" (which owns
 * /financial/coach) rather than "Financial" (which owns /financial), and a
 * first-match scan would pick the wrong one.
 */
function activeGroupLabel(pathname: string): string | null {
  let best: { label: string; len: number } | null = null;
  for (const group of PRIMARY_NAV) {
    for (const item of group.items) {
      const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (hit && (!best || item.href.length > best.len)) {
        best = { label: group.label, len: item.href.length };
      }
    }
  }
  return best?.label ?? null;
}

export function AppSidebar() {
  const pathname = usePathname() ?? "";
  const active = activeGroupLabel(pathname);
  // Only the active group starts open — eight expanded groups is 65 links at
  // once, which is a directory rather than a navigation.
  const [open, setOpen] = useState<string | null>(active);

  // `active` changes on navigation; follow it unless the user has since opened
  // something else.
  const [lastActive, setLastActive] = useState(active);
  if (active !== lastActive) {
    setLastActive(active);
    setOpen(active);
  }

  return (
    <nav
      aria-label="Primary"
      className="w-64 shrink-0 border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div className="sticky top-0 max-h-screen overflow-y-auto py-4">
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-2 px-4 text-lg font-bold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-blue-700 font-bold text-white">
            F
          </span>
          <span className="bg-gradient-to-r from-emerald-600 to-blue-700 bg-clip-text text-transparent">
            Fynvita
          </span>
        </Link>

        <ul className="space-y-1 px-2">
          {PRIMARY_NAV.map((group) => {
            const Icon = ICONS[group.icon] ?? LayoutDashboard;
            const isOpen = open === group.label;

            return (
              <li key={group.label}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : group.label)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <ul className="mt-1 space-y-0.5 border-l border-gray-200 pl-3 dark:border-slate-700">
                    {group.items.map((item) => {
                      const current =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={current ? "page" : undefined}
                            className={`block rounded-md px-3 py-1.5 text-sm ${
                              current
                                ? "bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default AppSidebar;
