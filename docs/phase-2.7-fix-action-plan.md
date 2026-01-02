# Phase 2.7 Fix Action Plan
**Date**: 2026-01-02  
**Objective**: Resolve all critical TypeScript errors and test failures identified in QC Checkpoint

---

## Fix Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: TypeScript Configuration Fixes (30 min)            │
│ - Add downlevelIteration flag                              │
│ - Update compiler options                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Remove Duplicate Type Definitions (1 hour)         │
│ - Consolidate BudgetRecommendation interface               │
│ - Fix all references                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Fix Next.js 15 Route Handlers (2 hours)            │
│ - Update all [id] route params to Promise                  │
│ - Test each endpoint                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Create Missing Modules (1 hour)                    │
│ - Create financial-api-middleware.ts                       │
│ - Create session.ts auth module                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Fix Type Re-exports (30 min)                       │
│ - Change to 'export type' syntax                           │
│ - Verify isolatedModules compatibility                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Fix Type Mismatches (4 hours)                      │
│ - Add missing properties to interfaces                     │
│ - Fix type assignments                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Fix Test Mocks (3 hours)                           │
│ - Complete Supabase mock chain                             │
│ - Fix AI service mocking                                   │
│ - Increase test timeouts                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Verify All Fixes (1 hour)                          │
│ - Run npx tsc --noEmit (should pass)                       │
│ - Run npm test (should pass)                               │
│ - Verify 90%+ coverage                                     │
└─────────────────────────────────────────────────────────────┘
```

**Total Estimated Time**: 12-14 hours

---

## Detailed Fix Instructions

### Step 1: TypeScript Configuration Fixes

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",  // Changed from "es5"
    "downlevelIteration": true,  // NEW: Required for Map/Set iteration
    "isolatedModules": true,
    // ... rest of config
  }
}
```

**Verification**:
```bash
npx tsc --noEmit | grep "downlevelIteration"  # Should return no errors
```

---

### Step 2: Remove Duplicate Type Definitions

**File**: `src/lib/financial/types/budget.types.ts`

**Action**: Remove duplicate `BudgetRecommendation` interface at line 471

**Keep This Definition** (line 291):
```typescript
export interface BudgetRecommendation {
  id: string;
  type: BudgetRecommendationType;  // Use enum
  category?: string;
  currentAmount: number;
  recommendedAmount: number;
  impact: {
    monthlySavings?: number;
    annualSavings?: number;
    description: string;
  };
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
}
```

**Delete This Definition** (line 471):
```typescript
// DELETE THIS ENTIRE BLOCK
export interface BudgetRecommendation {
  type: 'increase' | 'decrease' | 'reallocate' | 'new_category' | 'remove_category';
  category: string;  // Required (conflicts with optional above)
  impact: string;    // String (conflicts with object above)
  // ...
}
```

**Verification**:
```bash
grep -n "interface BudgetRecommendation" src/lib/financial/types/budget.types.ts
# Should return only ONE line number
```

---

### Step 3: Fix Next.js 15 Route Handlers

**Pattern to Apply**:

```typescript
// ❌ BEFORE (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const billId = params.id;  // Direct access
  // ...
}

// ✅ AFTER (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;  // Await the promise
  // ...
}
```

**Files to Update**:
1. `src/app/api/financial/bills/[id]/negotiate/route.ts`
2. `src/app/api/financial/bills/[id]/outcome/route.ts`
3. `src/app/api/financial/goals/[id]/route.ts`
4. `src/app/api/investments/signals/[id]/route.ts`
5. `src/app/api/financial/budget/[id]/route.ts`
6. `src/app/api/financial/savings/[id]/route.ts`
7. `src/app/api/financial/spending/[id]/route.ts`
8. `src/app/api/financial/health-score/[id]/route.ts`
9. `src/app/api/financial/transactions/[id]/route.ts`
10. `src/app/api/financial/accounts/[id]/route.ts`

**Verification**:
```bash
npx tsc --noEmit | grep "params"  # Should return no errors
```

---

### Step 4: Create Missing Modules

#### 4.1 Create Financial API Middleware

**File**: `src/lib/api/middleware/financial-api-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';

export async function applyFinancialAPIMiddleware(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get authenticated user
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the handler with userId
    return await handler(user.id, request);
  } catch (error) {
    console.error('Financial API middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.2 Create Session Auth Module

**File**: `src/lib/auth/session.ts`

```typescript
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export interface User {
  id: string;
  email: string;
  role?: string;
}

