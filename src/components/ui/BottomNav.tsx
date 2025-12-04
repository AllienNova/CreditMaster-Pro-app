"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "🏠", activeIcon: "🏡" },
  { href: "/credit-repair", label: "Repair", icon: "🔧", activeIcon: "🛠️" },
  { href: "/disputes", label: "Disputes", icon: "📝", activeIcon: "📋" },
  { href: "/analytics", label: "Stats", icon: "📊", activeIcon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️", activeIcon: "🔧" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show on certain pages
  const hiddenPaths = ["/auth", "/onboarding", "/admin"];
  if (hiddenPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition ${
                isActive ? "text-emerald-600" : "text-gray-500"
              }`}
            >
              <span className="text-xl mb-0.5">{isActive ? item.activeIcon : item.icon}</span>
              <span className={`text-xs ${isActive ? "font-medium" : ""}`}>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

