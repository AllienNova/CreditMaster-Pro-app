/**
 * Entity Extractor
 *
 * AI-powered entity extraction for financial chat messages
 * Extracts amounts, dates, categories, percentages, and other financial data
 */

import { AIMLService } from '@/lib/aiml-service';
import type {
  ExtractedEntities,
  MoneyAmount,
  DateEntity,
  IntentType,
} from './types/chat.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENTITY_MODEL = 'openai/gpt-4o-mini';

const ENTITY_SYSTEM_PROMPT = `You are an entity extraction expert for financial chat messages.

Your task is to extract structured financial data from user messages.

Extract these entity types:

1. **amounts** - Money amounts with currency
   - Format: { value: number, currency: string, originalText: string, confidence: 0-1 }
   - Examples: "$500", "$1,234.56", "1000 dollars", "fifty bucks"

2. **dates** - Date references with precision
   - Format: { value: ISO date string, originalText: string, precision: "day"|"week"|"month"|"quarter"|"year", confidence: 0-1 }
   - Examples: "next month", "by December", "in 6 months", "next year"

3. **categories** - Spending/budget categories
   - Format: Array of strings
   - Examples: "groceries", "rent", "entertainment", "gas", "utilities"

4. **accountTypes** - Account references
   - Format: Array of strings
   - Examples: "checking", "savings", "credit card", "401k", "investment"

5. **goalTypes** - Financial goal types
   - Format: Array of strings
   - Examples: "emergency fund", "vacation", "retirement", "house", "car"

6. **percentages** - Percentage values
   - Format: Array of numbers
   - Examples: "25%", "3.5%", "half" (50)

7. **timeframes** - Time periods
   - Format: Array of strings
   - Examples: "monthly", "annually", "quarterly", "weekly", "daily"

Respond ONLY with a JSON object in this exact format:
{
  "amounts": [{ "value": 500, "currency": "USD", "originalText": "$500", "confidence": 0.95 }],
  "dates": [{ "value": "2025-12-31", "originalText": "by end of year", "precision": "day", "confidence": 0.9 }],
  "categories": ["groceries", "gas"],
  "accountTypes": ["checking"],
  "goalTypes": ["emergency fund"],
  "percentages": [10, 25],
  "timeframes": ["monthly"]
}

Rules:
- Only include entities that are present in the message
- confidence must be between 0 and 1
- If no entities found, return empty object: {}
- Normalize category names to lowercase
- Convert relative dates to absolute ISO dates when possible`;

const ENTITY_EXAMPLES = [
  {
    user: 'I want to save $5000 for a vacation by next summer',
    assistant: JSON.stringify({
      amounts: [
        {
          value: 5000,
          currency: 'USD',
          originalText: '$5000',
          confidence: 0.98,
        },
      ],
      dates: [
        {
          value: '2026-06-21',
          originalText: 'next summer',
          precision: 'month',
          confidence: 0.85,
        },
      ],
      goalTypes: ['vacation'],
    }),
  },
  {
    user: 'Set a monthly budget of $800 for groceries and $200 for entertainment',
    assistant: JSON.stringify({
      amounts: [
        {
          value: 800,
          currency: 'USD',
          originalText: '$800',
          confidence: 0.98,
        },
        {
          value: 200,
          currency: 'USD',
          originalText: '$200',
          confidence: 0.98,
        },
      ],
      categories: ['groceries', 'entertainment'],
      timeframes: ['monthly'],
    }),
  },
  {
    user: 'I spent about 50% more on dining out last month',
    assistant: JSON.stringify({
      percentages: [50],
      categories: ['dining out'],
      dates: [
        {
          value: '2025-11-01',
          originalText: 'last month',
          precision: 'month',
          confidence: 0.9,
        },
      ],
    }),
  },
  {
    user: 'Transfer $1,000 from savings to checking account',
    assistant: JSON.stringify({
      amounts: [
        {
          value: 1000,
          currency: 'USD',
          originalText: '$1,000',
          confidence: 0.98,
        },
      ],
      accountTypes: ['savings', 'checking'],
    }),
  },
];

// ============================================================================
// ENTITY EXTRACTOR
// ============================================================================

