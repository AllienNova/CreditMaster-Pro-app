# Fynvita AI Personalization & Gamification Design Document

**Date**: January 20, 2026  
**Version**: 1.0  
**Status**: Design Phase

---

## Table of Contents

1. [AI Workflow Diagrams](#ai-workflow-diagrams)
2. [Gamified Dashboard Mockups](#gamified-dashboard-mockups)
3. [Component Specifications](#component-specifications)
4. [Data Flow Architecture](#data-flow-architecture)
5. [API Contracts](#api-contracts)

---

## AI Workflow Diagrams

### 1. Behavioral Finance Coaching Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BEHAVIORAL FINANCE COACHING PIPELINE                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  USER DATA   │
                              │  COLLECTION  │
                              └──────┬───────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Transaction    │     │    Behavior      │     │   Engagement     │
│   History        │     │    Signals       │     │   Patterns       │
│   ─────────────  │     │   ─────────────  │     │   ─────────────  │
│   • Amount       │     │   • App usage    │     │   • Session time │
│   • Category     │     │   • Goal updates │     │   • Feature use  │
│   • Timing       │     │   • Trading acts │     │   • Click paths  │
│   • Location     │     │   • Survey resp  │     │   • Notification │
│   • Merchant     │     │   • Settings     │     │     response     │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   FEATURE EXTRACTION    │
                    │   ─────────────────────  │
                    │   • Spending velocity   │
                    │   • Category trends     │
                    │   • Time-of-day patterns│
                    │   • Impulse indicators  │
                    │   • Risk behavior signs │
                    └───────────┬─────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │          BEHAVIORAL ANALYSIS ENGINE          │
         ├──────────────────────────────────────────────┤
         │                                              │
         │  ┌─────────────┐  ┌─────────────┐           │
         │  │   Pattern   │  │   Trigger   │           │
         │  │   Detector  │  │   Identifier│           │
         │  └──────┬──────┘  └──────┬──────┘           │
         │         │                │                  │
         │         ▼                ▼                  │
         │  ┌─────────────────────────────────┐        │
         │  │      BIAS CLASSIFICATION        │        │
         │  │  ───────────────────────────    │        │
         │  │  • Loss aversion (0-100)        │        │
         │  │  • Anchoring bias (0-100)       │        │
         │  │  • Mental accounting (0-100)    │        │
         │  │  • Overconfidence (0-100)       │        │
         │  │  • Herding tendency (0-100)     │        │
         │  │  • Present bias (0-100)         │        │
         │  └─────────────┬───────────────────┘        │
         │                │                            │
         └────────────────┼────────────────────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │    FINANCIAL PERSONALITY     │
           │    PROFILE GENERATION        │
           │  ──────────────────────────  │
           │                              │
           │  User Type: "Cautious Saver" │
           │  Risk Score: 3/10            │
           │  Primary Bias: Loss Aversion │
           │  Trigger: Stress Spending    │
           │  Best Contact: Morning       │
           │  Tone Preference: Supportive │
           │                              │
           └──────────────┬───────────────┘
                          │
           ┌──────────────┴───────────────┐
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  COACHING CONTENT    │      │  INTERVENTION        │
│  GENERATOR           │      │  DISPATCHER          │
│  ──────────────────  │      │  ──────────────────  │
│                      │      │                      │
│  • Personalized tips │      │  • Real-time alerts  │
│  • Weekly summaries  │      │  • In-app messages   │
│  • Video content     │      │  • Push notifications│
│  • Article recs      │      │  • Email nudges      │
│  • Exercise prompts  │      │  • SMS (opt-in)      │
│                      │      │                      │
└──────────────────────┘      └──────────────────────┘
```

### 2. Goal-Based Nudge System Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GOAL-BASED NUDGE SYSTEM WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  USER SETS  │
│    GOAL     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    GOAL REGISTRATION                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Goal: Save $5,000 for Emergency Fund                       │
│  Target Date: December 31, 2026                             │
│  Current Progress: $1,250 (25%)                             │
│  Required Monthly: $417                                     │
│  Risk Level: Low (on track)                                 │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   NUDGE SCHEDULER                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Time Optimizer  │    │ Context Analyzer│                │
│  │ ─────────────── │    │ ─────────────── │                │
│  │ Best time: 9am  │    │ Payday: 15th    │                │
│  │ Avoid: 11pm+    │    │ Low balance: No │                │
│  │ Day: Weekdays   │    │ Recent spend: ↑ │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      │                                      │
│                      ▼                                      │
│           ┌──────────────────┐                              │
│           │ NUDGE SELECTION  │                              │
│           │ ALGORITHM        │                              │
│           └────────┬─────────┘                              │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌─────────────────┐        ┌─────────────────┐
│  MOTIVATIONAL   │        │  PROGRESS       │
│  NUDGE          │        │  NUDGE          │
│  ───────────────│        │  ───────────────│
│                 │        │                 │
│  "You're 25% to │        │  "Great job!    │
│  your emergency │        │  You saved $150 │
│  fund! Keep it  │        │  this week.     │
│  up! 💪"        │        │  Keep going!"   │
│                 │        │                 │
└────────┬────────┘        └────────┬────────┘
         │                          │
         └────────────┬─────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   DELIVERY CHANNEL      │
         │   ROUTER                │
         │   ─────────────────     │
         │                         │
         │   User Preference:      │
         │   ✓ Push Notification   │
         │   ✓ In-App              │
         │   ✗ Email               │
         │   ✗ SMS                 │
         │                         │
         └───────────┬─────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │   A/B TEST TRACKER      │
         │   ─────────────────     │
         │                         │
         │   Variant: B            │
         │   Emoji: Yes            │
         │   Tone: Celebratory     │
         │   Length: Short         │
         │                         │
         │   Track:                │
         │   • Open rate           │
         │   • Action taken        │
         │   • Goal progress       │
         │   • User sentiment      │
         │                         │
         └─────────────────────────┘
```

### 3. Real-Time Emotional Spending Detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  EMOTIONAL SPENDING DETECTION SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

     TRANSACTION STREAM (Real-time via Plaid)
     ════════════════════════════════════════
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRANSACTION ANALYZER                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Transaction: $127.43 @ Amazon.com                          │
│  Time: 11:47 PM (Late night ⚠️)                             │
│  Category: Shopping > General                               │
│  Frequency: 3rd Amazon purchase today ⚠️                    │
│  Day Context: Monday (typically low spend day)              │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RISK SCORING ENGINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Factor                          Weight    Score   Weighted │
│  ──────────────────────────────  ──────    ─────   ──────── │
│  Late night (after 10pm)         0.25      0.8     0.20     │
│  Repeat merchant (same day)      0.20      0.9     0.18     │
│  Unusual category                0.15      0.3     0.05     │
│  Exceeds daily average           0.20      0.6     0.12     │
│  Budget category overspent       0.20      0.7     0.14     │
│  ──────────────────────────────  ──────    ─────   ──────── │
│  TOTAL RISK SCORE                                  0.69     │
│                                                             │
│  Threshold: 0.65                                            │
│  Status: ⚠️ ELEVATED RISK                                   │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  INTERVENTION DECISION                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Risk Level: ELEVATED (0.69)                                │
│                                                             │
│  Available Interventions:                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ No Action (risk < 0.50)                           │   │
│  │ ○ Soft Nudge (risk 0.50-0.65)                       │   │
│  │ ● Reflection Prompt (risk 0.65-0.80) ◄── SELECTED   │   │
│  │ ○ Strong Intervention (risk > 0.80)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                REFLECTION PROMPT (Push)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛒 Late Night Shopping Alert                       │   │
│  │                                                     │   │
│  │  We noticed you've made 3 purchases on Amazon      │   │
│  │  tonight totaling $287.                            │   │
│  │                                                     │   │
│  │  Quick check: Is this planned spending or          │   │
│  │  something that can wait until tomorrow?           │   │
│  │                                                     │   │
│  │  [It's planned ✓]  [I'll wait 💤]  [Dismiss]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  LOG RESPONSE   │
                    │  FOR ML TRAINING│
                    └─────────────────┘
```

---

## Gamified Dashboard Mockups

### 1. Main Dashboard - Desktop View

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  🌟 FYNVITA                    Dashboard   Budget   Credit   Invest   Trade    ⚙️ 👤 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Good morning, Sarah! 👋                                                       │ │
│  │                                                                                │ │
│  │  🏆 Level 14 - Money Maven              ████████████░░░░ 3,240 / 4,000 XP     │ │
│  │      🔥 28-day streak!                  Next: "Wealth Warrior" unlocks        │ │
│  │                                         at Level 15                           │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │                             │  │                                             │   │
│  │     VITALITY SCORE          │  │  📊 PROGRESS RINGS                          │   │
│  │     ═══════════════         │  │                                             │   │
│  │                             │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│   │
│  │         ┌─────┐             │  │  │  ╭─╮   │ │  ╭─╮   │ │  ╭─╮   │ │  ╭─╮   ││   │
│  │        /  756  \            │  │  │ ( ● )  │ │ ( ◐ )  │ │ ( ◔ )  │ │ ( ● )  ││   │
│  │       │  ────── │           │  │  │  ╰─╯   │ │  ╰─╯   │ │  ╰─╯   │ │  ╰─╯   ││   │
│  │       │ +18 pts │           │  │  │  92%   │ │  67%   │ │  45%   │ │ 100%   ││   │
│  │        \ this  /            │  │  │ Budget │ │ Savings│ │ Invest │ │ Credit ││   │
│  │         ╲week╱              │  │  │ 🔥 14d │ │ 🔥 7d  │ │ 🔥 3d  │ │ 🔥 28d ││   │
│  │          ───                │  │  └────────┘ └────────┘ └────────┘ └────────┘│   │
│  │                             │  │                                             │   │
│  │   Excellent! Top 15%        │  │                                             │   │
│  │                             │  │                                             │   │
│  └─────────────────────────────┘  └─────────────────────────────────────────────┘   │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  🗺️ YOUR FINANCIAL JOURNEY                                                      ││
│  │                                                                                 ││
│  │  Emergency    Debt Free   $10K        New Car     $100K                        ││
│  │  Fund ✓       ✓           Saved       Fund        Net Worth                    ││
│  │    ●──────────●───────────●───────────◐───────────○───────────○────▶ 🎯        ││
│  │    ↑                                  ↑                                        ││
│  │    Completed!                    You are here!                                 ││
│  │                                  $8,420 / $15,000                              ││
│  │                                                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  🎯 TODAY'S QUESTS               │  │  🏅 RECENT ACHIEVEMENTS                   │ │
│  │                                  │  │                                          │ │
│  │  ┌────────────────────────────┐  │  │  💎 First $5K Saved        Jan 15       │ │
│  │  │ ☑️ Log morning coffee      │  │  │     Rare • +500 XP                      │ │
│  │  │    +25 XP ✓                │  │  │                                          │ │
│  │  └────────────────────────────┘  │  │  🔥 21-Day Streak          Jan 14       │ │
│  │  ┌────────────────────────────┐  │  │     Uncommon • +250 XP                  │ │
│  │  │ ☐ Stay under lunch budget  │  │  │                                          │ │
│  │  │    +50 XP + 🥗             │  │  │  📊 Budget Boss            Jan 10       │ │
│  │  └────────────────────────────┘  │  │     Epic • +1000 XP                     │ │
│  │  ┌────────────────────────────┐  │  │                                          │ │
│  │  │ ☐ Transfer $50 to savings  │  │  │  [View All 23 Badges →]                 │ │
│  │  │    +100 XP + 💰           │  │  │                                          │ │
│  │  └────────────────────────────┘  │  └──────────────────────────────────────────┘ │
│  │                                  │                                               │
│  │  Daily Progress: ████░░░░ 1/3    │                                               │
│  │                                  │                                               │
│  └──────────────────────────────────┘                                               │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  💡 AI COACHING INSIGHT                                                         ││
│  │  ─────────────────────────────────────────────────────────────────────────────  ││
│  │                                                                                 ││
│  │  "Sarah, I noticed you tend to spend more on weekends. This month, your        ││
│  │   weekend spending is 40% higher than weekdays. Want me to set up a           ││
│  │   weekend spending budget to help you stay on track?"                          ││
│  │                                                                                 ││
│  │   [Yes, set it up! 👍]  [Tell me more]  [Not now]                              ││
│  │                                                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Mobile Dashboard View

```
┌─────────────────────────┐
│ ≡  FYNVITA         ⚙️ 👤│
├─────────────────────────┤
│                         │
│ Good morning, Sarah! 👋 │
│                         │
│ 🏆 Lvl 14 Money Maven   │
│ ████████████░░ 3,240 XP │
│ 🔥 28-day streak        │
│                         │
├─────────────────────────┤
│                         │
│      VITALITY SCORE     │
│         ┌─────┐         │
│        /  756  \        │
│       │  ───────│       │
│        \ +18   /        │
│         ╲pts ╱          │
│          ───            │
│     Top 15% of users    │
│                         │
├─────────────────────────┤
│                         │
│ ┌─────┐┌─────┐┌─────┐┌─────┐│
│ │╭─╮ ││╭─╮ ││╭─╮ ││╭─╮ ││
│ │(●) ││(◐) ││(◔) ││(●) ││
│ │╰─╯ ││╰─╯ ││╰─╯ ││╰─╯ ││
│ │92% ││67% ││45% ││100%││
│ │Bdgt││Save││Invt││Crdt││
│ └─────┘└─────┘└─────┘└─────┘│
│                         │
├─────────────────────────┤
│                         │
│ 🎯 TODAY'S QUESTS (1/3) │
│                         │
│ ☑️ Log coffee    +25 XP │
│ ☐ Lunch budget  +50 XP  │
│ ☐ Save $50     +100 XP  │
│                         │
├─────────────────────────┤
│                         │
│ 💡 AI INSIGHT           │
│ ─────────────────────── │
│ Weekend spending is 40% │
│ higher than weekdays.   │
│                         │
│ [Set Weekend Budget]    │
│                         │
├─────────────────────────┤
│  🏠    📊    💳    📈   │
│ Home  Budget Credit Inv │
└─────────────────────────┘
```

### 3. Achievement Badge Gallery

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  🏅 ACHIEVEMENT GALLERY                                        Filter ▼  Sort ▼    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Showing: All (23 earned / 87 total)                                                │
│                                                                                      │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗  │
│  ║  💰 SAVINGS BADGES                                              4/12 earned   ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                               ║  │
│  ║  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ║  │
│  ║  │  ★ ✓   │  │  ★ ✓   │  │  ★ ✓   │  │  ★ ✓   │  │  ☆      │            ║  │
│  ║  │   💵    │  │   💰    │  │   💎    │  │   🏦    │  │   👑    │            ║  │
│  ║  │         │  │         │  │         │  │         │  │         │            ║  │
│  ║  │ First   │  │ First   │  │ First   │  │ First   │  │ First   │            ║  │
│  ║  │ $100    │  │ $1,000  │  │ $5,000  │  │ $10,000 │  │ $50,000 │            ║  │
│  ║  │         │  │         │  │         │  │         │  │         │            ║  │
│  ║  │ Common  │  │Uncommon │  │  Rare   │  │  Epic   │  │Legendary│            ║  │
│  ║  │ +100 XP │  │ +250 XP │  │ +500 XP │  │+1000 XP │  │+2500 XP │            ║  │
│  ║  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘            ║  │
│  ║     ✓ Jan 2     ✓ Feb 15    ✓ Jan 15    ✓ Jan 18      Locked               ║  │
│  ║                                                       Save $50K             ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                      │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗  │
│  ║  🔥 STREAK BADGES                                               3/8 earned    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                               ║  │
│  ║  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ║  │
│  ║  │  ★ ✓   │  │  ★ ✓   │  │  ★ ✓   │  │  ☆ 🔒   │  │  ☆ 🔒   │            ║  │
│  ║  │   🔥    │  │  🔥🔥   │  │ 🔥🔥🔥  │  │  ⭐🔥   │  │  💫🔥   │            ║  │
│  ║  │         │  │         │  │         │  │         │  │         │            ║  │
│  ║  │ 7-Day   │  │ 21-Day  │  │ 30-Day  │  │ 100-Day │  │ 365-Day │            ║  │
│  ║  │ Streak  │  │ Streak  │  │ Streak  │  │ Streak  │  │ Streak  │            ║  │
│  ║  │         │  │         │  │         │  │         │  │         │            ║  │
│  ║  │ Common  │  │Uncommon │  │  Rare   │  │  Epic   │  │Legendary│            ║  │
│  ║  │ +100 XP │  │ +250 XP │  │ +500 XP │  │+1500 XP │  │+5000 XP │            ║  │
│  ║  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘            ║  │
│  ║     ✓ Jan 8     ✓ Jan 14    ✓ Jan 22    72 more days   337 more            ║  │
│  ║                                          Current: 28d                        ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                      │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗  │
│  ║  📊 BUDGET BADGES                                               5/10 earned   ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════╣  │
│  ║  [Expanded view shows similar badge cards...]                                 ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Community Challenge Screen

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  🏆 COMMUNITY CHALLENGES                                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  🎯 ACTIVE CHALLENGE                                                            ││
│  │  ═══════════════════════════════════════════════════════════════════════════   ││
│  │                                                                                 ││
│  │  💪 JANUARY SAVINGS SPRINT                                    Ends in 11 days  ││
│  │                                                                                 ││
│  │  Challenge: Save $500 or more this month                                       ││
│  │  Reward: 🏅 "January Champion" badge + 1,000 XP                                ││
│  │                                                                                 ││
│  │  YOUR PROGRESS                                                                  ││
│  │  ████████████████████████████░░░░░░░░░░ $372 / $500 (74%)                      ││
│  │                                                                                 ││
│  │  COMMUNITY PROGRESS                                                             ││
│  │  12,847 participants • $4.2M saved collectively                                ││
│  │  ████████████████████████████████████░░ 78% completion rate                    ││
│  │                                                                                 ││
│  │  YOUR RANK: #1,247 of 12,847 (Top 10%)                                         ││
│  │                                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  ││
│  │  │  🥇 Anonymous_Saver_42     $892    ████████████████████████ 178%        │  ││
│  │  │  🥈 BudgetMaster_99        $756    ███████████████████████░ 151%        │  ││
│  │  │  🥉 SavingsQueen_2026      $723    ██████████████████████░░ 145%        │  ││
│  │  │  ...                                                                    │  ││
│  │  │  #1,247 You                $372    █████████████████░░░░░░░ 74%         │  ││
│  │  └─────────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                                 ││
│  │  [Invite Friends 👥]  [Share Progress 📤]  [Boost Savings 💰]                  ││
│  │                                                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │  📅 UPCOMING CHALLENGES                                                         ││
│  │                                                                                 ││
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐             ││
│  │  │  🚫 NO-SPEND FEBRUARY       │  │  📈 CREDIT SCORE CLIMB      │             ││
│  │  │                             │  │                             │             ││
│  │  │  7 no-spend days in Feb    │  │  +20 points in 60 days     │             ││
│  │  │  Starts Feb 1              │  │  Starts Feb 15              │             ││
│  │  │  8,432 signed up           │  │  3,891 signed up            │             ││
│  │  │                             │  │                             │             ││
│  │  │  [Join Challenge]          │  │  [Join Challenge]          │             ││
│  │  └─────────────────────────────┘  └─────────────────────────────┘             ││
│  │                                                                                 ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Progress Ring Component

```typescript
interface ProgressRingProps {
  percentage: number;        // 0-100
  size: 'sm' | 'md' | 'lg'; // 48px, 80px, 120px
  label: string;            // e.g., "Budget"
  streak?: number;          // Days in streak
  color: 'green' | 'blue' | 'purple' | 'gold';
  animated?: boolean;       // Animate on mount
  showPercentage?: boolean; // Show % in center
}

// Usage
<ProgressRing
  percentage={72}
  size="md"
  label="Budget"
  streak={14}
  color="green"
  animated
  showPercentage
/>
```

### Badge Component

```typescript
interface BadgeProps {
  id: string;
  name: string;
  description: string;
  icon: string;           // Emoji or icon name
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  isEarned: boolean;
  earnedDate?: Date;
  progress?: number;      // 0-100 for unearned badges
  category: 'savings' | 'debt' | 'budget' | 'credit' | 'investing' | 'streak' | 'special';
}

// Rarity Colors
const rarityColors = {
  common: '#9CA3AF',      // Gray
  uncommon: '#22C55E',    // Green
  rare: '#3B82F6',        // Blue
  epic: '#A855F7',        // Purple
  legendary: '#F59E0B',   // Gold
};
```

### XP/Level System

```typescript
interface UserProgress {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  totalXPEarned: number;
  streakDays: number;
  streakMultiplier: number;  // 1.0 - 2.0 based on streak
}

// Level Thresholds
const levels = [
  { level: 1, title: 'Financial Newbie', xpRequired: 0 },
  { level: 2, title: 'Budget Beginner', xpRequired: 500 },
  { level: 3, title: 'Savings Starter', xpRequired: 1200 },
  { level: 4, title: 'Money Manager', xpRequired: 2100 },
  { level: 5, title: 'Finance Fighter', xpRequired: 3200 },
  { level: 10, title: 'Wealth Builder', xpRequired: 12000 },
  { level: 15, title: 'Wealth Warrior', xpRequired: 28000 },
  { level: 20, title: 'Finance Master', xpRequired: 52000 },
  { level: 25, title: 'Money Maven', xpRequired: 85000 },
  { level: 30, title: 'Financial Legend', xpRequired: 150000 },
];

// XP Rewards Table
const xpRewards = {
  'transaction.logged': 10,
  'budget.under': 25,
  'savings.contribution': 50,
  'goal.milestone.25': 100,
  'goal.milestone.50': 200,
  'goal.milestone.75': 300,
  'goal.completed': 500,
  'streak.7days': 100,
  'streak.30days': 500,
  'badge.common': 100,
  'badge.uncommon': 250,
  'badge.rare': 500,
  'badge.epic': 1000,
  'badge.legendary': 2500,
};
```

---

## Data Flow Architecture

### Event-Driven Gamification

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EVENT-DRIVEN GAMIFICATION                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Action    │────▶│  Event Emitter  │────▶│  Message Queue  │
│  (Transaction)  │     │                 │     │  (Redis/Bull)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┴────────────────────────────┐
                        │                                                             │
                        ▼                                                             ▼
              ┌─────────────────┐                                           ┌─────────────────┐
              │  XP Processor   │                                           │ Badge Processor │
              │  ─────────────  │                                           │  ─────────────  │
              │                 │                                           │                 │
              │  Check action   │                                           │  Check criteria │
              │  Calculate XP   │                                           │  Award badge    │
              │  Apply mult.    │                                           │  Send notif.    │
              │  Update DB      │                                           │  Update DB      │
              │                 │                                           │                 │
              └────────┬────────┘                                           └────────┬────────┘
                       │                                                              │
                       └───────────────────────────┬──────────────────────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │  State Updater  │
                                         │  ─────────────  │
                                         │                 │
                                         │  • User XP      │
                                         │  • User Level   │
                                         │  • Badges array │
                                         │  • Streak count │
                                         │  • Leaderboard  │
                                         │                 │
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Notification   │
                                         │  Dispatcher     │
                                         │  ─────────────  │
                                         │                 │
                                         │  • In-app toast │
                                         │  • Push notif.  │
                                         │  • Animation    │
                                         │                 │
                                         └─────────────────┘
```

---

## API Contracts

### Gamification API Endpoints

```typescript
// GET /api/gamification/progress
interface UserProgressResponse {
  xp: {
    current: number;
    toNextLevel: number;
    totalEarned: number;
  };
  level: {
    current: number;
    title: string;
    progress: number; // 0-100
  };
  streak: {
    days: number;
    multiplier: number;
    longestStreak: number;
  };
}

// GET /api/gamification/badges
interface BadgesResponse {
  earned: Badge[];
  inProgress: Badge[];
  locked: Badge[];
  stats: {
    totalEarned: number;
    totalAvailable: number;
    byCategory: Record<string, number>;
  };
}

// POST /api/gamification/events
interface GameEventRequest {
  eventType: string;  // e.g., 'transaction.logged'
  metadata?: Record<string, unknown>;
}

interface GameEventResponse {
  xpEarned: number;
  newBadges: Badge[];
  levelUp?: {
    newLevel: number;
    newTitle: string;
  };
  streakUpdate?: {
    days: number;
    multiplier: number;
  };
}

// GET /api/challenges
interface ChallengesResponse {
  active: Challenge[];
  upcoming: Challenge[];
  completed: Challenge[];
}

// POST /api/challenges/:id/join
interface JoinChallengeResponse {
  success: boolean;
  challenge: Challenge;
  userProgress: {
    current: number;
    target: number;
    rank: number;
  };
}
```

### AI Personalization API Endpoints

```typescript
// GET /api/ai/insights
interface InsightsResponse {
  insights: Insight[];
  coaching: {
    currentTopic: string;
    suggestedActions: Action[];
  };
  personality: {
    type: string;
    riskScore: number;
    biases: Record<string, number>;
  };
}

// POST /api/ai/nudge/response
interface NudgeResponseRequest {
  nudgeId: string;
  response: 'accepted' | 'dismissed' | 'snoozed';
  feedback?: string;
}

// GET /api/ai/spending-analysis
interface SpendingAnalysisResponse {
  patterns: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    categories: Record<string, number>;
  };
  triggers: {
    type: string;
    confidence: number;
    examples: Transaction[];
  }[];
  recommendations: string[];
}
```

---

## Implementation Priority

| Component | Priority | Sprint | Dependencies |
|-----------|----------|--------|--------------|
| XP/Level System | P0 | 1 | User auth, DB schema |
| Progress Rings | P0 | 1 | UI components |
| Badge System | P0 | 2 | XP system |
| Daily Quests | P1 | 2 | Badge system |
| Streak Tracking | P1 | 2 | XP system |
| Spending Analysis AI | P0 | 3 | Transaction data |
| Nudge Engine | P1 | 3 | Spending analysis |
| Community Challenges | P2 | 4 | Badge system |
| Leaderboards | P2 | 4 | XP system |
| Accountability Partners | P3 | 5 | Social features |

---

*Design Document Version 1.0 - January 2026*
*For internal use - Fynvita Development Team*
