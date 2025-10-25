/**
 * AI Orchestrator
 * 
 * High-level orchestration layer that combines AIML Service and Model Router
 * to provide intelligent, multi-model AI workflows for credit repair tasks.
 * 
 * Features:
 * - Automatic model selection based on task type
 * - Multi-model consensus for critical decisions
 * - Fallback mechanisms for reliability
 * - Cost optimization
 * - Performance tracking
 */

import { AIMLService, ChatMessage, ChatOptions } from './aiml-service';
import { ModelRouter, TaskType } from './model-router';

export interface DisputeGenerationInput {
  creditReport: any;
  disputeReason: string;
  userInfo: {
    name: string;
    address: string;
    ssn?: string;
    accountNumber?: string;
  };
  additionalContext?: string;
}

export interface CreditAnalysisInput {
  creditReport: any;
  creditScore?: number;
  goals?: string[];
}

export interface CreditAnalysisOutput {
  score_factors: string[];
  negative_items: Array<{
    item: string;
    impact: 'high' | 'medium' | 'low';
    disputable: boolean;
    reason: string;
  }>;
  positive_items: string[];
  action_plan: Array<{
    step: number;
    action: string;
    timeline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  timeline_estimate: string;
  estimated_score_improvement: number;
}

export interface LoanStrategyInput {
  loanData: {
    totalBalance: number;
    interestRate: number;
    loanType: string;
    servicer: string;
    monthlyPayment?: number;
  };
  financialSituation: {
    income: number;
    familySize: number;
    state: string;
    employmentType: string;
  };
  goals?: string[];
}

export interface LoanStrategyOutput {
  recommended_plan: {
    name: string;
    description: string;
    monthly_payment: number;
    total_cost: number;
    forgiveness_eligible: boolean;
    forgiveness_timeline?: string;
  };
  alternative_plans: Array<{
    name: string;
    monthly_payment: number;
    total_cost: number;
    pros: string[];
    cons: string[];
  }>;
  pslf_analysis: {
    eligible: boolean;
    qualifying_payments: number;
    remaining_payments: number;
    estimated_forgiveness_amount: number;
  };
  tax_implications: string;
  recommendations: string[];
}

export interface ConsensusResult<T = any> {
  consensus: T;
  individual_responses: any[];
  models_used: string[];
  confidence_score: number;
}

/**
 * AI Orchestrator Class
 * 
 * Orchestrates complex AI workflows using multiple models
 */
export class AIOrchestrator {
  private aiml: AIMLService;
  private router: ModelRouter;

  constructor(aiml?: AIMLService, router?: ModelRouter) {
    this.aiml = aiml || new AIMLService();
    this.router = router || new ModelRouter();
  }

