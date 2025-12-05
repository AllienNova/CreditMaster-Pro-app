/**
 * Dispute Tracking Service
 *
 * Manages credit dispute lifecycle:
 * - Create disputes
 * - Track status
 * - Update progress
 * - Predict timelines
 * - Store outcomes
 * - Template-based letter generation
 * - Advanced strategy integration
 */

import {
  ALL_DISPUTE_TEMPLATES,
  getTemplateById,
  getTemplatesBySuccessRate,
  type DisputeTemplate,
} from '../prompts/dispute-templates';

import {
  ALL_ADVANCED_STRATEGIES,
  getStrategyById,
  recommendStrategy,
  generateStrategyPrompt,
  type AdvancedStrategy,
  type StrategyTracking,
} from './advanced-strategies';

export type DisputeStatus = 
  | 'draft'
  | 'sent'
  | 'under_review'
  | 'resolved'
  | 'rejected'
  | 'escalated';

export type DisputeOutcome = 
  | 'removed'
  | 'updated'
  | 'verified'
  | 'pending';

export type Bureau = 'experian' | 'equifax' | 'transunion';

export interface Dispute {
  id: string;
  userId: string;
  bureau: Bureau;
  itemType: string;
  itemDescription: string;
  reason: string;
  status: DisputeStatus;
  outcome?: DisputeOutcome;
  createdAt: Date;
  sentAt?: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  estimatedResolutionDate?: Date;
  letterContent: string;
  evidence?: string[];
  notes?: string;
  timeline: DisputeTimelineEvent[];
  // New fields for templates and strategies
  templateId?: string;
  strategyId?: string;
  strategyPhase?: string;
  escalationLevel?: number;
}

export interface DisputeTimelineEvent {
  id: string;
  date: Date;
  status: DisputeStatus;
  description: string;
  automated: boolean;
}

export interface DisputeStats {
  total: number;
  active: number;
  resolved: number;
  successRate: number;
  averageResolutionDays: number;
}

/**
 * Dispute Service Class
 */
class DisputeService {
  private disputes: Map<string, Dispute> = new Map();
  
