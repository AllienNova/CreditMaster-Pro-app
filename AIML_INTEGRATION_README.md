# AIML API Integration - CreditMaster Pro

## Overview

This document describes the AIML API integration in CreditMaster Pro, providing access to **300+ AI models** from leading providers including OpenAI, Anthropic, Google, DeepSeek, Meta, and more.

## What's Integrated

### Core Services

1. **AIML Service** (`src/lib/aiml-service.ts`)
   - Direct access to 300+ models via OpenAI-compatible SDK
   - Chat completions (streaming & non-streaming)
   - Image generation
   - Voice synthesis & transcription
   - Text embeddings
   - Content moderation

2. **Model Router** (`src/lib/model-router.ts`)
   - Intelligent model selection based on task type
   - 15+ task types supported
   - Cost optimization
   - Provider filtering
   - Automatic fallback mechanisms

3. **AI Orchestrator** (`src/lib/ai-orchestrator.ts`)
   - High-level workflows for credit repair tasks
   - Multi-model consensus for critical decisions
   - Dispute letter generation
   - Credit report analysis
   - Student loan strategy optimization
   - Legal compliance review

### API Routes

1. **Dispute Generation** - `/api/disputes/generate`
   - Model: Claude 4.5 Sonnet (best for legal writing)
   - Generates professional, legally compliant dispute letters
   - Optional compliance review

2. **Credit Analysis** - `/api/credit/analyze`
   - Model: DeepSeek R1 (advanced reasoning)
   - Comprehensive credit report analysis
   - Actionable recommendations

3. **Student Loan Strategy** - `/api/student-loans/strategy`
   - Model: DeepSeek V3.1 Terminus (mathematical reasoning)
   - Optimal repayment strategy calculation
   - PSLF eligibility analysis

4. **Multi-Model Consensus** - `/api/ai/consensus`
   - Uses multiple models for critical decisions
   - Meta-model synthesis (GPT-5 Pro)
   - Confidence scoring

5. **Voice Synthesis** - `/api/voice/synthesize`
   - Model: OpenAI TTS-1 HD
   - Text-to-speech conversion
   - 6 voice options

## Setup Instructions

### 1. Get AIML API Key

1. Visit [https://aimlapi.com/](https://aimlapi.com/)
2. Create an account (free tier available)
3. Generate an API key from your dashboard
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env.local` file in the app directory:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Edit `.env.local` and add your AIML API key:

```bash
AIML_API_KEY=your_actual_api_key_here
AIML_BASE_URL=https://api.aimlapi.com/v1
AIML_DEFAULT_CHAT_MODEL=anthropic/claude-4.5-sonnet
```

### 3. Install Dependencies

Dependencies are already in `package.json`:

```bash
npm install
```

### 4. Test the Integration

Run the development server:

```bash
npm run dev
```

Test the API routes:

```bash
# Test dispute generation
curl -X POST http://localhost:3000/api/disputes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creditReport": {"accounts": []},
    "disputeReason": "Incorrect late payment",
    "userInfo": {
      "name": "John Doe",
      "address": "123 Main St, City, ST 12345"
    }
  }'

# Test credit analysis
curl -X POST http://localhost:3000/api/credit/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "creditReport": {"accounts": [], "inquiries": []},
    "creditScore": 650
  }'

# Test loan strategy
curl -X POST http://localhost:3000/api/student-loans/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "loanData": {
      "totalBalance": 50000,
      "interestRate": 5.5,
      "loanType": "Direct Unsubsidized",
      "servicer": "FedLoan"
    },
    "financialSituation": {
      "income": 45000,
      "familySize": 1,
      "state": "CA",
      "employmentType": "nonprofit"
    }
  }'
```

## Usage Examples

### Basic Chat Completion

```typescript
import { getAIMLService } from '@/lib/aiml-service';

const aiml = getAIMLService();

const response = await aiml.chat(
  'anthropic/claude-4.5-sonnet',
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain credit scores.' },
  ],
  { temperature: 0.7, max_tokens: 500 }
);

console.log(response.choices[0].message.content);
```

### Using Model Router

```typescript
import { getModelRouter, TaskType } from '@/lib/model-router';

const router = getModelRouter();

// Get best model for dispute generation
const model = router.getModel(TaskType.DISPUTE_GENERATION);
console.log(model); // 'anthropic/claude-4.5-sonnet'

// Get recommendation with reasoning
const recommendation = router.getRecommendation(TaskType.CREDIT_ANALYSIS);
console.log(recommendation);
// {
//   primary: 'deepseek/deepseek-r1',
//   fallbacks: ['openai/gpt-5-pro', 'anthropic/claude-4.5-sonnet'],
//   reasoning: 'DeepSeek R1 is recommended for credit_analysis because...'
// }
```

### Using AI Orchestrator

```typescript
import { getAIOrchestrator } from '@/lib/ai-orchestrator';

const orchestrator = getAIOrchestrator();

// Generate dispute letter
const disputeLetter = await orchestrator.generateDispute({
  creditReport: { /* ... */ },
  disputeReason: 'Incorrect late payment on account #1234',
  userInfo: {
    name: 'John Doe',
    address: '123 Main St, City, ST 12345',
    accountNumber: '1234',
  },
});

console.log(disputeLetter);
```

### Multi-Model Consensus

```typescript
import { getAIOrchestrator } from '@/lib/ai-orchestrator';
import { TaskType } from '@/lib/model-router';

const orchestrator = getAIOrchestrator();

// Get consensus from multiple models
const result = await orchestrator.getConsensus(
  TaskType.FINANCIAL_ADVICE,
  'What is the best strategy to improve a 650 credit score?',
  { temperature: 0.7, max_tokens: 1000 }
);

