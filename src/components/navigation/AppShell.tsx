"use client";

import { usePathname } from "next/navigation";
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

  if (isChromelessRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export default AppShell;