export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  return {
    id: user.id,
    email: user.email!,
    role: user.user_metadata?.role,
  };
}
```

**Verification**:
```bash
npx tsc --noEmit | grep "financial-api-middleware\|session"  # Should return no errors
```

---

### Step 5: Fix Type Re-exports

**File**: `src/lib/financial/types/health-score.types.ts`

**Find and Replace**:
```typescript
// ❌ BEFORE
export { FinancialHealthScoreV2 } from './health-score-v2.types';
export { HealthScoreComponent } from './health-score-v2.types';

// ✅ AFTER
export type { FinancialHealthScoreV2 } from './health-score-v2.types';
export type { HealthScoreComponent } from './health-score-v2.types';
```

**Pattern**: Add `type` keyword after `export` for all type-only exports

**Verification**:
```bash
npx tsc --noEmit | grep "isolatedModules"  # Should return no errors
```

---

### Step 6: Fix Type Mismatches

#### 6.1 Add Missing Properties to AggregatedAccounts

**File**: `src/lib/financial/types/account.types.ts`

```typescript
export interface AggregatedAccounts {
  totalAssets: number;
  totalLiabilities: number;
  totalSavings: number;  // ADD THIS
  netWorth: number;
  accounts: Account[];
}
```

#### 6.2 Add Missing Properties to DebtAnalysis

**File**: `src/lib/financial/types/debt.types.ts`

```typescript
export interface DebtAnalysis {
  totalDebt: number;
  monthlyPayment: number;
  averageInterestRate: number;  // ADD THIS
  debtToIncomeRatio: number;
  payoffTimeline: number;
  recommendations: string[];
}
```

#### 6.3 Fix QuickWin Type

**File**: `src/lib/financial/types/health-score.types.ts`

```typescript
export interface QuickWin {
  id: string;
  title: string;        // ADD THIS
  description: string;  // ADD THIS
  impact: number;       // ADD THIS
  category: string;
  action: string;
  estimatedSavings?: number;
}
```

**Verification**:
```bash
npx tsc --noEmit | grep "Property.*does not exist"  # Should return no errors
```

---

### Step 7: Fix Test Mocks

#### 7.1 Complete Supabase Mock Chain

**File**: `src/lib/financial/__tests__/bill-negotiator.test.ts`

```typescript
// BEFORE
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }),
  },
}));

// AFTER - Complete chain
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),  // ADD THIS
      single: jest.fn().mockResolvedValue({ data: null, error: null }),  // ADD THIS
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),  // ADD THIS
      update: jest.fn().mockResolvedValue({ data: null, error: null }),  // ADD THIS
    }),
  },
}));
```

#### 7.2 Fix AI Service Mocking

**File**: `src/lib/financial/__tests__/bill-negotiator.test.ts`

```typescript
// ADD THIS MOCK
jest.mock('@/lib/ai/aiml-service', () => ({
  AIMLService: {
    getInstance: jest.fn().mockReturnValue({
      generateText: jest.fn().mockResolvedValue('Mock AI response'),
      chat: jest.fn().mockResolvedValue({ content: 'Mock chat response' }),
    }),
  },
}));
```

#### 7.3 Increase Test Timeouts

**File**: `jest.config.js`

```javascript
module.exports = {
  // ... existing config
  testTimeout: 30000,  // Changed from default 5000 to 30000 (30 seconds)
};
```

**Verification**:
```bash
npm test -- --testPathPattern="bill-negotiator" --passWithNoTests
# Should pass without timeout errors
```

---

### Step 8: Verify All Fixes

```bash
# 1. TypeScript compilation
npx tsc --noEmit
# Expected: No errors

# 2. Run all tests
npm test -- --coverage --collectCoverageFrom='src/lib/financial/**/*.ts'
# Expected: All tests pass, 90%+ coverage

# 3. Build application
npm run build
# Expected: Successful build

# 4. Run specific financial tests
npm test -- --testPathPattern="(smart-budget|savings-optim|spending-analy|bill-negoti)"
# Expected: All pass
```

---

## Success Criteria

✅ **TypeScript Compilation**: Zero errors  
✅ **Unit Tests**: All 1,461 tests passing  
✅ **Test Coverage**: 90%+ on financial services  
✅ **Build**: Successful production build  
✅ **No Warnings**: Clean console output  

---

## Next Steps After Fixes

1. Re-run Phase 2.7 QC Checkpoint
2. Proceed to Phase 2.7.3 (API Endpoint Testing)
3. Proceed to Phase 2.7.4 (Web UI/UX Testing)
4. Proceed to Phase 2.7.5 (Mobile Testing)
5. Proceed to Phase 2.7.6 (E2E Integration Testing)
6. Final Phase 2 sign-off

---

**Action Plan Created**: 2026-01-02  
**Estimated Completion**: 2026-01-03 (with dedicated effort)