console.log('Consensus:', result.consensus);
console.log('Models used:', result.models_used);
console.log('Confidence:', result.confidence_score);
```

### Voice Synthesis

```typescript
import { getAIMLService } from '@/lib/aiml-service';

const aiml = getAIMLService();

const audioBuffer = await aiml.generateSpeech(
  'Your credit score has improved by 50 points!',
  'tts-1-hd',
  'alloy'
);

// Convert to blob and play
const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.play();
```

## Available Models

### Chat/Language Models

| Model ID | Provider | Context | Best For |
|----------|----------|---------|----------|
| `anthropic/claude-4.5-sonnet` | Anthropic | 200K | Legal writing, detailed analysis |
| `openai/gpt-5-pro` | OpenAI | 400K | Comprehensive knowledge, coding |
| `openai/gpt-4o` | OpenAI | 128K | Fast, reliable, multi-modal |
| `openai/gpt-4o-mini` | OpenAI | 128K | Quick responses, cost-effective |
| `deepseek/deepseek-r1` | DeepSeek | 128K | Advanced reasoning, mathematics |
| `deepseek/deepseek-v3.1-terminus` | DeepSeek | 128K | Mathematical optimization |
| `google/gemini-2.5-pro` | Google | 1M | Huge context, versatile |
| `google/gemini-2.5-flash` | Google | 1M | Lightning fast |

### Image Generation Models

- `flux-pro` - High quality images
- `stable-diffusion-xl` - Versatile generation
- `imagen-4.0-ultra` - Google's best

### Voice Models

- `tts-1` - Standard quality
- `tts-1-hd` - High definition
- `elevenlabs-multilingual` - Best voice quality

### Other Models

- `whisper-1` - Speech-to-text
- `text-embedding-3-large` - Text embeddings
- `openai-moderation` - Content safety

## Task Types

The Model Router supports these task types:

- `DISPUTE_GENERATION` - Credit dispute letters
- `CREDIT_ANALYSIS` - Credit report analysis
- `CREDIT_REPORT_REVIEW` - Detailed report review
- `LEGAL_COMPLIANCE` - Legal compliance check
- `FINANCIAL_ADVICE` - Financial recommendations
- `STUDENT_LOAN_STRATEGY` - Loan repayment strategy
- `LOAN_CALCULATION` - Loan calculations
- `REPAYMENT_PLANNING` - Repayment planning
- `FORGIVENESS_ANALYSIS` - Forgiveness eligibility
- `DOCUMENT_OCR` - Document text extraction
- `DOCUMENT_ANALYSIS` - Document analysis
- `DOCUMENT_GENERATION` - Document creation
- `QUICK_RESPONSE` - Fast responses
- `GENERAL_CHAT` - General conversation
- `REASONING` - Complex reasoning
- `CODE_GENERATION` - Code generation

## Pricing

AIML API offers flexible pricing:

| Tier | Cost | Tokens | Best For |
|------|------|--------|----------|
| **Developer** | Free | 10 req/hour | Testing, prototypes |
| **Startup** | Pay-as-you-go | From 40M | MVP, market fit |
| **Production** | $50/month | 100M | Critical workflows |
| **Scale** | $200/month | 400M | Exponential growth |

### Cost Optimization Tips

1. **Use Fast Models for Simple Tasks**
   - Use `gpt-4o-mini` or `claude-4.5-haiku` for quick responses
   - Reserve expensive models for complex tasks

2. **Implement Caching**
   - Cache common responses
   - Cache embeddings
   - Cache analysis results

3. **Optimize Prompts**
   - Keep prompts concise
   - Use system prompts efficiently
   - Set appropriate max_tokens

4. **Monitor Usage**
   - Track token usage per model
   - Monitor costs per feature
   - Optimize based on data

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const response = await aiml.chat(model, messages);
  // Handle success
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle API key error
  } else if (error.message.includes('rate limit')) {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

## Testing

Run tests to verify integration:

```bash
# Run all tests
npm test

# Run specific test file
npm test aiml-service.test.ts

# Run with coverage
npm run test:coverage
```

## Monitoring

Monitor AIML API usage:

1. **API Dashboard**: [https://aimlapi.com/dashboard](https://aimlapi.com/dashboard)
2. **Token Usage**: Track in dashboard
3. **Error Logs**: Check application logs
4. **Performance**: Monitor response times

## Troubleshooting

### API Key Issues

```bash
# Check if API key is set
echo $AIML_API_KEY

# Verify .env.local exists
cat .env.local | grep AIML_API_KEY
```

### Model Not Found

```typescript
// Check available models
const router = getModelRouter();
const models = router.getAllAvailableModels();
console.log('Available models:', models);
```

### Rate Limiting

If you hit rate limits:
1. Upgrade to paid tier
2. Implement request queuing
3. Add retry logic with exponential backoff

## Support

- **AIML API Docs**: [https://docs.aimlapi.com](https://docs.aimlapi.com)
- **AIML API Support**: [help@aimlapi.com](mailto:help@aimlapi.com)
- **Community**: [Discord](https://discord.gg/aimlapi)

## Next Steps

1. ✅ Get AIML API key
2. ✅ Configure environment variables
3. ✅ Test API routes
4. ⬜ Integrate into UI components
5. ⬜ Add voice assistant UI
6. ⬜ Implement semantic search
7. ⬜ Add image generation features
8. ⬜ Deploy to production

## License

This integration is part of CreditMaster Pro and follows the same license.

---

**Last Updated:** October 24, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅

