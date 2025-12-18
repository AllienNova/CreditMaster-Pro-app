/**
 * Bill Negotiation Service
 *
 * AI-powered bill negotiation assistant that helps users reduce their bills
 * through intelligent negotiation scripts, market comparisons, and tracking.
 */

import { supabase } from '@/lib/supabase';
import type { Bill, BillCategory } from './types/bill.types';
import type {
  BillNegotiation,
  NegotiationScripts,
  NegotiationAttempt,
  NegotiationSummary,
  NegotiationOpportunity,
  NegotiationCreateInput,
  NegotiationUpdateInput,
  NegotiationAttemptInput,
  BillComparisonData,
  CompetitorRate,
  MerchantContactInfo,
  NegotiationInsight,
  MarketRateData,
  NegotiationType,
  NegotiationStatus,
} from './types/bill-negotiation.types';

// ============================================================================
// MARKET DATA (Would be fetched from external APIs in production)
// ============================================================================

const MARKET_RATES: Record<string, MarketRateData> = {
  internet: {
    category: 'internet',
    service: 'Internet Service',
    averageRate: 65,
    minRate: 30,
    maxRate: 120,
    providers: [
      {
        provider: 'Xfinity',
        rate: 55,
        features: ['200 Mbps', 'No contract'],
        promotionalRate: 30,
        promotionalPeriod: '12 months',
      },
      {
        provider: 'AT&T Fiber',
        rate: 55,
        features: ['300 Mbps', 'No data cap'],
      },
      {
        provider: 'Verizon Fios',
        rate: 50,
        features: ['300 Mbps', 'No contract'],
      },
      {
        provider: 'T-Mobile Home',
        rate: 50,
        features: ['Unlimited', 'No contract'],
      },
    ],
    lastUpdated: new Date(),
  },
  phone: {
    category: 'phone',
    service: 'Mobile Phone',
    averageRate: 75,
    minRate: 25,
    maxRate: 150,
    providers: [
      {
        provider: 'Mint Mobile',
        rate: 30,
        features: ['Unlimited talk/text', '10GB data'],
      },
      {
        provider: 'Visible',
        rate: 30,
        features: ['Unlimited everything', 'Verizon network'],
      },
      {
        provider: 'T-Mobile',
        rate: 50,
        features: ['Unlimited', 'Netflix included'],
        promotionalRate: 35,
        promotionalPeriod: '6 months',
      },
      {
        provider: 'Cricket',
        rate: 40,
        features: ['Unlimited', 'AT&T network'],
      },
    ],
    lastUpdated: new Date(),
  },
  streaming: {
    category: 'streaming',
    service: 'Streaming Services',
    averageRate: 15,
    minRate: 7,
    maxRate: 25,
    providers: [
      {
        provider: 'Netflix',
        rate: 15.49,
        features: ['Standard HD', '2 screens'],
      },
      { provider: 'Disney+', rate: 7.99, features: ['4K', 'Downloads'] },
      { provider: 'Hulu', rate: 7.99, features: ['With ads', 'Next-day TV'] },
      { provider: 'Max', rate: 15.99, features: ['Ad-free', 'HBO content'] },
    ],
    lastUpdated: new Date(),
  },
  insurance: {
    category: 'insurance',
    service: 'Auto Insurance',
    averageRate: 150,
    minRate: 80,
    maxRate: 300,
    providers: [
      {
        provider: 'GEICO',
        rate: 120,
        features: ['Multi-policy discount', 'Good driver discount'],
      },
      {
        provider: 'Progressive',
        rate: 130,
        features: ['Snapshot discount', 'Bundle savings'],
      },
      {
        provider: 'State Farm',
        rate: 140,
        features: ['Drive Safe discount', 'Local agent'],
      },
      {
        provider: 'USAA',
        rate: 100,
        features: ['Military discount', 'Excellent service'],
      },
    ],
    lastUpdated: new Date(),
  },
  utilities: {
    category: 'utilities',
    service: 'Electric/Gas',
    averageRate: 150,
    minRate: 80,
    maxRate: 300,
    providers: [],
    lastUpdated: new Date(),
  },
};