export class EntityExtractor {
  private aimlService: AIMLService;
  private cache: Map<string, ExtractedEntities>;

  constructor() {
    this.aimlService = new AIMLService();
    this.cache = new Map();
  }

  /**
   * Extract entities from user message
   */
  async extract(
    userMessage: string,
    intent?: IntentType
  ): Promise<ExtractedEntities | null> {
    // Check cache first
    const cacheKey = this.getCacheKey(userMessage, intent);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try AI extraction first
    try {
      const entities = await this.aiExtract(userMessage, intent);

      // Fallback to regex if AI returns empty
      if (!entities || Object.keys(entities).length === 0) {
        return this.regexExtract(userMessage, intent);
      }

      // Cache result
      this.cache.set(cacheKey, entities);

      // Limit cache size
      if (this.cache.size > 500) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      return entities;
    } catch (error) {
      console.error(
        'AI entity extraction failed, using regex fallback:',
        error
      );
      return this.regexExtract(userMessage, intent);
    }
  }

  /**
   * Batch extract entities from multiple messages
   */
  async extractBatch(
    messages: string[]
  ): Promise<Array<ExtractedEntities | null>> {
    const results = await Promise.all(messages.map((msg) => this.extract(msg)));
    return results;
  }

  // ==========================================================================
  // AI EXTRACTION
  // ==========================================================================

