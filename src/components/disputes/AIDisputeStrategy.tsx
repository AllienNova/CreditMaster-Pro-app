'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

interface DisputeOpportunity {
  id: string;
  itemType: string;
  itemDescription: string;
  bureau: 'experian' | 'equifax' | 'transunion' | 'all';
  successProbability: number; // 0-100
  estimatedImpact: number; // credit score points
  recommendedStrategy: string;
  strategyDescription: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  successRate: number;
  bestFor: string[];
  steps: string[];
  legalBasis: string;
}

interface EvidenceAssessment {
  itemId: string;
  itemDescription: string;
  evidenceStrength: 'strong' | 'moderate' | 'weak';
  strengthScore: number; // 0-100
  missingEvidence: string[];
  recommendations: string[];
}

interface TimelinePrediction {
  disputeType: string;
  estimatedDays: number;
  confidence: number;
  milestones: Array<{
    day: number;
    event: string;
  }>;
}

interface AIDisputeData {
  opportunities: DisputeOpportunity[];
  templates: StrategyTemplate[];
  evidenceAssessments: EvidenceAssessment[];
  timelinePredictions: TimelinePrediction[];
  overallSuccessScore: number; // 0-100
  recommendedNextSteps: string[];
}

export default function AIDisputeStrategy() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AIDisputeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchStrategy = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/disputes/ai-strategy');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dispute strategy');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching dispute strategy:', error);
      toast.error('Failed to load AI strategy', 'Please try again later');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      void fetchStrategy();
    }
  }, [user, fetchStrategy]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEvidenceColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'weak': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/20 rounded w-full"></div>
          <div className="h-4 bg-white/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">⚖️</div>
          <div>
            <h3 className="text-xl font-bold">AI Dispute Intelligence</h3>
            <p className="text-sm opacity-90">Strategy recommendations and success predictions</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Success Score & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Overall Success Score */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Success Probability</span>
                <span className="text-2xl font-bold">{data.overallSuccessScore}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${data.overallSuccessScore}%` }}
                ></div>
              </div>
              <p className="text-xs opacity-75 mt-2">
                {data.overallSuccessScore >= 70 ? 'High success rate' : data.overallSuccessScore >= 50 ? 'Moderate success rate' : 'Challenging cases'}
              </p>
            </div>

            {/* Opportunities Count */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Dispute Opportunities</span>
                <span className="text-2xl font-bold">{data.opportunities.length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-2">
                <span className="opacity-75">High Priority:</span>
                <span className="font-semibold">
                  {data.opportunities.filter(o => o.priority === 'high').length}
                </span>
              </div>
              <p className="text-xs opacity-75 mt-1">
                Potential impact: +{data.opportunities.reduce((sum, o) => sum + o.estimatedImpact, 0)} points
              </p>
            </div>
          </div>

          {/* Dispute Opportunities */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🎯</span>
              <span>Top Dispute Opportunities</span>
            </h4>
            <div className="space-y-2">
              {data.opportunities.slice(0, 3).map((opp) => (
                <div key={opp.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{opp.itemType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(opp.priority)}`}>
                          {opp.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(opp.difficulty)}`}>
                          {opp.difficulty}
                        </span>
                      </div>
                      <p className="text-xs opacity-75 mb-2">{opp.itemDescription}</p>
                      <p className="text-xs bg-white/10 rounded px-2 py-1">
                        💡 Strategy: {opp.recommendedStrategy}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-bold text-green-300">{opp.successProbability}%</div>
                      <div className="text-xs opacity-75">success</div>
                      <div className="text-sm font-bold text-yellow-300 mt-1">+{opp.estimatedImpact}</div>
                      <div className="text-xs opacity-75">points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-2">
                    <span className="opacity-75">⏱️ {opp.timeline}</span>
                    <span className="opacity-75">• Bureau: {opp.bureau}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Templates */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>📋</span>
              <span>Recommended Strategy Templates</span>
            </h4>
            <div className="space-y-2">
              {data.templates.slice(0, 3).map((template) => (
                <div key={template.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{template.name}</div>
                      <p className="text-xs opacity-75 mb-2">{template.description}</p>
                      <div className="text-xs bg-white/10 rounded px-2 py-1 mb-2">
                        ⚖️ Legal Basis: {template.legalBasis}
                      </div>
                      <div className="text-xs opacity-75">
                        Best for: {template.bestFor.join(', ')}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-lg font-bold text-green-300">{template.successRate}%</div>
                      <div className="text-xs opacity-75">success rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Assessment */}
          {data.evidenceAssessments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>📄</span>
                <span>Evidence Strength Assessment</span>
              </h4>
              <div className="space-y-2">
                {data.evidenceAssessments.slice(0, 3).map((assessment, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{assessment.itemDescription}</span>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${getEvidenceColor(assessment.evidenceStrength)}`}>
                            {assessment.evidenceStrength}
                          </span>
                        </div>
                        {assessment.missingEvidence.length > 0 && (
                          <div className="text-xs opacity-75 mb-2">
                            Missing: {assessment.missingEvidence.join(', ')}
                          </div>
                        )}
                        <p className="text-xs bg-white/10 rounded px-2 py-1">
                          💡 {assessment.recommendations[0]}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-lg font-bold">{assessment.strengthScore}/100</div>
                        <div className="text-xs opacity-75">strength</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Predictions */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>⏰</span>
              <span>Resolution Timeline Predictions</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.timelinePredictions.slice(0, 2).map((prediction, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{prediction.disputeType}</span>
                    <span className="text-lg font-bold">{prediction.estimatedDays} days</span>
                  </div>
                  <div className="text-xs opacity-75 mb-2">
                    {prediction.confidence}% confidence
                  </div>
                  <div className="space-y-1">
                    {prediction.milestones.slice(0, 2).map((milestone, mIdx) => (
                      <div key={mIdx} className="text-xs opacity-75">
                        Day {milestone.day}: {milestone.event}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3">🚀 Recommended Next Steps</h4>
            <ul className="space-y-2">
              {data.recommendedNextSteps.slice(0, 4).map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="opacity-75">{idx + 1}.</span>
                  <span className="opacity-90">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