const MERCHANT_CONTACTS: Record<string, MerchantContactInfo> = {
  comcast: {
    phone: '1-800-934-6489',
    retentionDepartment: 'Ask for Retention',
    bestTimeToCall: 'Tuesday-Thursday 10am-2pm',
    tips: ['Mention competitor offers', 'Be prepared to cancel'],
  },
  xfinity: {
    phone: '1-800-934-6489',
    retentionDepartment: 'Ask for Retention',
    bestTimeToCall: 'Tuesday-Thursday 10am-2pm',
    tips: ['Mention competitor offers', 'Be prepared to cancel'],
  },
  'at&t': {
    phone: '1-800-288-2020',
    retentionDepartment: 'Loyalty Department',
    bestTimeToCall: 'Weekday mornings',
    tips: [
      'Ask about unadvertised promotions',
      'Mention long-term customer status',
    ],
  },
  verizon: {
    phone: '1-800-922-0204',
    retentionDepartment: 'Customer Retention',
    bestTimeToCall: 'Early morning',
    tips: ['Reference competitor pricing', 'Ask about loyalty discounts'],
  },
  't-mobile': {
    phone: '1-800-937-8997',
    retentionDepartment: 'Account Services',
    bestTimeToCall: 'Weekday afternoons',
    tips: ['Mention switching to competitor', 'Ask about insider discounts'],
  },
  netflix: {
    chatUrl: 'https://help.netflix.com',
    tips: ['Downgrade plan temporarily', 'Ask about promotional rates'],
  },
  spotify: {
    chatUrl: 'https://support.spotify.com',
    tips: ['Student/family plans available', 'Annual subscription discount'],
  },
  geico: {
    phone: '1-800-841-3000',
    tips: ['Bundle policies', 'Ask about all available discounts'],
  },
  progressive: {
    phone: '1-800-776-4737',
    tips: ['Use Snapshot program', 'Bundle home and auto'],
  },
  'state farm': {
    phone: '1-800-782-8332',
    tips: ['Ask local agent for discounts', 'Bundle policies'],
  },
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class BillNegotiationService {
  // -------------------------------------------------------------------------
  // NEGOTIATION CRUD
  // -------------------------------------------------------------------------

  async createNegotiation(
    userId: string,
    input: NegotiationCreateInput,
    bill: Bill
  ): Promise<BillNegotiation> {
    const targetAmount = input.targetAmount ?? bill.amount * 0.8; // Default 20% reduction
    const comparisonData = this.getComparisonData(bill.category, bill.amount);
    const contactInfo = this.getMerchantContactInfo(bill.merchantName);

    let scripts: NegotiationScripts | undefined;
    let talkingPoints: string[] | undefined;

    if (input.generateScripts !== false) {
      scripts = await this.generateNegotiationScripts(
        bill,
        input.negotiationType,
        targetAmount,
        comparisonData
      );
      talkingPoints = this.generateTalkingPoints(
        bill,
        input.negotiationType,
        comparisonData
      );
    }

    const negotiation: Omit<BillNegotiation, 'id' | 'createdAt' | 'updatedAt'> =
      {
        userId,
        billId: input.billId,
        merchantName: bill.merchantName,
        category: bill.category,
        currentAmount: bill.amount,
        targetAmount,
        negotiationType: input.negotiationType,
        status: 'researching',
        scripts,
        talkingPoints,
        comparisonData,
        contactInfo,
        notes: input.notes,
        attemptHistory: [],
      };

    const { data, error } = await supabase
      .from('bill_negotiations')
      .insert(this.mapNegotiationToDb(negotiation))
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create negotiation: ${error.message}`);
    }

    return this.mapNegotiationFromDb(data);
  }

  async getNegotiation(
    negotiationId: string,
    userId: string
  ): Promise<BillNegotiation | null> {
    const { data, error } = await supabase
      .from('bill_negotiations')
      .select('*')
      .eq('id', negotiationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapNegotiationFromDb(data);
  }

  async getUserNegotiations(
    userId: string,
    status?: NegotiationStatus
  ): Promise<BillNegotiation[]> {
    let query = supabase
      .from('bill_negotiations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get negotiations: ${error.message}`);
    return (data || []).map(this.mapNegotiationFromDb);
  }

  async updateNegotiation(
    negotiationId: string,
    userId: string,
    input: NegotiationUpdateInput
  ): Promise<BillNegotiation> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status) updateData.status = input.status;
    if (input.outcome) updateData.outcome = input.outcome;
    if (input.actualSavings !== undefined)
      updateData.actual_savings = input.actualSavings;
    if (input.notes) updateData.notes = input.notes;
    if (input.targetAmount) updateData.target_amount = input.targetAmount;

    if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('bill_negotiations')
      .update(updateData)
      .eq('id', negotiationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update negotiation: ${error.message}`);
    return this.mapNegotiationFromDb(data);
  }

  async addAttempt(
    negotiationId: string,
    userId: string,
    input: NegotiationAttemptInput
  ): Promise<BillNegotiation> {
    const negotiation = await this.getNegotiation(negotiationId, userId);
    if (!negotiation) throw new Error('Negotiation not found');

    const attempt: NegotiationAttempt = {
      id: crypto.randomUUID(),
      date: new Date(),
      method: input.method,
      contactName: input.contactName,
      outcome: input.outcome,
      offeredAmount: input.offeredAmount,
      notes: input.notes,
      followUpDate: input.followUpDate,
    };

    const updatedHistory = [...negotiation.attemptHistory, attempt];
    const newStatus: NegotiationStatus =
      input.outcome === 'success'
        ? 'completed'
        : input.outcome === 'pending'
          ? 'awaiting_response'
          : 'in_progress';

    const { data, error } = await supabase
      .from('bill_negotiations')
      .update({
        attempt_history: JSON.stringify(updatedHistory),
        status: newStatus,
        outcome: input.outcome === 'success' ? 'success' : negotiation.outcome,
        actual_savings:
          input.outcome === 'success' && input.offeredAmount
            ? negotiation.currentAmount - input.offeredAmount
            : negotiation.actualSavings,
        completed_at:
          input.outcome === 'success' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', negotiationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to add attempt: ${error.message}`);
    return this.mapNegotiationFromDb(data);
  }

  // -------------------------------------------------------------------------
  // SUMMARY & OPPORTUNITIES
  // -------------------------------------------------------------------------

  async getNegotiationSummary(userId: string): Promise<NegotiationSummary> {
    const negotiations = await this.getUserNegotiations(userId);
    const completed = negotiations.filter((n) => n.status === 'completed');
    const successful = completed.filter((n) => n.outcome === 'success');

    const totalSavings = successful.reduce(
      (sum, n) => sum + (n.actualSavings || 0),
      0
    );
    const monthlySavings = totalSavings; // Assuming monthly bills
    const annualSavings = monthlySavings * 12;

    // Get opportunities from user's bills
    const opportunities = await this.identifyOpportunities(userId);

    return {
      totalNegotiations: negotiations.length,
      activeNegotiations: negotiations.filter(
        (n) => !['completed', 'cancelled', 'declined'].includes(n.status)
      ).length,
      completedNegotiations: completed.length,
      successRate:
        completed.length > 0 ? (successful.length / completed.length) * 100 : 0,
      totalSavings,
      monthlySavings,
      annualSavings,
      topOpportunities: opportunities.slice(0, 5),
      recentSuccesses: successful.slice(0, 3),
    };
  }

  async identifyOpportunities(
    userId: string
  ): Promise<NegotiationOpportunity[]> {
    // Get user's bills
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !bills) return [];

    const opportunities: NegotiationOpportunity[] = [];

    for (const bill of bills) {
      const mappedBill = this.mapBillFromDb(bill);
      const comparison = this.getComparisonData(
        mappedBill.category,
        mappedBill.amount
      );

      if (comparison && comparison.savingsPotential > 0) {
        opportunities.push({
          billId: mappedBill.id,
          merchantName: mappedBill.merchantName,
          category: mappedBill.category,
          currentAmount: mappedBill.amount,
          potentialSavings: comparison.savingsPotential,
          confidence: this.calculateConfidence(mappedBill, comparison),
          reason: this.getOpportunityReason(mappedBill, comparison),
          suggestedApproach: this.suggestApproach(mappedBill, comparison),
        });
      }
    }

    return opportunities.sort(
      (a, b) => b.potentialSavings - a.potentialSavings
    );
  }

  // -------------------------------------------------------------------------
  // SCRIPT GENERATION
  // -------------------------------------------------------------------------

  async generateNegotiationScripts(
    bill: Bill,
    negotiationType: NegotiationType,
    targetAmount: number,
    comparison?: BillComparisonData
  ): Promise<NegotiationScripts> {
    const savings = bill.amount - targetAmount;
    const savingsPercent = Math.round((savings / bill.amount) * 100);
    const competitorInfo = comparison?.competitors[0];

    const phoneScript = this.buildPhoneScript(
      bill,
      negotiationType,
      targetAmount,
      savingsPercent,
      competitorInfo
    );
    const emailScript = this.buildEmailScript(
      bill,
      negotiationType,
      targetAmount,
      savingsPercent,
      competitorInfo
    );
    const chatScript = this.buildChatScript(
      bill,
      negotiationType,
      targetAmount,
      savingsPercent
    );
    const retentionScript = this.buildRetentionScript(
      bill,
      negotiationType,
      targetAmount,
      competitorInfo
    );

    return { phoneScript, emailScript, chatScript, retentionScript };
  }

  private buildPhoneScript(
    bill: Bill,
    negotiationType: NegotiationType,
    targetAmount: number,
    savingsPercent: number,
    competitor?: CompetitorRate
  ): string {
    const intro = `Hi, my name is [YOUR NAME] and I've been a loyal ${bill.merchantName} customer. I'm calling about my account.`;

    let body = '';
    switch (negotiationType) {
      case 'rate_reduction':
        body = `I've been reviewing my monthly expenses and noticed I'm paying $${bill.amount}/month for my service. I've been a loyal customer and I'm hoping you can help me get a better rate. ${competitor ? `I've seen that ${competitor.provider} is offering similar service for $${competitor.rate}/month.` : ''} Is there anything you can do to help me lower my bill to around $${targetAmount}/month?`;
        break;
      case 'loyalty_discount':
        body = `I've been a customer for a while now and I really enjoy your service. However, I've noticed that new customers often get better promotional rates. I'd like to stay with ${bill.merchantName}, but I'm wondering if there are any loyalty discounts or promotions available for existing customers like myself?`;
        break;
      case 'price_match':
        body = `I've been comparing prices and found that ${competitor?.provider || 'a competitor'} is offering a similar service for ${competitor ? `$${competitor.rate}` : 'less'}. I'd prefer to stay with ${bill.merchantName}, but I need to make sure I'm getting a competitive rate. Can you match or beat that price?`;
        break;
      case 'cancellation':
        body = `I'm calling to cancel my service. I've found a better deal elsewhere and need to reduce my monthly expenses. [PAUSE - Let them transfer you to retention]`;
        break;
      default:
        body = `I'm looking to reduce my monthly bill. My current rate is $${bill.amount} and I'm hoping to get it down to around $${targetAmount}. What options do you have available?`;
    }

    const closing = `\n\nIf they say no: "I understand. Is there a supervisor or retention specialist I could speak with? I'd really like to stay with ${bill.merchantName} but I need to find a way to reduce my expenses."`;

    return `${intro}\n\n${body}${closing}`;
  }

  private buildEmailScript(
    bill: Bill,
    negotiationType: NegotiationType,
    targetAmount: number,
    savingsPercent: number,
    competitor?: CompetitorRate
  ): string {
    return `Subject: Request for Rate Review - Account Holder

Dear ${bill.merchantName} Customer Service,

I am writing to request a review of my current rate. I have been a loyal customer and value the service you provide.

Currently, I am paying $${bill.amount} per month. ${competitor ? `I have recently received offers from ${competitor.provider} for similar service at $${competitor.rate} per month.` : 'I have been researching competitive rates in the market.'}

I would prefer to continue my service with ${bill.merchantName}, but I need to ensure I am receiving a competitive rate. I am hoping you can offer me a rate closer to $${targetAmount} per month, which would represent a ${savingsPercent}% reduction.

Please let me know what options are available. I am happy to discuss this further at your convenience.

Thank you for your time and consideration.

Best regards,
[YOUR NAME]
Account Number: [YOUR ACCOUNT NUMBER]
Phone: [YOUR PHONE NUMBER]`;
  }

  private buildChatScript(
    bill: Bill,
    negotiationType: NegotiationType,
    targetAmount: number,
    savingsPercent: number
  ): string {
    return `Opening: "Hi, I'd like to discuss my current rate. I'm paying $${bill.amount}/month and I'm looking to reduce my bill."

Key Points to Mention:
• You're a loyal customer
• You've been reviewing your expenses
• You've seen competitive offers elsewhere
• You'd prefer to stay but need a better rate

Target: $${targetAmount}/month (${savingsPercent}% reduction)

If they can't help: "Can you please transfer me to someone who can help with rate adjustments or the retention department?"`;
  }

  private buildRetentionScript(
    bill: Bill,
    negotiationType: NegotiationType,
    targetAmount: number,
    competitor?: CompetitorRate
  ): string {
    return `[FOR RETENTION DEPARTMENT]

"Hi, I'm considering canceling my service because I've found a better rate elsewhere. ${competitor ? `${competitor.provider} is offering me $${competitor.rate}/month.` : 'I need to reduce my monthly expenses.'}"

[PAUSE - Let them make an offer]

If their offer isn't good enough:
"I appreciate that, but I was really hoping to get my bill down to around $${targetAmount}. Is there anything else you can do?"

If they still can't help:
"I understand you have limitations. Can I speak with a supervisor? I've been a loyal customer and I'd hate to leave over $${(bill.amount - targetAmount).toFixed(2)}/month."

Remember:
• Stay calm and polite
• Be prepared to actually cancel if needed
• Ask about promotional rates, loyalty discounts, or plan changes
• Get any offers in writing before accepting`;
  }

  generateTalkingPoints(
    bill: Bill,
    negotiationType: NegotiationType,
    comparison?: BillComparisonData
  ): string[] {
    const points: string[] = [
      `Current monthly payment: $${bill.amount}`,
      'Mention your loyalty and payment history',
      'Be polite but firm about needing a better rate',
      'Ask to speak with retention if initial rep cannot help',
    ];

    if (comparison) {
      if (comparison.marketPosition === 'above_average') {
        points.push(
          `Your rate is above market average ($${comparison.averageMarketRate})`
        );
      }
      if (comparison.lowestCompetitorRate < bill.amount) {
        points.push(
          `Competitor rates start at $${comparison.lowestCompetitorRate}`
        );
      }
      points.push(`Potential savings: $${comparison.savingsPotential}/month`);
    }

    switch (negotiationType) {
      case 'rate_reduction':
        points.push('Ask about current promotions for existing customers');
        points.push(
          'Inquire about lower-tier plans that might meet your needs'
        );
        break;
      case 'loyalty_discount':
        points.push("Emphasize how long you've been a customer");
        points.push('Ask about loyalty rewards or anniversary discounts');
        break;
      case 'price_match':
        points.push('Have competitor offer ready to reference');
        points.push('Ask if they have a price match policy');
        break;
      case 'cancellation':
        points.push('Be prepared to actually cancel');
        points.push(
          'Retention department has more authority to offer discounts'
        );
        break;
    }

    return points;
  }

  // -------------------------------------------------------------------------
  // COMPARISON & CONTACT DATA
  // -------------------------------------------------------------------------

  getComparisonData(
    category: BillCategory,
    currentAmount: number
  ): BillComparisonData | undefined {
    const marketData = MARKET_RATES[category];
    if (!marketData || marketData.providers.length === 0) return undefined;

    const lowestRate = Math.min(
      ...marketData.providers.map((p) => p.promotionalRate || p.rate)
    );
    const savingsPotential = Math.max(0, currentAmount - lowestRate);

    let marketPosition: 'below_average' | 'average' | 'above_average' =
      'average';
    if (currentAmount > marketData.averageRate * 1.1)
      marketPosition = 'above_average';
    else if (currentAmount < marketData.averageRate * 0.9)
      marketPosition = 'below_average';

    return {
      averageMarketRate: marketData.averageRate,
      lowestCompetitorRate: lowestRate,
      competitors: marketData.providers,
      savingsPotential,
      marketPosition,
    };
  }

  getMerchantContactInfo(
    merchantName: string
  ): MerchantContactInfo | undefined {
    const normalizedName = merchantName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, info] of Object.entries(MERCHANT_CONTACTS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return info;
      }
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // INSIGHTS
  // -------------------------------------------------------------------------

  async getInsights(userId: string): Promise<NegotiationInsight[]> {
    const summary = await this.getNegotiationSummary(userId);
    const insights: NegotiationInsight[] = [];

    // Success stories
    if (summary.recentSuccesses.length > 0) {
      const recent = summary.recentSuccesses[0];
      insights.push({
        type: 'success_story',
        title: 'Recent Win!',
        description: `You saved $${recent.actualSavings?.toFixed(2)}/month on ${recent.merchantName}`,
        category: recent.category,
        potentialSavings: recent.actualSavings,
      });
    }

    // Opportunities
    for (const opp of summary.topOpportunities.slice(0, 3)) {
      insights.push({
        type: 'opportunity',
        title: `Save on ${opp.merchantName}`,
        description: opp.reason,
        category: opp.category,
        potentialSavings: opp.potentialSavings,
      });
    }

    // Tips
    insights.push({
      type: 'tip',
      title: 'Best Time to Negotiate',
      description:
        'Call Tuesday-Thursday between 10am-2pm for shorter wait times and more helpful reps.',
    });

    if (summary.successRate < 50 && summary.completedNegotiations > 0) {
      insights.push({
        type: 'warning',
        title: 'Try the Retention Department',
        description:
          "If regular customer service can't help, ask to be transferred to the retention or loyalty department.",
      });
    }

    return insights;
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS
  // -------------------------------------------------------------------------

  private calculateConfidence(
    bill: Bill,
    comparison: BillComparisonData
  ): number {
    let confidence = 50;
    if (comparison.marketPosition === 'above_average') confidence += 20;
    if (comparison.savingsPotential > 20) confidence += 15;
    if (['internet', 'phone', 'streaming', 'insurance'].includes(bill.category))
      confidence += 10;
    return Math.min(95, confidence);
  }

  private getOpportunityReason(
    bill: Bill,
    comparison: BillComparisonData
  ): string {
    if (comparison.marketPosition === 'above_average') {
      return `Your rate of $${bill.amount} is above the market average of $${comparison.averageMarketRate}`;
    }
    if (comparison.lowestCompetitorRate < bill.amount * 0.8) {
      return `Competitors offer rates as low as $${comparison.lowestCompetitorRate}`;
    }
    return `Potential to save $${comparison.savingsPotential.toFixed(2)}/month`;
  }

  private suggestApproach(
    bill: Bill,
    comparison: BillComparisonData
  ): NegotiationType {
    if (comparison.competitors.some((c) => c.promotionalRate))
      return 'price_match';
    if (comparison.marketPosition === 'above_average') return 'rate_reduction';
    return 'loyalty_discount';
  }

  // -------------------------------------------------------------------------
  // DATABASE MAPPING
  // -------------------------------------------------------------------------

  private mapNegotiationToDb(
    negotiation: Omit<BillNegotiation, 'id' | 'createdAt' | 'updatedAt'>
  ): Record<string, unknown> {
    return {
      user_id: negotiation.userId,
      bill_id: negotiation.billId,
      merchant_name: negotiation.merchantName,
      category: negotiation.category,
      current_amount: negotiation.currentAmount,
      target_amount: negotiation.targetAmount,
      negotiation_type: negotiation.negotiationType,
      status: negotiation.status,
      outcome: negotiation.outcome,
      actual_savings: negotiation.actualSavings,
      scripts: negotiation.scripts ? JSON.stringify(negotiation.scripts) : null,
      talking_points: negotiation.talkingPoints
        ? JSON.stringify(negotiation.talkingPoints)
        : null,
      comparison_data: negotiation.comparisonData
        ? JSON.stringify(negotiation.comparisonData)
        : null,
      contact_info: negotiation.contactInfo
        ? JSON.stringify(negotiation.contactInfo)
        : null,
      notes: negotiation.notes,
      attempt_history: JSON.stringify(negotiation.attemptHistory),
    };
  }

  private mapNegotiationFromDb(data: Record<string, unknown>): BillNegotiation {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      billId: data.bill_id as string,
      merchantName: data.merchant_name as string,
      category: data.category as BillCategory,
      currentAmount: Number(data.current_amount),
      targetAmount: Number(data.target_amount),
      negotiationType: data.negotiation_type as NegotiationType,
      status: data.status as NegotiationStatus,
      outcome: data.outcome as BillNegotiation['outcome'],
      actualSavings: data.actual_savings
        ? Number(data.actual_savings)
        : undefined,
      scripts: data.scripts ? JSON.parse(data.scripts as string) : undefined,
      talkingPoints: data.talking_points
        ? JSON.parse(data.talking_points as string)
        : undefined,
      comparisonData: data.comparison_data
        ? JSON.parse(data.comparison_data as string)
        : undefined,
      contactInfo: data.contact_info
        ? JSON.parse(data.contact_info as string)
        : undefined,
      notes: data.notes as string | undefined,
      attemptHistory: data.attempt_history
        ? JSON.parse(data.attempt_history as string)
        : [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      completedAt: data.completed_at
        ? new Date(data.completed_at as string)
        : undefined,
    };
  }

  private mapBillFromDb(data: Record<string, unknown>): Bill {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      merchantName: data.merchant_name as string,
      category: data.category as BillCategory,
      amount: Number(data.amount),
      frequency: data.frequency as Bill['frequency'],
      nextDueDate: new Date(data.next_due_date as string),
      lastPaidDate: data.last_paid_date
        ? new Date(data.last_paid_date as string)
        : undefined,
      lastPaidAmount: data.last_paid_amount
        ? Number(data.last_paid_amount)
        : undefined,
      status: data.status as Bill['status'],
      isAutoPay: Boolean(data.is_auto_pay),
      accountId: data.account_id as string | undefined,
      notes: data.notes as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const billNegotiationService = new BillNegotiationService();
export default billNegotiationService;