  /**
   * AI-powered entity extraction
   */
  private async aiExtract(
    userMessage: string,
    intent?: IntentType
  ): Promise<ExtractedEntities | null> {
    const messages = this.buildEntityPrompt(userMessage, intent);

    const response = await this.aimlService.chat(ENTITY_MODEL, messages, {
      temperature: 0.1, // Very low temperature for consistent extraction
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const result = this.parseEntityResponse(content);

    // Validate and normalize
    return this.normalizeEntities(result);
  }

  /**
   * Build prompt for entity extraction
   */
  private buildEntityPrompt(
    userMessage: string,
    intent?: IntentType
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    // System prompt with intent hint
    let systemPrompt = ENTITY_SYSTEM_PROMPT;

    if (intent) {
      systemPrompt += `\n\nUser intent: ${intent}`;
      systemPrompt += '\nFocus on extracting entities relevant to this intent.';
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add examples
    for (const example of ENTITY_EXAMPLES) {
      messages.push({ role: 'user', content: example.user });
      messages.push({ role: 'assistant', content: example.assistant });
    }

    // Add user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Parse AI response to entities object
   */
  private parseEntityResponse(content: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse entity response:', error);
      return {};
    }
  }

  // ==========================================================================
  // REGEX FALLBACK EXTRACTION
  // ==========================================================================

  /**
   * Regex-based entity extraction (fallback)
   */
  private regexExtract(
    userMessage: string,
    intent?: IntentType
  ): ExtractedEntities | null {
    const entities: ExtractedEntities = {};

    // Extract money amounts
    const amounts = this.extractAmounts(userMessage);
    if (amounts.length > 0) {
      entities.amounts = amounts;
    }

    // Extract percentages
    const percentages = this.extractPercentages(userMessage);
    if (percentages.length > 0) {
      entities.percentages = percentages;
    }

    // Extract categories (based on intent)
    const categories = this.extractCategories(userMessage, intent);
    if (categories.length > 0) {
      entities.categories = categories;
    }

    // Extract account types
    const accountTypes = this.extractAccountTypes(userMessage);
    if (accountTypes.length > 0) {
      entities.accountTypes = accountTypes;
    }

    // Extract goal types
    const goalTypes = this.extractGoalTypes(userMessage);
    if (goalTypes.length > 0) {
      entities.goalTypes = goalTypes;
    }

    // Extract timeframes
    const timeframes = this.extractTimeframes(userMessage);
    if (timeframes.length > 0) {
      entities.timeframes = timeframes;
    }

    // Extract dates
    const dates = this.extractDates(userMessage);
    if (dates.length > 0) {
      entities.dates = dates;
    }

    return Object.keys(entities).length > 0 ? entities : null;
  }

  /**
   * Extract money amounts
   */
  private extractAmounts(text: string): MoneyAmount[] {
    const amounts: MoneyAmount[] = [];

    // Pattern 1: $1,234.56 or $1234
    const dollarPattern = /\$\s*([\d,]+(?:\.\d{2})?)/g;
    let match;
    while ((match = dollarPattern.exec(text)) !== null) {
      amounts.push({
        value: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
        originalText: match[0],
        confidence: 0.95,
      });
    }

    // Pattern 2: 1234 dollars/bucks
    const wordsPattern = /([\d,]+(?:\.\d{2})?)\s*(dollars?|bucks?|usd)/gi;
    while ((match = wordsPattern.exec(text)) !== null) {
      amounts.push({
        value: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
        originalText: match[0],
        confidence: 0.9,
      });
    }

    // Pattern 3: Written numbers (limited support)
    const writtenAmounts = this.extractWrittenAmounts(text);
    amounts.push(...writtenAmounts);

    return amounts;
  }

  /**
   * Extract written amounts (e.g., "five hundred")
   */
  private extractWrittenAmounts(text: string): MoneyAmount[] {
    const amounts: MoneyAmount[] = [];
    const lower = text.toLowerCase();

    const writtenNumbers: Record<string, number> = {
      'one hundred': 100,
      'two hundred': 200,
      'three hundred': 300,
      'four hundred': 400,
      'five hundred': 500,
      'six hundred': 600,
      'seven hundred': 700,
      'eight hundred': 800,
      'nine hundred': 900,
      'one thousand': 1000,
      'two thousand': 2000,
      'three thousand': 3000,
      'four thousand': 4000,
      'five thousand': 5000,
      'ten thousand': 10000,
    };

    for (const [written, value] of Object.entries(writtenNumbers)) {
      if (lower.includes(written)) {
        amounts.push({
          value,
          currency: 'USD',
          originalText: written,
          confidence: 0.75,
        });
      }
    }

    return amounts;
  }

  /**
   * Extract percentages
   */
  private extractPercentages(text: string): number[] {
    const percentages: number[] = [];

    // Pattern 1: 25% or 3.5%
    const percentPattern = /([\d.]+)\s*%/g;
    let match;
    while ((match = percentPattern.exec(text)) !== null) {
      percentages.push(parseFloat(match[1]));
    }

    // Pattern 2: "percent" word
    const percentWordPattern = /([\d.]+)\s*percent/gi;
    while ((match = percentWordPattern.exec(text)) !== null) {
      percentages.push(parseFloat(match[1]));
    }

    // Pattern 3: Common fractions
    const lower = text.toLowerCase();
    if (lower.includes('half')) percentages.push(50);
    if (lower.includes('quarter')) percentages.push(25);
    if (lower.includes('third')) percentages.push(33.33);

    return percentages;
  }

  /**
   * Extract spending/budget categories
   */
  private extractCategories(text: string, intent?: IntentType): string[] {
    const categories: string[] = [];
    const lower = text.toLowerCase();

    const categoryKeywords = [
      'groceries',
      'food',
      'dining',
      'restaurant',
      'entertainment',
      'shopping',
      'gas',
      'fuel',
      'transportation',
      'utilities',
      'rent',
      'mortgage',
      'insurance',
      'healthcare',
      'medical',
      'education',
      'travel',
      'vacation',
      'clothing',
      'personal care',
      'subscriptions',
      'bills',
      'debt',
      'savings',
      'investments',
    ];

    for (const category of categoryKeywords) {
      if (lower.includes(category)) {
        categories.push(category);
      }
    }

    return categories;
  }

  /**
   * Extract account types
   */
  private extractAccountTypes(text: string): string[] {
    const accountTypes: string[] = [];
    const lower = text.toLowerCase();

    const accountKeywords = [
      'checking',
      'savings',
      'credit card',
      'debit card',
      '401k',
      'ira',
      'roth',
      'investment',
      'brokerage',
      'money market',
      'cd',
      'certificate of deposit',
    ];

    for (const account of accountKeywords) {
      if (lower.includes(account)) {
        accountTypes.push(account);
      }
    }

    return accountTypes;
  }

  /**
   * Extract goal types
   */
  private extractGoalTypes(text: string): string[] {
    const goalTypes: string[] = [];
    const lower = text.toLowerCase();

    const goalKeywords = [
      'emergency fund',
      'vacation',
      'retirement',
      'house',
      'home',
      'car',
      'vehicle',
      'wedding',
      'education',
      'college',
      'debt payoff',
      'investment',
      'savings',
    ];

    for (const goal of goalKeywords) {
      if (lower.includes(goal)) {
        goalTypes.push(goal);
      }
    }

    return goalTypes;
  }

  /**
   * Extract timeframes
   */
  private extractTimeframes(text: string): string[] {
    const timeframes: string[] = [];
    const lower = text.toLowerCase();

    const timeframeKeywords = [
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'annually',
      'yearly',
    ];

    for (const timeframe of timeframeKeywords) {
      if (lower.includes(timeframe)) {
        timeframes.push(timeframe);
      }
    }

    return timeframes;
  }

  /**
   * Extract dates (basic)
   */
  private extractDates(text: string): DateEntity[] {
    const dates: DateEntity[] = [];
    const lower = text.toLowerCase();

    // Relative dates
    const now = new Date();

    if (lower.includes('today')) {
      dates.push({
        value: now,
        originalText: 'today',
        precision: 'day',
        confidence: 0.95,
      });
    }

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dates.push({
        value: tomorrow,
        originalText: 'tomorrow',
        precision: 'day',
        confidence: 0.95,
      });
    }

    if (lower.includes('next month')) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      dates.push({
        value: nextMonth,
        originalText: 'next month',
        precision: 'month',
        confidence: 0.9,
      });
    }

    if (lower.includes('next year')) {
      const nextYear = new Date(now);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      dates.push({
        value: nextYear,
        originalText: 'next year',
        precision: 'year',
        confidence: 0.9,
      });
    }

    return dates;
  }

  // ==========================================================================
  // NORMALIZATION
  // ==========================================================================

  /**
   * Normalize and validate entities
   */
  private normalizeEntities(entities: any): ExtractedEntities | null {
    const normalized: ExtractedEntities = {};

    // Normalize amounts
    if (entities.amounts && Array.isArray(entities.amounts)) {
      normalized.amounts = entities.amounts.map((amt: any) => ({
        value: parseFloat(amt.value) || 0,
        currency: amt.currency || 'USD',
        originalText: amt.originalText || '',
        confidence: Math.min(Math.max(amt.confidence || 0.5, 0), 1),
      }));
    }

    // Normalize dates
    if (entities.dates && Array.isArray(entities.dates)) {
      normalized.dates = entities.dates.map((date: any) => ({
        value: new Date(date.value),
        originalText: date.originalText || '',
        precision: date.precision || 'day',
        confidence: Math.min(Math.max(date.confidence || 0.5, 0), 1),
      }));
    }

    // Normalize categories
    if (entities.categories && Array.isArray(entities.categories)) {
      normalized.categories = entities.categories.map((cat: string) =>
        cat.toLowerCase().trim()
      );
    }

    // Normalize account types
    if (entities.accountTypes && Array.isArray(entities.accountTypes)) {
      normalized.accountTypes = entities.accountTypes.map((acc: string) =>
        acc.toLowerCase().trim()
      );
    }

    // Normalize goal types
    if (entities.goalTypes && Array.isArray(entities.goalTypes)) {
      normalized.goalTypes = entities.goalTypes.map((goal: string) =>
        goal.toLowerCase().trim()
      );
    }

    // Normalize percentages
    if (entities.percentages && Array.isArray(entities.percentages)) {
      normalized.percentages = entities.percentages.map((pct: any) =>
        parseFloat(pct)
      );
    }

    // Normalize timeframes
    if (entities.timeframes && Array.isArray(entities.timeframes)) {
      normalized.timeframes = entities.timeframes.map((tf: string) =>
        tf.toLowerCase().trim()
      );
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Generate cache key
   */
  private getCacheKey(message: string, intent?: IntentType): string {
    let key = message.toLowerCase().trim();
    if (intent) {
      key += `|${intent}`;
    }
    return key;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let entityExtractorInstance: EntityExtractor | null = null;

export function getEntityExtractor(): EntityExtractor {
  if (!entityExtractorInstance) {
    entityExtractorInstance = new EntityExtractor();
  }
  return entityExtractorInstance;
}

export default getEntityExtractor();