  /**
   * Create a new dispute
   */
  createDispute(
    userId: string,
    bureau: Bureau,
    itemType: string,
    itemDescription: string,
    reason: string,
    letterContent: string,
    evidence?: string[]
  ): Dispute {
    const now = new Date();
    const disputeId = `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dispute: Dispute = {
      id: disputeId,
      userId,
      bureau,
      itemType,
      itemDescription,
      reason,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      letterContent,
      evidence,
      timeline: [{
        id: `event_${Date.now()}`,
        date: now,
        status: 'draft',
        description: 'Dispute created',
        automated: true,
      }],
    };
    
    this.disputes.set(disputeId, dispute);
    return dispute;
  }
  
  /**
   * Get dispute by ID
   */
  getDispute(disputeId: string): Dispute | undefined {
    return this.disputes.get(disputeId);
  }
  
  /**
   * Get user disputes
   */
  getUserDisputes(userId: string, status?: DisputeStatus): Dispute[] {
    const userDisputes = Array.from(this.disputes.values())
      .filter(d => d.userId === userId);
    
    if (status) {
      return userDisputes.filter(d => d.status === status);
    }
    
    return userDisputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Send dispute to bureau
   */
  sendDispute(disputeId: string): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;
    
    const now = new Date();
    dispute.status = 'sent';
    dispute.sentAt = now;
    dispute.updatedAt = now;
    
    // Estimate resolution date (30 days from sent date)
    const estimatedDate = new Date(now);
    estimatedDate.setDate(estimatedDate.getDate() + 30);
    dispute.estimatedResolutionDate = estimatedDate;
    
    // Add timeline event
    dispute.timeline.push({
      id: `event_${Date.now()}`,
      date: now,
      status: 'sent',
      description: `Dispute sent to ${dispute.bureau.charAt(0).toUpperCase() + dispute.bureau.slice(1)}`,
      automated: true,
    });
    
    return dispute;
  }
  
  /**
   * Update dispute status
   */
  updateDisputeStatus(
    disputeId: string,
    status: DisputeStatus,
    description?: string
  ): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;
    
    const now = new Date();
    dispute.status = status;
    dispute.updatedAt = now;
    
    if (status === 'resolved') {
      dispute.resolvedAt = now;
    }
    
    // Add timeline event
    dispute.timeline.push({
      id: `event_${Date.now()}`,
      date: now,
      status,
      description: description || `Status updated to ${status}`,
      automated: false,
    });
    
    return dispute;
  }
  
  /**
   * Resolve dispute with outcome
   */
  resolveDispute(
    disputeId: string,
    outcome: DisputeOutcome,
    notes?: string
  ): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;
    
    const now = new Date();
    dispute.status = 'resolved';
    dispute.outcome = outcome;
    dispute.resolvedAt = now;
    dispute.updatedAt = now;
    
    if (notes) {
      dispute.notes = notes;
    }
    
    // Add timeline event
    const outcomeText = {
      removed: 'Item removed from credit report',
      updated: 'Item updated with corrected information',
      verified: 'Bureau verified item as accurate',
      pending: 'Resolution pending',
    };
    
    dispute.timeline.push({
      id: `event_${Date.now()}`,
      date: now,
      status: 'resolved',
      description: outcomeText[outcome],
      automated: true,
    });
    
    return dispute;
  }
  
  /**
   * Add note to dispute
   */
  addNote(disputeId: string, note: string): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;
    
    dispute.notes = dispute.notes ? `${dispute.notes}\n\n${note}` : note;
    dispute.updatedAt = new Date();
    
    return dispute;
  }
  
  /**
   * Add evidence to dispute
   */
  addEvidence(disputeId: string, evidenceUrl: string): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;
    
    if (!dispute.evidence) {
      dispute.evidence = [];
    }
    
    dispute.evidence.push(evidenceUrl);
    dispute.updatedAt = new Date();
    
    return dispute;
  }
  
  /**
   * Get dispute statistics
   */
  getUserDisputeStats(userId: string): DisputeStats {
    const userDisputes = this.getUserDisputes(userId);
    const resolved = userDisputes.filter(d => d.status === 'resolved');
    const successful = resolved.filter(d => 
      d.outcome === 'removed' || d.outcome === 'updated'
    );
    
    // Calculate average resolution time
    const resolutionTimes = resolved
      .filter(d => d.sentAt && d.resolvedAt)
      .map(d => {
        const sent = d.sentAt!.getTime();
        const resolved = d.resolvedAt!.getTime();
        return (resolved - sent) / (1000 * 60 * 60 * 24); // Days
      });
    
    const averageResolutionDays = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;
    
    return {
      total: userDisputes.length,
      active: userDisputes.filter(d => 
        d.status === 'sent' || d.status === 'under_review'
      ).length,
      resolved: resolved.length,
      successRate: resolved.length > 0 
        ? (successful.length / resolved.length) * 100 
        : 0,
      averageResolutionDays: Math.round(averageResolutionDays),
    };
  }
  
  /**
   * Predict resolution timeline
   */
  predictResolutionTimeline(disputeId: string): {
    estimatedDays: number;
    confidence: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      return {
        estimatedDays: 30,
        confidence: 'low',
        factors: ['Dispute not found'],
      };
    }
    
    // Base estimate: 30 days (FCRA requirement)
    let estimatedDays = 30;
    const factors: string[] = [];
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    
    // Adjust based on bureau
    if (dispute.bureau === 'experian') {
      estimatedDays -= 3;
      factors.push('Experian typically responds faster');
    } else if (dispute.bureau === 'transunion') {
      estimatedDays += 2;
      factors.push('TransUnion may take slightly longer');
    }
    
    // Adjust based on item type
    if (dispute.itemType === 'late_payment') {
      estimatedDays += 5;
      factors.push('Late payment disputes require more verification');
    } else if (dispute.itemType === 'identity_theft') {
      estimatedDays += 10;
      factors.push('Identity theft cases require extensive investigation');
    }
    
    // Adjust based on evidence
    if (dispute.evidence && dispute.evidence.length > 0) {
      estimatedDays -= 5;
      confidence = 'high';
      factors.push('Strong evidence provided');
    }
    
    return {
      estimatedDays: Math.max(15, Math.min(45, estimatedDays)),
      confidence,
      factors,
    };
  }
  
  /**
   * Get disputes by bureau
   */
  getDisputesByBureau(userId: string, bureau: Bureau): Dispute[] {
    return this.getUserDisputes(userId).filter(d => d.bureau === bureau);
  }
  
  /**
   * Get recent activity
   */
  getRecentActivity(userId: string, limit: number = 10): DisputeTimelineEvent[] {
    const userDisputes = this.getUserDisputes(userId);
    const allEvents: DisputeTimelineEvent[] = [];
    
    userDisputes.forEach(dispute => {
      allEvents.push(...dispute.timeline);
    });
    
    return allEvents
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }
  
  /**
   * Delete dispute
   */
  deleteDispute(disputeId: string): boolean {
    return this.disputes.delete(disputeId);
  }

  // ============================================================================
  // TEMPLATE INTEGRATION
  // ============================================================================

  /**
   * Get all available dispute templates
   */
  getAvailableTemplates(): DisputeTemplate[] {
    return ALL_DISPUTE_TEMPLATES;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): DisputeTemplate | undefined {
    return getTemplateById(templateId);
  }

  /**
   * Get recommended templates based on success rate
   */
  getRecommendedTemplates(minSuccessRate: number = 60): DisputeTemplate[] {
    return getTemplatesBySuccessRate(minSuccessRate);
  }

  /**
   * Create dispute from template
   */
  createDisputeFromTemplate(
    userId: string,
    bureau: Bureau,
    templateId: string,
    placeholderValues: Record<string, string>,
    evidence?: string[]
  ): Dispute | null {
    const template = getTemplateById(templateId);
    if (!template) return null;

    // Replace placeholders in template
    let letterContent = template.template;
    for (const [key, value] of Object.entries(placeholderValues)) {
      letterContent = letterContent.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
    }

    const dispute = this.createDispute(
      userId,
      bureau,
      template.scenario,
      template.description,
      template.name,
      letterContent,
      evidence
    );

    // Add template reference
    dispute.templateId = templateId;

    return dispute;
  }

  // ============================================================================
  // STRATEGY INTEGRATION
  // ============================================================================

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): AdvancedStrategy[] {
    return ALL_ADVANCED_STRATEGIES;
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): AdvancedStrategy | undefined {
    return getStrategyById(strategyId);
  }

  /**
   * Get recommended strategies for a dispute scenario
   */
  getRecommendedStrategies(scenario: {
    disputeType: string;
    previousAttempts: number;
    hasEvidence: boolean;
    accountAge: number;
    isCollection: boolean;
    hasRelationship: boolean;
  }): AdvancedStrategy[] {
    return recommendStrategy(scenario);
  }

  /**
   * Apply strategy to dispute
   */
  applyStrategy(disputeId: string, strategyId: string): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    const strategy = getStrategyById(strategyId);

    if (!dispute || !strategy) return null;

    dispute.strategyId = strategyId;
    dispute.strategyPhase = 'initial';
    dispute.escalationLevel = 1;
    dispute.updatedAt = new Date();

    // Add timeline event
    dispute.timeline.push({
      id: `event_${Date.now()}`,
      date: new Date(),
      status: dispute.status,
      description: `Applied strategy: ${strategy.name}`,
      automated: true,
    });

    return dispute;
  }

  /**
   * Escalate dispute to next strategy phase
   */
  escalateDispute(disputeId: string): Dispute | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || !dispute.strategyId) return null;

    const strategy = getStrategyById(dispute.strategyId);
    if (!strategy) return null;

    const currentLevel = dispute.escalationLevel || 1;
    const maxLevel = strategy.steps.length;

    if (currentLevel >= maxLevel) {
      // Already at max escalation
      return dispute;
    }

    dispute.escalationLevel = currentLevel + 1;
    dispute.status = 'escalated';
    dispute.updatedAt = new Date();

    const nextStep = strategy.steps[currentLevel]; // 0-indexed, so currentLevel is next step

    // Add timeline event
    dispute.timeline.push({
      id: `event_${Date.now()}`,
      date: new Date(),
      status: 'escalated',
      description: `Escalated to step ${currentLevel + 1}: ${nextStep.title}`,
      automated: false,
    });

    return dispute;
  }

  /**
   * Generate AI prompt for strategy-based letter
   */
  generateStrategyLetter(
    disputeId: string,
    variables: Record<string, string>
  ): string | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || !dispute.strategyId) return null;

    try {
      return generateStrategyPrompt(dispute.strategyId, variables);
    } catch {
      return null;
    }
  }

  /**
   * Get strategy tracking data for analytics
   */
  getStrategyAnalytics(userId: string): {
    strategiesUsed: Map<string, number>;
    successByStrategy: Map<string, number>;
    avgResolutionByStrategy: Map<string, number>;
  } {
    const userDisputes = this.getUserDisputes(userId);
    const strategiesUsed = new Map<string, number>();
    const successByStrategy = new Map<string, number>();
    const resolutionDays = new Map<string, number[]>();

    for (const dispute of userDisputes) {
      if (!dispute.strategyId) continue;

      // Count usage
      strategiesUsed.set(
        dispute.strategyId,
        (strategiesUsed.get(dispute.strategyId) || 0) + 1
      );

      // Track success
      if (dispute.outcome === 'removed' || dispute.outcome === 'updated') {
        successByStrategy.set(
          dispute.strategyId,
          (successByStrategy.get(dispute.strategyId) || 0) + 1
        );
      }

      // Track resolution time
      if (dispute.resolvedAt && dispute.sentAt) {
        const days = Math.ceil(
          (dispute.resolvedAt.getTime() - dispute.sentAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const existing = resolutionDays.get(dispute.strategyId) || [];
        existing.push(days);
        resolutionDays.set(dispute.strategyId, existing);
      }
    }

    // Calculate averages
    const avgResolutionByStrategy = new Map<string, number>();
    const resolutionEntries = Array.from(resolutionDays.entries());
    for (const [strategyId, days] of resolutionEntries) {
      const avg = days.reduce((a, b) => a + b, 0) / days.length;
      avgResolutionByStrategy.set(strategyId, Math.round(avg));
    }

    return {
      strategiesUsed,
      successByStrategy,
      avgResolutionByStrategy,
    };
  }
}

// Export singleton instance
export const disputeService = new DisputeService();
export default disputeService;

// Re-export types and functions from templates and strategies
export {
  ALL_DISPUTE_TEMPLATES,
  getTemplateById,
  getTemplatesBySuccessRate,
  type DisputeTemplate,
} from '../prompts/dispute-templates';

export {
  ALL_ADVANCED_STRATEGIES,
  getStrategyById,
  recommendStrategy,
  generateStrategyPrompt,
  type AdvancedStrategy,
  type StrategyTracking,
} from './advanced-strategies';

