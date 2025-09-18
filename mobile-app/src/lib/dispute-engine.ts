import OpenAI from 'openai';
import { supabase } from './supabase';
import { ADVANCED_STRATEGIES } from './strategies';
import type { 
  CreditItem, 
  Strategy, 
  DisputeLetter, 
  DisputeExecution,
  User,
  DisputeTemplate,
  DisputeResponse
} from '@/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface DisputeGenerationRequest {
  creditItem: CreditItem;
  strategy: Strategy;
  user: User;
  customInstructions?: string;
  previousDisputes?: DisputeExecution[];
}

export interface GeneratedDispute {
  letter: DisputeLetter;
  execution: DisputeExecution;
  followUpSchedule: FollowUpAction[];
  legalCitations: string[];
  attachments: DisputeAttachment[];
}

export interface FollowUpAction {
  id: string;
  type: 'follow_up_letter' | 'escalation' | 'legal_action' | 'mov_request';
  scheduledDate: Date;
  description: string;
  automated: boolean;
}

export interface DisputeAttachment {
  type: 'identity_verification' | 'supporting_document' | 'legal_citation' | 'previous_correspondence';
  name: string;
  required: boolean;
  description: string;
}

export class DisputeEngine {
  private static readonly BUREAU_ADDRESSES = {
    experian: {
      name: 'Experian',
      address: 'P.O. Box 4500, Allen, TX 75013',
      online: 'https://www.experian.com/disputes/',
      phone: '1-888-397-3742'
    },
    equifax: {
      name: 'Equifax',
      address: 'P.O. Box 740256, Atlanta, GA 30374',
      online: 'https://www.equifax.com/personal/credit-report-services/credit-dispute/',
      phone: '1-866-349-5191'
    },
    transunion: {
      name: 'TransUnion',
      address: 'P.O. Box 2000, Chester, PA 19016',
      online: 'https://dispute.transunion.com/',
      phone: '1-800-916-8800'
    }
  };

