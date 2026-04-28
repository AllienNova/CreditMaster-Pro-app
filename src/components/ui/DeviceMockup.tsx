"use client";

import type { ReactNode } from "react";

// ============================================================================
// Device Frames — Premium CSS frames with depth effects
// ============================================================================

export function LaptopFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className || ""}`} style={{ perspective: "800px" }}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          transform: "rotateX(2deg)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* Titlebar */}
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 mx-8">
            <div className="bg-gray-800 rounded-md px-3 py-0.5 text-[9px] text-gray-500 text-center">
              app.fynvita.com
            </div>
          </div>
        </div>
        {/* Screen with glare overlay */}
        <div className="relative">
          <div className="relative overflow-hidden">{children}</div>
          {/* Glass glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%)",
            }}
          />
        </div>
        {/* Chin */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700" />
      </div>
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
      className={`relative rounded-[2.5rem] border-[5px] border-gray-900 bg-gray-900 ring-1 ring-white/10 ${className || ""}`}
      style={{
        boxShadow: "0 30px 60px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.1)",
      }}
    >
      {/* Side button */}
      <div className="absolute -right-[7px] top-24 w-[3px] h-8 bg-gray-800 rounded-r" />
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-xl z-10" />
      {/* Screen — fixed iPhone 15 aspect ratio */}
      <div className="relative overflow-hidden rounded-[2rem]" style={{ aspectRatio: "9 / 19.5" }}>
        {children}
        {/* Glass glare */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 35%)",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Laptop Screen Mockup — Pixel-perfect dashboard preview
// ============================================================================

function ScoreArc({ score, size = 32 }: { score: number; size?: number }) {
  const pct = Math.min(score / 850, 1);
  const dashLen = Math.round(pct * 94.2);
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className="-rotate-90">
      <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray={`${dashLen} 94`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sparkline({ trend }: { trend: "up" | "down" }) {
  const d = trend === "up" ? "M0,12 Q4,10 8,8 T16,4 T24,2" : "M0,2 Q8,6 16,10 T24,12";
  return (
    <svg viewBox="0 0 24 14" width={24} height={14}>
      <path d={d} fill="none" stroke={trend === "up" ? "#10b981" : "#ef4444"} strokeWidth="1.5" />
    </svg>
  );
}

export function LaptopScreenMockup() {
  return (
    <div className="flex bg-gray-50 select-none" style={{ fontSize: "10px" }}>
      {/* Sidebar */}
      <div className="w-[140px] bg-slate-900 text-white p-3 flex flex-col min-h-[280px]">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <span className="text-[6px] font-bold">F</span>
          </div>
          <span className="text-[10px] font-semibold tracking-tight">Fynvita</span>
        </div>
        <nav className="space-y-0.5 flex-1">
          {[
            { name: "Dashboard", active: true },
            { name: "Credit Health", active: false },
            { name: "Budget", active: false },
            { name: "Investments", active: false },
            { name: "AI Coach", active: false },
          ].map((item) => (
            <div
              key={item.name}
              className={`px-2 py-1 rounded text-[8px] ${
                item.active
                  ? "bg-slate-800 text-emerald-400 border-l-2 border-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {item.name}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-700">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[6px] font-bold">
            AJ
          </div>
          <span className="text-[8px] text-slate-400">Alex Johnson</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-3">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-900">Good morning, Alex</p>
            <p className="text-[7px] text-gray-400">Monday, April 28</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[7px] font-bold">
            731 FICO
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[7px] text-gray-400 mb-0.5">Net Worth</p>
            <div className="flex items-center gap-1">
              <p className="text-[11px] font-bold text-gray-900">$47,250</p>
              <Sparkline trend="up" />
            </div>
            <p className="text-[6px] text-emerald-600">+$2,180/mo</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[7px] text-gray-400 mb-0.5">Credit Score</p>
            <div className="flex items-center gap-1.5">
              <ScoreArc score={731} size={24} />
              <div>
                <p className="text-[11px] font-bold text-gray-900">731</p>
                <p className="text-[6px] text-emerald-600">Good</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[7px] text-gray-400 mb-0.5">Savings</p>
            <p className="text-[11px] font-bold text-gray-900">$1,840</p>
            <p className="text-[6px] text-blue-500">22% of income</p>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[7px] text-gray-400 mb-0.5">AI Actions</p>
            <p className="text-[11px] font-bold text-amber-600">3</p>
            <p className="text-[6px] text-gray-500">1 dispute ready</p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {/* Chart — 3 cols */}
          <div className="col-span-3 bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[8px] font-semibold text-gray-900 mb-1">
              Credit Score — 90 Day Trend
            </p>
            <svg viewBox="0 0 260 70" className="w-full">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[14, 28, 42, 56].map((y) => (
                <line key={y} x1="20" y1={y} x2="255" y2={y} stroke="#f3f4f6" strokeWidth="0.5" />
              ))}
              {/* Y-axis labels */}
              <text x="2" y="16" fill="#9ca3af" fontSize="4">750</text>
              <text x="2" y="30" fill="#9ca3af" fontSize="4">700</text>
              <text x="2" y="44" fill="#9ca3af" fontSize="4">650</text>
              <text x="2" y="58" fill="#9ca3af" fontSize="4">600</text>
              {/* Area fill */}
              <path
                d="M20,52 C60,50 80,46 100,42 C120,38 140,30 160,24 C180,18 200,12 220,8 C235,5 245,4 255,4 L255,62 L20,62 Z"
                fill="url(#chartFill)"
              />
              {/* Line */}
              <path
                d="M20,52 C60,50 80,46 100,42 C120,38 140,30 160,24 C180,18 200,12 220,8 C235,5 245,4 255,4"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Current point */}
              <circle cx="255" cy="4" r="2.5" fill="white" stroke="#10b981" strokeWidth="1.5" />
              <text x="242" y="0" fill="#10b981" fontSize="5" fontWeight="bold">731</text>
              {/* X-axis */}
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
                <text key={m} x={20 + i * 47} y="68" fill="#9ca3af" fontSize="4">{m}</text>
              ))}
            </svg>
            {/* Bureau chips */}
            <div className="flex gap-1 mt-1">
              {[
                { name: "Experian", score: "728" },
                { name: "Equifax", score: "735" },
                { name: "TransUnion", score: "731" },
              ].map((b) => (
                <div
                  key={b.name}
                  className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-center"
                >
                  <span className="text-[8px] font-bold text-gray-900">{b.score}</span>
                  <span className="text-[6px] text-gray-400 ml-0.5">{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — 2 cols */}
          <div className="col-span-2 space-y-1.5">
            {/* AI Recommendations */}
            <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[8px]">&#10024;</span>
                <span className="text-[8px] font-semibold text-emerald-700">Fynvita AI</span>
                <span className="bg-emerald-500 text-white text-[5px] font-bold px-1 py-px rounded-full ml-auto">
                  3 new
                </span>
              </div>
              {[
                { color: "bg-emerald-500", text: "Dispute Chase late payment", impact: "+22–40 pts" },
                { color: "bg-blue-500", text: "Lower Amex utilization to 8%", impact: "+15 pts" },
                { color: "bg-amber-500", text: "Add as authorized user", impact: "+12 pts" },
              ].map((rec) => (
                <div key={rec.text} className="flex items-center gap-1.5 py-1 border-t border-emerald-100/50">
                  <div className={`w-1.5 h-1.5 rounded-full ${rec.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] text-gray-800 truncate">{rec.text}</p>
                    <p className="text-[6px] text-emerald-600">{rec.impact}</p>
                  </div>
                  <button className="bg-emerald-500 text-white text-[5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Apply
                  </button>
                </div>
              ))}
            </div>

            {/* Spending vs Budget */}
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <p className="text-[8px] font-semibold text-gray-900 mb-1">Spending vs Budget</p>
              {[
                { name: "Housing", spent: 1450, budget: 1500, color: "bg-blue-500" },
                { name: "Food", spent: 380, budget: 500, color: "bg-emerald-500" },
                { name: "Transport", spent: 210, budget: 300, color: "bg-emerald-400" },
                { name: "Fun", spent: 145, budget: 150, color: "bg-amber-500" },
              ].map((cat) => (
                <div key={cat.name} className="flex items-center gap-1 mb-1">
                  <span className="text-[6px] text-gray-500 w-10 text-right">{cat.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${(cat.spent / cat.budget) * 100}%` }}
                    />
                  </div>
                  <span className="text-[6px] text-gray-500 w-14">
                    ${cat.spent.toLocaleString()}/${cat.budget.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mobile Screen Mockup — Pixel-perfect mobile app preview
// ============================================================================

export function MobileScreenMockup() {
  return (
    <div className="bg-white select-none" style={{ fontSize: "10px" }}>
      {/* Gradient header */}
      <div className="bg-gradient-to-b from-emerald-600 to-blue-600 px-4 pt-7 pb-4">
        {/* Status bar */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[8px] text-white/70">9:41</span>
          <span className="text-[9px] font-semibold text-white tracking-tight">Fynvita</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-white/30" />
          </div>
        </div>

        {/* Greeting + Score */}
        <p className="text-[9px] text-white/80">Hi, Alex</p>
        <p className="text-[7px] text-white/50 mb-2">Your financial score</p>

        <div className="flex flex-col items-center mb-2">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
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
              <span className="text-[14px] font-bold text-white leading-none">731</span>
              <span className="text-[5px] text-white/70">FICO</span>
            </div>
          </div>
          <p className="text-[7px] text-emerald-200 mt-1 flex items-center gap-0.5">
            <span>&#9650;</span> +18 pts this month
          </p>
        </div>

        {/* Badge */}
        <div className="flex justify-center mb-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="text-[6px]">&#9733;</span>
            <span className="text-[7px] font-medium text-white">Financial Warrior</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-1.5">
          {["Budget", "Credit", "Invest", "Coach"].map((action) => (
            <div key={action} className="bg-white/15 rounded-lg py-1.5 text-center">
              <div className="w-3.5 h-3.5 mx-auto mb-0.5 rounded bg-white/20" />
              <p className="text-[6px] font-medium text-white">{action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* White card area */}
      <div className="bg-white rounded-t-2xl -mt-2 relative z-10 px-3 pt-3 pb-2 space-y-2">
        {/* This Month */}
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <p className="text-[8px] font-semibold text-gray-900 mb-1">This Month</p>
          <div className="flex justify-between mb-1">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[7px] text-gray-500">Income</span>
              <span className="text-[8px] font-bold text-gray-900">$8,350</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="text-[7px] text-gray-500">Expenses</span>
              <span className="text-[8px] font-bold text-gray-700">$6,510</span>
            </div>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
              style={{ width: "78%" }}
            />
          </div>
          <p className="text-[6px] text-gray-400 mt-0.5">78% of budget used</p>
        </div>

        {/* AI Insight */}
        <div className="bg-emerald-50 rounded-lg p-2 border-l-2 border-emerald-500">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[7px]">&#10024;</span>
            <span className="text-[7px] font-semibold text-emerald-700">Fynvita AI</span>
          </div>
          <p className="text-[7px] text-gray-700 leading-relaxed">
            Your Equifax score jumped 15 pts after the Capital One payment posted.
          </p>
          <p className="text-[6px] text-emerald-600 font-medium mt-0.5">See full analysis &rarr;</p>
        </div>

        {/* Upcoming Bills */}
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[8px] font-semibold text-gray-900">Upcoming Bills</p>
            <span className="text-[6px] text-blue-500">View all</span>
          </div>
          {[
            { icon: "C", color: "bg-blue-500", name: "Chase Sapphire", due: "Apr 30", amount: "$245" },
            { icon: "A", color: "bg-emerald-500", name: "Amex Gold", due: "May 3", amount: "$1,240" },
          ].map((bill) => (
            <div key={bill.name} className="flex items-center gap-1.5 py-1 border-t border-gray-50">
              <div className={`w-4 h-4 rounded-full ${bill.color} flex items-center justify-center text-[6px] font-bold text-white`}>
                {bill.icon}
              </div>
              <div className="flex-1">
                <p className="text-[7px] font-medium text-gray-900">{bill.name}</p>
                <p className="text-[6px] text-gray-400">Due {bill.due}</p>
              </div>
              <p className="text-[8px] font-bold text-gray-900">{bill.amount}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex justify-around items-center bg-white border-t border-gray-100 px-2 py-1.5">
        {[
          { name: "Home", active: true },
          { name: "Credit", active: false },
          { name: "Budget", active: false },
          { name: "Invest", active: false },
          { name: "More", active: false },
        ].map((tab) => (
          <div key={tab.name} className="text-center">
            <div
              className={`w-3.5 h-3.5 mx-auto mb-0.5 rounded ${
                tab.active ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
            <p
              className={`text-[5px] ${
                tab.active ? "text-emerald-600 font-semibold" : "text-gray-400"
              }`}
            >
              {tab.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
