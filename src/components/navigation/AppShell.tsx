"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";

/**
 * Routes that render WITHOUT the app sidebar.
 *
 * The marketing site has its own <Header>, and the auth and onboarding flows
 * are deliberately chrome-free — showing a signed-in navigation to someone who
 * has not signed in advertises a product surface they cannot reach and offers
 * links that will bounce them straight back to login.
 *
 * A DENYLIST, not an allowlist. The failure this shell exists to fix was a new
 * feature area being invisible because nobody added it to a list; an allowlist
 * would reproduce exactly that. Anything not named here gets the sidebar
 * automatically the day it is created.
 */
const CHROMELESS_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/features",
  "/about",
  "/pricing",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/demo",
];

export function isChromelessRoute(pathname: string): boolean {
  // The marketing home page renders its own Header.
  if (pathname === "/") return true;
  return CHROMELESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation. Without this, tapping a link on a phone
  // navigates behind a drawer that stays open over the page you asked for.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes it, so the drawer is dismissable without hunting for the X.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (isChromelessRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop: always present, part of the layout flow. */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile: off-canvas drawer. */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AppSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The trigger only exists below lg, where the sidebar is hidden. A
            burger with no drawer behind it is worse than no burger. */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-700 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerOpen}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {drawerOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <span className="bg-gradient-to-r from-emerald-600 to-blue-700 bg-clip-text font-bold text-transparent">
            Fynvita
          </span>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