  private static readonly DISPUTE_TEMPLATES = {
    // Method of Verification (MOV) Template
    mov_request: {
      subject: 'Request for Method of Verification - Account #{account_number}',
      template: `Dear {bureau_name} Dispute Department,

I am writing to formally request the Method of Verification (MOV) for the following account that appears on my credit report:

Account Details:
- Creditor: {creditor_name}
- Account Number: {account_number}
- Date Reported: {date_reported}
- Status: {payment_status}

Under the Fair Credit Reporting Act (FCRA) Section 611(a)(7), I have the right to know the specific method used to verify the accuracy of this information. This request is made in accordance with my rights under federal law.

Please provide:
1. The specific method used to verify this account
2. The name and business address of the person who verified the information
3. The business relationship between the verifying party and the furnisher
4. Copies of all documents used in the verification process

If you cannot provide the requested Method of Verification, please remove this item from my credit report immediately as it cannot be properly verified.

I look forward to your prompt response within 30 days as required by law.

Sincerely,
{consumer_name}
{consumer_address}
SSN: {ssn_masked}`
    },

    // Factual Dispute Template
    factual_dispute: {
      subject: 'Formal Dispute - Inaccurate Information on Credit Report',
      template: `Dear {bureau_name} Dispute Department,

I am disputing the following inaccurate information on my credit report:

Account Information:
- Creditor: {creditor_name}
- Account Number: {account_number}
- Current Status: {current_status}
- Date of Last Activity: {last_activity_date}

Dispute Reason:
{dispute_reason}

Supporting Facts:
{supporting_facts}

Under the Fair Credit Reporting Act (FCRA) Section 611, I request that you investigate this matter and correct or remove this inaccurate information from my credit report. The information listed above is inaccurate and should be corrected or deleted.

Please provide me with the results of your investigation in writing within 30 days.

Sincerely,
{consumer_name}
{consumer_address}
SSN: {ssn_masked}`
    },

    // Debt Validation Template
    debt_validation: {
      subject: 'Debt Validation Request - Account #{account_number}',
      template: `Dear {creditor_name},

This letter is sent in response to a notice I received indicating that I may owe a debt to your company. This is a formal request for validation of this debt under the Fair Debt Collection Practices Act (FDCPA) Section 809(b).

Account Details:
- Account Number: {account_number}
- Alleged Amount: {balance}
- Date of First Delinquency: {delinquency_date}

I am requesting that you provide the following information:
1. Proof that you own this debt or have been assigned this debt
2. Copy of the original signed contract or agreement
3. Complete payment history from the original creditor
4. Proof of your authority to collect this debt
5. Verification that the debt is within the statute of limitations

Please note that this is not a refusal to pay, but a request for validation that you have the right to collect this debt and that the amount is accurate.

Until you provide proper validation, please cease all collection activities and do not report this item to credit bureaus.

Sincerely,
{consumer_name}
{consumer_address}`
    },

    // Goodwill Letter Template
    goodwill_letter: {
      subject: 'Goodwill Request for Account #{account_number}',
      template: `Dear {creditor_name} Customer Relations,

I hope this letter finds you well. I am writing to request your consideration for a goodwill adjustment to my credit report regarding account #{account_number}.

I have been a customer of {creditor_name} and have generally maintained a positive relationship with your company. However, I had a period of financial difficulty that resulted in late payments on this account.

Current Situation:
- Account Number: {account_number}
- Current Status: {current_status}
- My Relationship: {customer_relationship}

I have since resolved my financial difficulties and have been making consistent, on-time payments. I am requesting that you consider removing the negative payment history from my credit report as a gesture of goodwill.

This adjustment would greatly help me in {goodwill_reason} and I would be extremely grateful for your consideration.

I value my relationship with {creditor_name} and hope to continue as a customer for many years to come.

Thank you for your time and consideration.

Sincerely,
{consumer_name}
{consumer_address}
Phone: {phone_number}`
    },

    // Identity Theft Affidavit Template
    identity_theft: {
      subject: 'Identity Theft Dispute - Fraudulent Account #{account_number}',
      template: `Dear {bureau_name} Fraud Department,

I am writing to report fraudulent information on my credit report that appears to be the result of identity theft.

Fraudulent Account Details:
- Creditor: {creditor_name}
- Account Number: {account_number}
- Date Opened: {date_opened}
- Status: {payment_status}

I did not open this account, authorize its opening, or receive any benefit from it. This account is the result of identity theft and should be removed from my credit report immediately.

Enclosed please find:
1. Completed Identity Theft Affidavit (FTC Form)
2. Copy of police report (if filed)
3. Copy of government-issued ID
4. Proof of address

Under the Fair Credit Reporting Act (FCRA) Section 605B, information resulting from identity theft must be blocked from appearing on credit reports upon proper notification.

Please investigate this matter immediately and remove all fraudulent information from my credit report.

Sincerely,
{consumer_name}
{consumer_address}
SSN: {ssn_masked}`
    },

    // Statute of Limitations Template
    statute_limitations: {
      subject: 'Dispute - Account Beyond Statute of Limitations #{account_number}',
      template: `Dear {bureau_name} Dispute Department,

I am disputing the following account that appears to be beyond the applicable statute of limitations:

Account Information:
- Creditor: {creditor_name}
- Account Number: {account_number}
- Date of First Delinquency: {delinquency_date}
- Current Status: {current_status}

Based on my records and applicable state law, this debt is beyond the statute of limitations for collection in my state ({state}). The statute of limitations for this type of debt is {limitation_period} years, and this debt is now {debt_age} years old.

Under the Fair Credit Reporting Act, information that is obsolete should not appear on credit reports. I request that you remove this time-barred debt from my credit report immediately.

Please confirm in writing that this item has been removed from my credit report.

Sincerely,
{consumer_name}
{consumer_address}
State of Residence: {state}`
    }
  };