  /**
   * Generate credit dispute letter
   * 
   * Uses Claude 4.5 Sonnet for best legal writing quality
   * 
   * @param input - Dispute generation input
   * @returns Professionally formatted dispute letter
   */
  async generateDispute(input: DisputeGenerationInput): Promise<string> {
    const model = this.router.getModel(TaskType.DISPUTE_GENERATION);

    const systemPrompt = `You are an expert credit repair specialist with deep knowledge of:
- Fair Credit Reporting Act (FCRA)
- Fair Debt Collection Practices Act (FDCPA)
- Consumer Financial Protection Bureau (CFPB) regulations
- Credit bureau dispute procedures

Generate professional, legally compliant dispute letters that:
1. Cite relevant laws and sections
2. Include specific account details
3. Request investigation and correction
4. Set appropriate deadlines
5. Maintain professional tone
6. Protect consumer rights`;

    const userPrompt = `Generate a credit dispute letter for the following situation:

**Dispute Reason:** ${input.disputeReason}

**User Information:**
- Name: ${input.userInfo.name}
- Address: ${input.userInfo.address}
${input.userInfo.accountNumber ? `- Account Number: ${input.userInfo.accountNumber}` : ''}

**Credit Report Data:**
${JSON.stringify(input.creditReport, null, 2)}

${input.additionalContext ? `**Additional Context:**\n${input.additionalContext}` : ''}

**Requirements:**
- Professional business letter format
- Cite FCRA Section 609, 611, or 623 as appropriate
- Include specific account details and dates
- Request investigation within 30 days per FCRA
- Request verification of disputed items
- Include statement of consumer rights
- Maintain firm but professional tone

Generate the complete dispute letter now.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.aiml.chat(model, messages, {
      temperature: 0.7,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Analyze credit report
   * 
   * Uses DeepSeek R1 for advanced reasoning and analysis
   * 
   * @param input - Credit analysis input
   * @returns Comprehensive credit analysis
   */
  async analyzeCreditReport(input: CreditAnalysisInput): Promise<CreditAnalysisOutput> {
    const model = this.router.getModel(TaskType.CREDIT_ANALYSIS);

    const systemPrompt = `You are a credit analysis expert with deep knowledge of credit scoring models (FICO, VantageScore), credit reporting, and credit repair strategies.

Analyze credit reports to identify:
1. Factors affecting credit score
2. Negative items that can be disputed
3. Positive items to leverage
4. Actionable steps to improve credit
5. Realistic timelines

Provide detailed, data-driven analysis with specific recommendations.`;

    const userPrompt = `Analyze this credit report and provide a comprehensive analysis:

**Credit Report:**
${JSON.stringify(input.creditReport, null, 2)}

${input.creditScore ? `**Current Credit Score:** ${input.creditScore}` : ''}

${input.goals ? `**User Goals:**\n${input.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}` : ''}

**Required Output Format (JSON):**
{
  "score_factors": ["factor1", "factor2", ...],
  "negative_items": [
    {
      "item": "description",
      "impact": "high|medium|low",
      "disputable": true|false,
      "reason": "why disputable or not"
    }
  ],
  "positive_items": ["item1", "item2", ...],
  "action_plan": [
    {
      "step": 1,
      "action": "specific action",
      "timeline": "timeframe",
      "priority": "high|medium|low"
    }
  ],
  "timeline_estimate": "overall timeline",
  "estimated_score_improvement": number
}

Provide only the JSON output, no additional text.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.aiml.chat(model, messages, {
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse credit analysis response:', error);
      throw new Error('Failed to parse credit analysis response');
    }
  }

  /**
   * Generate student loan repayment strategy
   * 
   * Uses DeepSeek V3.1 Terminus for advanced mathematical reasoning
   * 
   * @param input - Loan strategy input
   * @returns Comprehensive loan repayment strategy
   */
  async generateLoanStrategy(input: LoanStrategyInput): Promise<LoanStrategyOutput> {
    const model = this.router.getModel(TaskType.STUDENT_LOAN_STRATEGY);

    const systemPrompt = `You are a student loan expert with comprehensive knowledge of:
- Federal student loan programs (Direct, FFEL, Perkins)
- Income-Driven Repayment (IDR) plans (PAYE, REPAYE, IBR, ICR)
- Public Service Loan Forgiveness (PSLF)
- Teacher Loan Forgiveness
- Income-based calculations and formulas
- Tax implications of forgiveness
- Loan consolidation strategies

Use advanced mathematical reasoning to calculate optimal repayment strategies that minimize total cost while considering the borrower's financial situation and goals.`;

    const userPrompt = `Calculate the optimal student loan repayment strategy:

**Loan Data:**
${JSON.stringify(input.loanData, null, 2)}

**Financial Situation:**
${JSON.stringify(input.financialSituation, null, 2)}

${input.goals ? `**Goals:**\n${input.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}` : ''}

**Analysis Required:**
1. Calculate payments for all applicable IDR plans
2. Compare total costs across plans
3. Analyze PSLF eligibility and timeline
4. Calculate potential forgiveness amounts
5. Assess tax implications
6. Provide specific recommendations

**Required Output Format (JSON):**
{
  "recommended_plan": {
    "name": "plan name",
    "description": "why this plan",
    "monthly_payment": number,
    "total_cost": number,
    "forgiveness_eligible": boolean,
    "forgiveness_timeline": "timeline if applicable"
  },
  "alternative_plans": [
    {
      "name": "plan name",
      "monthly_payment": number,
      "total_cost": number,
      "pros": ["pro1", "pro2"],
      "cons": ["con1", "con2"]
    }
  ],
  "pslf_analysis": {
    "eligible": boolean,
    "qualifying_payments": number,
    "remaining_payments": number,
    "estimated_forgiveness_amount": number
  },
  "tax_implications": "description",
  "recommendations": ["rec1", "rec2", ...]
}

Provide detailed calculations and reasoning. Output only the JSON, no additional text.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.aiml.chat(model, messages, {
      temperature: 0.2,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse loan strategy response:', error);
      throw new Error('Failed to parse loan strategy response');
    }
  }

  /**
   * Get legal compliance review
   * 
   * Ensures content complies with FCRA, FDCPA, and other regulations
   * 
   * @param content - Content to review
   * @param contentType - Type of content (dispute_letter, advice, etc.)
   * @returns Compliance review with issues and recommendations
   */
  async reviewCompliance(
    content: string,
    contentType: string
  ): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
    risk_level: 'low' | 'medium' | 'high';
  }> {
    const model = this.router.getModel(TaskType.LEGAL_COMPLIANCE);

    const systemPrompt = `You are a legal compliance expert specializing in consumer financial protection laws:
- Fair Credit Reporting Act (FCRA)
- Fair Debt Collection Practices Act (FDCPA)
- Consumer Financial Protection Bureau (CFPB) regulations
- State consumer protection laws

Review content for legal compliance and identify potential issues.`;

    const userPrompt = `Review this ${contentType} for legal compliance:

**Content:**
${content}

**Required Output Format (JSON):**
{
  "compliant": boolean,
  "issues": ["issue1", "issue2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "risk_level": "low|medium|high"
}

Provide only the JSON output.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.aiml.chat(model, messages, {
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content_response = response.choices[0].message.content || '';
    const jsonMatch = content_response.match(/```json\n([\s\S]*?)\n```/) || content_response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content_response;
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse compliance review response:', error);
      throw new Error('Failed to parse compliance review response');
    }
  }

  /**
   * Multi-model consensus
   * 
   * Get responses from multiple models and synthesize the best answer
   * Useful for critical decisions where accuracy is paramount
   * 
   * @param taskType - Type of task
   * @param prompt - User prompt
   * @param options - Optional chat parameters
   * @returns Consensus result with individual responses
   */
  async getConsensus<T = any>(
    taskType: TaskType,
    prompt: string,
    options?: ChatOptions
  ): Promise<ConsensusResult<T>> {
    const models = this.router.getAllModels(taskType);
    
    if (models.length < 2) {
      throw new Error(`Consensus requires at least 2 models, but only ${models.length} available for ${taskType}`);
    }

    // Get responses from multiple models in parallel
    const responses = await Promise.all(
      models.map(async (model) => {
        try {
          const response = await this.aiml.chat(
            model,
            [{ role: 'user', content: prompt }],
            options
          );
          return {
            model,
            content: response.choices[0].message.content,
            success: true,
          };
        } catch (error) {
          console.error(`Model ${model} failed:`, error);
          return {
            model,
            content: null,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Filter successful responses
    const successfulResponses = responses.filter((r) => r.success && r.content);
    
    if (successfulResponses.length === 0) {
      throw new Error('All models failed to generate responses');
    }

    // Use a meta-model to synthesize the best answer
    const metaModel = 'openai/gpt-5-pro';
    const synthesisPrompt = `You are a meta-analyst synthesizing responses from multiple AI models.

Given these ${successfulResponses.length} AI responses to the same question, synthesize the best answer by:
1. Identifying common themes and agreements
2. Resolving contradictions with reasoning
3. Combining unique insights from each response
4. Providing a comprehensive, accurate synthesis

**Original Question:**
${prompt}

**Responses:**
${successfulResponses.map((r, i) => `
**Response ${i + 1} (${r.model}):**
${r.content}
`).join('\n')}

**Your Task:**
Provide a comprehensive synthesis that represents the best combined answer. If the responses are in JSON format, output JSON. Otherwise, output natural language.`;

    const synthesisResponse = await this.aiml.chat(
      metaModel,
      [{ role: 'user', content: synthesisPrompt }],
      { ...options, temperature: 0.3 }
    );

    const consensusContent = synthesisResponse.choices[0].message.content;

    // Calculate confidence score based on agreement
    const confidence_score = this.calculateConfidenceScore(successfulResponses.map((r) => r.content!));

    return {
      consensus: consensusContent as T,
      individual_responses: successfulResponses.map((r) => ({
        model: r.model,
        content: r.content,
      })),
      models_used: successfulResponses.map((r) => r.model),
      confidence_score,
    };
  }

  /**
   * Calculate confidence score based on response similarity
   * 
   * @param responses - Array of response contents
   * @returns Confidence score (0-1)
   */
  private calculateConfidenceScore(responses: string[]): number {
    if (responses.length < 2) return 1.0;

    // Simple heuristic: calculate similarity based on common words
    const wordSets = responses.map((r) => 
      new Set(r.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
    );

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < wordSets.length; i++) {
      for (let j = i + 1; j < wordSets.length; j++) {
        const intersection = new Set(Array.from(wordSets[i]).filter((x) => wordSets[j].has(x)));
        const union = new Set(Array.from(wordSets[i]).concat(Array.from(wordSets[j])));
        const similarity = intersection.size / union.size;
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  /**
   * Generate quick response using fast model
   * 
   * @param prompt - User prompt
   * @param systemPrompt - Optional system prompt
   * @returns Quick response
   */
  async quickResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.router.getModel(TaskType.QUICK_RESPONSE);

    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.aiml.chat(model, messages, {
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Get the underlying AIML service
   */
  getAIMLService(): AIMLService {
    return this.aiml;
  }

  /**
   * Get the underlying model router
   */
  getModelRouter(): ModelRouter {
    return this.router;
  }
}

/**
 * Create a singleton instance of AIOrchestrator
 */
let orchestratorInstance: AIOrchestrator | null = null;

export function getAIOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAIOrchestrator(): void {
  orchestratorInstance = null;
}

export default AIOrchestrator;

