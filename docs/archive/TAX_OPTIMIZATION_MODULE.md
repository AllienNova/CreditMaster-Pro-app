# Tax Optimization Module

Comprehensive AI-powered tax optimization engine providing personalized tax-saving recommendations, multi-provider document OCR, and scenario modeling.

## Overview

The Tax Optimization module helps users:

- Calculate federal and state tax liabilities
- Identify tax-saving opportunities
- Optimize retirement account contributions
- Process tax documents with AI-powered OCR
- Model what-if tax scenarios
- Track tax deadlines and reminders

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tax Optimization Module                       │
├─────────────────────────────────────────────────────────────────┤
│  Services                                                        │
│  ├── TaxBracketCalculator      (Federal/State tax calculations) │
│  ├── RetirementAccountOptimizer (401k/IRA/HSA optimization)     │
│  ├── TaxOptimizationEngine     (Main orchestrator)              │
│  └── TaxDocumentProcessor      (Multi-provider OCR)             │
├─────────────────────────────────────────────────────────────────┤
│  OCR Providers                                                   │
│  ├── OpenAI Vision (Primary)   - Best context understanding     │
│  ├── Google Vision (Secondary) - Fast, accurate OCR             │
│  └── LandingAI (Tertiary)      - Specialized document AI        │
├─────────────────────────────────────────────────────────────────┤
│  API Routes                                                      │
│  ├── /api/tax/analyze          - Run tax analysis               │
│  ├── /api/tax/documents        - Fetch/delete documents         │
│  └── /api/tax/documents/upload - Upload & process documents     │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Tax Calculation Engine

**Federal Tax Calculations:**

- Progressive tax brackets (2024 rates)
- All filing statuses (Single, MFJ, MFS, HoH)
- Long-term capital gains (0%, 15%, 20% rates)
- Net Investment Income Tax (NIIT)
- FICA taxes (Social Security, Medicare, Additional Medicare)

**State Tax Calculations:**

- All 50 states supported
- Progressive and flat tax states
- No-income-tax states (TX, FL, WA, NV, WY, SD, AK, TN, NH)

### 2. Retirement Account Optimization

Analyzes and recommends optimal contributions for:

- **401(k)** - Employer match capture, contribution limits
- **Traditional IRA** - Deductibility based on income/coverage
- **Roth IRA** - Income eligibility, backdoor strategies
- **HSA** - Triple tax advantage for HDHP participants
- **SEP IRA** - Self-employment retirement savings

### 3. Document OCR Processing

**Multi-Provider Architecture:**

```
Primary:   OpenAI Vision (GPT-4o) → Best context understanding
Secondary: Google Vision API      → Fast, accurate raw OCR
Tertiary:  LandingAI             → Specialized document AI
```

**Intelligent Fallback:**

- If primary confidence < 85%, runs secondary providers in parallel
- Consensus-based field resolution when providers disagree
- Automatic retry with exponential backoff
- Documents flagged for review when confidence is low

**Supported Documents:**
| Document Type | Description |
|--------------|-------------|
| W-2 | Wage and Tax Statement |
| 1099-DIV | Dividends and Distributions |
| 1099-INT | Interest Income |
| 1099-B | Broker Transactions |
| 1099-NEC | Nonemployee Compensation |
| 1099-MISC | Miscellaneous Income |
| 1099-R | Retirement Distributions |
| 1098 | Mortgage Interest Statement |
| 1098-E | Student Loan Interest |
| Charitable Receipt | Donation documentation |

### 4. Scenario Modeling

What-if analysis tool for comparing tax strategies:

- Adjust retirement contributions
- Model capital gains realization
- Compare charitable giving strategies
- See instant tax impact calculations

### 5. Tax Calendar

Track important tax deadlines:

- Quarterly estimated tax payments
- Filing deadlines
- Contribution deadlines (401k, IRA, HSA)
- Extension deadlines

## Environment Variables

```bash
# Required for OCR Processing
OPENAI_API_KEY=sk-...              # OpenAI Vision (Primary)
GOOGLE_VISION_API_KEY=...          # Google Cloud Vision (Secondary)
LANDING_AI_API_KEY=...             # LandingAI (Tertiary, optional)

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## API Reference

### POST /api/tax/analyze

Run tax analysis for a user profile.

**Request:**

```json
{
  "taxYear": 2024,
  "grossIncome": 150000,
  "filingStatus": "single",
  "stateOfResidence": "CA",
  "ytd401kContribution": 10000,
  "ytdIraContribution": 0,
  "ytdHsaContribution": 2000,
  "hasHdhp": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "currentProjection": {
      "grossIncome": 150000,
      "taxableIncome": 123400,
      "totalTax": 42500,
      "effectiveRate": 0.283,
      "federalMarginalRate": 0.32,
      "takeHomePay": 107500,
      "monthlyTakeHome": 8958
    },
    "opportunities": [...],
    "topRecommendations": [...],
    "totalPotentialSavings": 8500
  }
}
```

### POST /api/tax/documents/upload

Upload and process a tax document.

**Request:** `multipart/form-data`

- `file` - PDF, PNG, or JPG (max 10MB)
- `taxYear` - Tax year (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "documentType": "w2",
    "documentTypeConfidence": 0.95,
    "taxYear": 2024,
    "extractedData": {
      "type": "w2",
      "fields": {
        "employerName": "Tech Corp",
        "wagesTipsOtherComp": 150000,
        "federalIncomeTaxWithheld": 35000
      }
    },
    "providersUsed": ["openai_vision"],
    "requiresReview": false
  }
}
```

### GET /api/tax/documents

Fetch user's tax documents.

**Query Parameters:**

- `year` - Filter by tax year
- `type` - Filter by document type
- `status` - Filter by status (verified, pending)

### DELETE /api/tax/documents?id={documentId}

Delete a tax document.

## Database Schema

### tax_documents

```sql
CREATE TABLE tax_documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tax_year INTEGER NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  extracted_data JSONB,
  extraction_confidence DECIMAL(5,4),
  is_verified BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'extracted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### tax_audit_log

All tax-related actions are logged for compliance:

```sql
CREATE TABLE tax_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security & Compliance

### Data Protection

- All tax data encrypted at rest (Supabase)
- Row-Level Security (RLS) on all tables
- Users can only access their own data
- No PII logged in application logs

### Disclaimers

The Tax Optimization module includes required disclaimers:

- Tax recommendations are for informational purposes only
- Do not constitute tax, legal, or financial advice
- Users should consult qualified tax professionals
- Tax calculations based on current law, subject to change

### Audit Trail

All actions are logged:

- Document uploads and processing
- Tax analysis runs
- Recommendation acknowledgments
- Document deletions

## UI Routes

| Route            | Description                  |
| ---------------- | ---------------------------- |
| `/tax`           | Main tax dashboard           |
| `/tax/documents` | Document upload & management |
| `/tax/scenarios` | What-if scenario modeler     |
| `/tax/calendar`  | Tax deadlines & reminders    |

## Mobile App

React Native screens available:

- `app/tax/index.tsx` - Main tax screen
- `app/tax/documents.tsx` - Document management

## Testing

Run tests with:

```bash
npm run test -- src/lib/tax/__tests__
```

## Future Enhancements

- [ ] Canada & UK tax support
- [ ] Business tax optimization (Schedule C, K-1)
- [ ] Tax bracket visualization charts
- [ ] Year-over-year comparison
- [ ] Integration with tax filing services
- [ ] Automated document fetching from brokerages
