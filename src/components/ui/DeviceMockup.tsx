"use client";

import type { ReactNode } from "react";

export function LaptopFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden shadow-2xl ${className || ""}`}
    >
      <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 mx-12">
          <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-center">
            app.fynvita.com
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900">{children}</div>
    </div>
  );
}

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl overflow-hidden ${className || ""}`}
    >
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
        <div className="bg-white dark:bg-gray-900 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DashboardMockup({ expanded }: { expanded?: boolean }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Welcome back
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Dashboard
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
          AJ
        </div>
      </div>

      {/* Credit Score + Net Worth row */}
      <div className={`grid ${expanded ? "grid-cols-3" : "grid-cols-2"} gap-3 mb-3`}>
        {/* Credit Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-[8px] text-gray-500 dark:text-gray-400 mb-1">
            Credit Score
          </p>
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                  className="dark:stroke-gray-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="69 94"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-900 dark:text-white">
                731
              </span>
            </div>
            <div>
              <p className="text-[8px] font-medium text-emerald-600 dark:text-emerald-400">
                Good
              </p>
              <p className="text-[7px] text-gray-400">+18 pts</p>
            </div>
          </div>
        </div>

        {/* Net Worth Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-[8px] text-gray-500 dark:text-gray-400 mb-1">
            Net Worth
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            $47,250
          </p>
          <p className="text-[7px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            +$2,180 this month
          </p>
        </div>

        {/* Savings (expanded only) */}
        {expanded && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[8px] text-gray-500 dark:text-gray-400 mb-1">
              Monthly Savings
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              $1,840
            </p>
            <p className="text-[7px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              22% of income
            </p>
          </div>
        )}
      </div>

      {/* 3-bureau row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { name: "Experian", score: "728" },
          { name: "Equifax", score: "735" },
          { name: "TransUnion", score: "731" },
        ].map((bureau) => (
          <div
            key={bureau.name}
            className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-gray-200 dark:border-gray-700"
          >
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              {bureau.score}
            </p>
            <p className="text-[7px] text-gray-500 dark:text-gray-400">
              {bureau.name}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <p className="text-[8px] font-semibold text-gray-900 dark:text-white mb-2">
          Recent Activity
        </p>
        <div className="space-y-2">
          {[
            {
              label: "Dispute resolved",
              value: "+15 pts",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Bill payment",
              value: "-$142.00",
              color: "text-gray-600 dark:text-gray-400",
            },
            {
              label: "Savings deposit",
              value: "+$500.00",
              color: "text-blue-600 dark:text-blue-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between"
            >
              <p className="text-[8px] text-gray-600 dark:text-gray-400">
                {item.label}
              </p>
              <p className={`text-[8px] font-medium ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileMockup() {
  return (
    <div className="bg-gradient-to-b from-emerald-500 to-blue-600 pt-8 pb-4 px-4 select-none">
      {/* Status bar space */}
      <div className="h-4" />

      {/* Credit score circle */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeDasharray="69 94"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white leading-none">
              731
            </span>
            <span className="text-[7px] text-white/80">Good</span>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="flex justify-center mb-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
          <span className="text-[9px]">&#9733;</span>
          <span className="text-[8px] font-medium text-white">
            Financial Warrior
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {["Budget", "Invest", "Savings", "Coach"].map((action) => (
          <div
            key={action}
            className="bg-white/15 backdrop-blur-sm rounded-lg py-2 text-center"
          >
            <p className="text-[8px] font-medium text-white">{action}</p>
          </div>
        ))}
      </div>

      {/* Mini cards */}
      <div className="space-y-2">
        <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[8px] text-white/80">Net Worth</span>
            <span className="text-[9px] font-bold text-white">$47,250</span>
          </div>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[8px] text-white/80">This Month</span>
            <span className="text-[9px] font-bold text-emerald-200">
              +$2,180
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-4 flex justify-around bg-white/10 rounded-xl py-2">
        {["Home", "Credit", "Budget", "Invest", "More"].map((tab) => (
          <div key={tab} className="text-center">
            <div className="w-3 h-3 mx-auto mb-0.5 rounded-sm bg-white/30" />
            <p
              className={`text-[6px] ${tab === "Home" ? "text-white font-medium" : "text-white/60"}`}
            >
              {tab}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