  /**
   * Generate a complete dispute package for a credit item
   */
  static async generateDispute(request: DisputeGenerationRequest): Promise<GeneratedDispute> {
    try {
      const { creditItem, strategy, user, customInstructions, previousDisputes } = request;

      // Get the appropriate template
      const template = this.getDisputeTemplate(strategy.id);
      
      // Generate personalized letter content
      const letterContent = await this.generatePersonalizedLetter(
        template,
        creditItem,
        strategy,
        user,
        customInstructions,
        previousDisputes
      );

      // Create dispute letter
      const letter: DisputeLetter = {
        id: this.generateId(),
        user_id: user.id,
        item_id: creditItem.id,
        strategy_id: strategy.id,
        letter_type: this.getLetterType(strategy.id),
        recipient_type: this.getRecipientType(strategy.id),
        recipient_name: this.getRecipientName(creditItem, strategy.id),
        recipient_address: this.getRecipientAddress(creditItem, strategy.id),
        subject: letterContent.subject,
        content: letterContent.content,
        legal_citations: this.getLegalCitations(strategy.id),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create execution record
      const execution: DisputeExecution = {
        id: this.generateId(),
        user_id: user.id,
        item_id: creditItem.id,
        strategy_id: strategy.id,
        letter_id: letter.id,
        execution_status: 'pending',
        bureau: this.getTargetBureau(creditItem, strategy.id),
        dispute_reason: this.getDisputeReason(strategy.id),
        expected_response_date: this.calculateResponseDate(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Generate follow-up schedule
      const followUpSchedule = this.generateFollowUpSchedule(strategy, execution);

      // Get required attachments
      const attachments = this.getRequiredAttachments(strategy.id, creditItem);

      // Get legal citations
      const legalCitations = this.getLegalCitations(strategy.id);

      return {
        letter,
        execution,
        followUpSchedule,
        legalCitations,
        attachments
      };
    } catch (error) {
      console.error('Error generating dispute:', error);
      throw new Error('Failed to generate dispute package');
    }
  }

  /**
   * Generate personalized letter content using AI
   */
  private static async generatePersonalizedLetter(
    template: DisputeTemplate,
    creditItem: CreditItem,
    strategy: Strategy,
    user: User,
    customInstructions?: string,
    previousDisputes?: DisputeExecution[]
  ): Promise<{ subject: string; content: string }> {
    try {
      // Replace template variables
      let content = template.template;
      let subject = template.subject;

      const replacements = {
        '{bureau_name}': this.getBureauName(creditItem),
        '{creditor_name}': creditItem.creditor,
        '{account_number}': this.maskAccountNumber(creditItem.account_number),
        '{date_reported}': creditItem.first_reported_date,
        '{payment_status}': creditItem.payment_status,
        '{consumer_name}': user.full_name || user.email,
        '{consumer_address}': this.formatUserAddress(user),
        '{ssn_masked}': this.maskSSN(user.ssn),
        '{current_status}': creditItem.payment_status,
        '{last_activity_date}': creditItem.last_payment_date || creditItem.last_reported_date,
        '{balance}': creditItem.balance ? `$${creditItem.balance.toFixed(2)}` : 'Unknown',
        '{delinquency_date}': creditItem.date_opened,
        '{date_opened}': creditItem.date_opened,
        '{phone_number}': user.phone || '',
        '{state}': this.getUserState(user)
      };

      // Apply replacements
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '');
        subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '');
      });

      // Use AI to enhance the letter if custom instructions provided
      if (customInstructions || previousDisputes?.length) {
        const enhancedContent = await this.enhanceLetterWithAI(
          content,
          creditItem,
          strategy,
          customInstructions,
          previousDisputes
        );
        content = enhancedContent;
      }

      return { subject, content };
    } catch (error) {
      console.warn('AI enhancement failed, using template:', error);
      // Fallback to template without AI enhancement
      return { subject: template.subject, content: template.template };
    }
  }

  /**
   * Enhance letter content using AI
   */
  private static async enhanceLetterWithAI(
    baseContent: string,
    creditItem: CreditItem,
    strategy: Strategy,
    customInstructions?: string,
    previousDisputes?: DisputeExecution[]
  ): Promise<string> {
    const prompt = `
      Enhance this credit dispute letter to be more effective and personalized:
      
      Base Letter:
      ${baseContent}
      
      Credit Item Details:
      - Type: ${creditItem.item_type}
      - Status: ${creditItem.payment_status}
      - Age: ${this.calculateItemAge(creditItem)} years
      
      Strategy: ${strategy.name}
      Legal Basis: ${strategy.legal_basis}
      
      ${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}
      
      ${previousDisputes?.length ? `Previous Disputes: ${previousDisputes.length} attempts` : ''}
      
      Requirements:
      1. Keep the professional tone
      2. Strengthen legal arguments
      3. Add specific details that increase success probability
      4. Maintain FCRA compliance
      5. Keep under 500 words
      
      Return only the enhanced letter content.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || baseContent;
    } catch (error) {
      console.warn('AI enhancement failed:', error);
      return baseContent;
    }
  }

  /**
   * Execute dispute by sending letters and tracking
   */
  static async executeDispute(disputeId: string): Promise<void> {
    try {
      // Get dispute execution details
      const { data: execution, error } = await supabase
        .from('strategy_executions')
        .select(`
          *,
          credit_items (*),
          strategies (*),
          dispute_letters (*)
        `)
        .eq('id', disputeId)
        .single();

      if (error || !execution) {
        throw new Error('Dispute execution not found');
      }

      // Update status to executing
      await supabase
        .from('strategy_executions')
        .update({ 
          execution_status: 'executing',
          started_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      // Create dispute history record
      const disputeHistory = {
        item_id: execution.item_id,
        strategy_id: execution.strategy_id,
        dispute_date: new Date().toISOString().split('T')[0],
        bureau: execution.bureau || 'experian',
        dispute_reason: execution.dispute_reason,
        status: 'pending'
      };

      await supabase
        .from('dispute_history')
        .insert(disputeHistory);

      // Schedule follow-up actions
      await this.scheduleFollowUps(execution);

      // Send notification to user
      await this.sendDisputeNotification(execution.user_id, 'dispute_sent', {
        creditor: execution.credit_items.creditor,
        strategy: execution.strategies.strategy_name
      });

    } catch (error) {
      console.error('Error executing dispute:', error);
      throw error;
    }
  }

  /**
   * Process dispute response from bureau or creditor
   */
  static async processDisputeResponse(
    executionId: string,
    response: DisputeResponse
  ): Promise<void> {
    try {
      // Update execution status
      await supabase
        .from('strategy_executions')
        .update({
          execution_status: 'completed',
          completed_at: new Date().toISOString(),
          success: response.outcome === 'deleted' || response.outcome === 'modified',
          outcome_details: response
        })
        .eq('id', executionId);

      // Update dispute history
      await supabase
        .from('dispute_history')
        .update({
          status: response.outcome,
          response_date: new Date().toISOString().split('T')[0],
          outcome: response.details
        })
        .eq('strategy_execution_id', executionId);

      // Update credit item status if successful
      if (response.outcome === 'deleted') {
        await supabase
          .from('credit_items')
          .update({ status: 'resolved' })
          .eq('id', response.item_id);
      }

      // Determine next action
      await this.determineNextAction(executionId, response);

    } catch (error) {
      console.error('Error processing dispute response:', error);
      throw error;
    }
  }

  /**
   * Determine next action based on dispute response
   */
  private static async determineNextAction(
    executionId: string,
    response: DisputeResponse
  ): Promise<void> {
    const { data: execution } = await supabase
      .from('strategy_executions')
      .select(`
        *,
        credit_items (*),
        strategies (*)
      `)
      .eq('id', executionId)
      .single();

    if (!execution) return;

    let nextStrategy: Strategy | null = null;

    // Determine next strategy based on response
    switch (response.outcome) {
      case 'verified':
        // If verified, try MOV request or escalation
        nextStrategy = ADVANCED_STRATEGIES.find(s => s.id === 'mov_request') || null;
        break;
      
      case 'no_response':
        // If no response after 30 days, try estoppel by silence
        nextStrategy = ADVANCED_STRATEGIES.find(s => s.id === 'estoppel_silence') || null;
        break;
      
      case 'partial_success':
        // If partial success, try follow-up dispute
        nextStrategy = ADVANCED_STRATEGIES.find(s => s.id === 'factual_dispute') || null;
        break;
    }

    if (nextStrategy) {
      // Update execution with next recommended strategy
      await supabase
        .from('strategy_executions')
        .update({ next_strategy_recommended: nextStrategy.id })
        .eq('id', executionId);

      // Send notification about next recommended action
      await this.sendDisputeNotification(execution.user_id, 'next_action_recommended', {
        strategy: nextStrategy.name,
        creditor: execution.credit_items.creditor
      });
    }
  }

  /**
   * Schedule automated follow-up actions
   */
  private static async scheduleFollowUps(execution: any): Promise<void> {
    const followUps = [
      {
        type: 'status_check',
        days: 15,
        description: 'Check dispute status'
      },
      {
        type: 'follow_up_letter',
        days: 35,
        description: 'Send follow-up if no response'
      },
      {
        type: 'escalation',
        days: 45,
        description: 'Escalate to supervisor'
      }
    ];

    for (const followUp of followUps) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + followUp.days);

      // In a real implementation, you would use a job scheduler
      // For now, we'll store the schedule in the database
      await supabase
        .from('scheduled_actions')
        .insert({
          execution_id: execution.id,
          action_type: followUp.type,
          scheduled_date: scheduledDate.toISOString(),
          description: followUp.description,
          status: 'pending'
        });
    }
  }

  /**
   * Send notification to user
   */
  private static async sendDisputeNotification(
    userId: string,
    type: string,
    data: any
  ): Promise<void> {
    const notifications = {
      dispute_sent: {
        title: 'Dispute Letter Sent',
        message: `Your dispute for ${data.creditor} using ${data.strategy} has been sent.`
      },
      response_received: {
        title: 'Dispute Response Received',
        message: `Response received for your dispute with ${data.creditor}.`
      },
      next_action_recommended: {
        title: 'Next Action Recommended',
        message: `We recommend using ${data.strategy} for your ${data.creditor} dispute.`
      }
    };

    const notification = notifications[type as keyof typeof notifications];
    if (!notification) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'dispute_update',
        title: notification.title,
        message: notification.message,
        read: false
      });
  }

  // Helper methods
  private static getDisputeTemplate(strategyId: string): DisputeTemplate {
    return this.DISPUTE_TEMPLATES[strategyId as keyof typeof this.DISPUTE_TEMPLATES] || 
           this.DISPUTE_TEMPLATES.factual_dispute;
  }

  private static getLetterType(strategyId: string): string {
    const typeMap: Record<string, string> = {
      'mov_request': 'method_of_verification',
      'factual_dispute': 'factual_dispute',
      'debt_validation': 'debt_validation',
      'goodwill_saturation': 'goodwill_letter',
      'identity_theft': 'identity_theft',
      'statute_limitations': 'statute_limitations'
    };
    return typeMap[strategyId] || 'general_dispute';
  }

  private static getRecipientType(strategyId: string): 'bureau' | 'furnisher' {
    const furnisherStrategies = ['debt_validation', 'goodwill_saturation', 'pay_for_delete'];
    return furnisherStrategies.includes(strategyId) ? 'furnisher' : 'bureau';
  }

  private static getRecipientName(creditItem: CreditItem, strategyId: string): string {
    if (this.getRecipientType(strategyId) === 'furnisher') {
      return creditItem.furnisher || creditItem.creditor;
    }
    return this.getBureauName(creditItem);
  }

  private static getRecipientAddress(creditItem: CreditItem, strategyId: string): string {
    if (this.getRecipientType(strategyId) === 'furnisher') {
      return 'Customer Service Department'; // Would need to be looked up
    }
    
    const bureau = this.getTargetBureau(creditItem, strategyId);
    return this.BUREAU_ADDRESSES[bureau as keyof typeof this.BUREAU_ADDRESSES]?.address || '';
  }

  private static getBureauName(creditItem: CreditItem): string {
    // This would typically be determined from the credit report source
    return 'Experian'; // Default
  }

  private static getTargetBureau(creditItem: CreditItem, strategyId: string): string {
    // Logic to determine which bureau to dispute with
    return 'experian'; // Default
  }

  private static getDisputeReason(strategyId: string): string {
    const reasonMap: Record<string, string> = {
      'factual_dispute': 'Inaccurate information',
      'mov_request': 'Request for verification method',
      'debt_validation': 'Requesting debt validation',
      'identity_theft': 'Fraudulent account - identity theft',
      'statute_limitations': 'Account beyond statute of limitations'
    };
    return reasonMap[strategyId] || 'General dispute';
  }

  private static calculateResponseDate(): string {
    const responseDate = new Date();
    responseDate.setDate(responseDate.getDate() + 30); // 30 days for response
    return responseDate.toISOString().split('T')[0];
  }

  private static generateFollowUpSchedule(
    strategy: Strategy,
    execution: DisputeExecution
  ): FollowUpAction[] {
    const actions: FollowUpAction[] = [];
    const baseDate = new Date();

    // 15-day status check
    const statusCheck = new Date(baseDate);
    statusCheck.setDate(statusCheck.getDate() + 15);
    actions.push({
      id: this.generateId(),
      type: 'follow_up_letter',
      scheduledDate: statusCheck,
      description: 'Check dispute status with bureau',
      automated: true
    });

    // 35-day follow-up if no response
    const followUp = new Date(baseDate);
    followUp.setDate(followUp.getDate() + 35);
    actions.push({
      id: this.generateId(),
      type: 'escalation',
      scheduledDate: followUp,
      description: 'Send follow-up letter if no response received',
      automated: true
    });

    return actions;
  }

  private static getRequiredAttachments(strategyId: string, creditItem: CreditItem): DisputeAttachment[] {
    const baseAttachments: DisputeAttachment[] = [
      {
        type: 'identity_verification',
        name: 'Government-issued ID',
        required: true,
        description: 'Copy of driver\'s license or passport'
      }
    ];

    if (strategyId === 'identity_theft') {
      baseAttachments.push({
        type: 'supporting_document',
        name: 'Identity Theft Affidavit',
        required: true,
        description: 'Completed FTC Identity Theft Affidavit'
      });
    }

    return baseAttachments;
  }

  private static getLegalCitations(strategyId: string): string[] {
    const citationMap: Record<string, string[]> = {
      'mov_request': ['FCRA Section 611(a)(7)', '15 U.S.C. § 1681i(a)(7)'],
      'factual_dispute': ['FCRA Section 611', '15 U.S.C. § 1681i'],
      'debt_validation': ['FDCPA Section 809(b)', '15 U.S.C. § 1692g(b)'],
      'identity_theft': ['FCRA Section 605B', '15 U.S.C. § 1681c-2'],
      'statute_limitations': ['FCRA Section 605', '15 U.S.C. § 1681c']
    };
    return citationMap[strategyId] || ['FCRA Section 611'];
  }

  // Utility methods
  private static maskAccountNumber(accountNumber: string | null): string {
    if (!accountNumber) return 'XXXX';
    return accountNumber.length > 4 
      ? 'XXXX' + accountNumber.slice(-4)
      : accountNumber;
  }

  private static maskSSN(ssn: string | null): string {
    if (!ssn) return 'XXX-XX-XXXX';
    return ssn.length >= 4 
      ? 'XXX-XX-' + ssn.slice(-4)
      : 'XXX-XX-XXXX';
  }

  private static formatUserAddress(user: User): string {
    // This would format the user's address from their profile
    return user.address || 'Address on file';
  }

  private static getUserState(user: User): string {
    // Extract state from user address
    return user.state || 'Unknown';
  }

  private static calculateItemAge(creditItem: CreditItem): number {
    const firstReported = new Date(creditItem.first_reported_date);
    const now = new Date();
    return Math.floor((now.getTime() - firstReported.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export default DisputeEngine;

