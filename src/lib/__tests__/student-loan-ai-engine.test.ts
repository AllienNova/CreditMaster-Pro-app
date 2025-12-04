import { StudentLoanAIEngine } from '../student-loan-ai-engine';
import { servicerIntelligenceEngine } from '../servicer-intelligence-engine';
import type {
  StudentLoan,
  ServicerAnalysisResult,
  ErrorPattern,
  ComplianceViolation,
  ExploitationOpportunity,
} from '@/types/student-loan';

jest.mock('../servicer-intelligence-engine', () => {
  const analyzeServicer = jest.fn();
  return {
    __esModule: true,
    servicerIntelligenceEngine: {
      analyzeServicer,
    },
    default: {
      analyzeServicer,
    },
  };
});

const analyzeServicerMock =
  servicerIntelligenceEngine.analyzeServicer as jest.MockedFunction<
    typeof servicerIntelligenceEngine.analyzeServicer
  >;

const baseLoan: StudentLoan = {
  id: 'loan-001',
  loan_id: 'loan-001',
  servicer: 'navient',
  servicer_name: 'Navient',
  account_number: '123456789',
  loanType: 'federal',
  loan_type: 'Federal Direct Subsidized',
  balance: 12000,
  current_balance: 12000,
  original_amount: 15000,
  interestRate: 0.0525,
  interest_rate: 0.0525,
  status: 'default',
  loan_status: 'default',
  monthlyPayment: 180,
  originationDate: '2016-08-01',
  disbursement_date: new Date('2016-08-01'),
  disbursementAmount: 15000,
  default_date: new Date('2023-01-01'),
  payment_history: [
    {
      payment_date: '2022-12-01',
      payment_amount: 180,
      principal_amount: 120,
      interest_amount: 60,
    },
  ],
  servicer_transfer_history: [
    {
      transfer_date: '2022-01-01',
      from_servicer: 'Granite',
      to_servicer: 'Navient',
      proper_notification: true,
      payment_processing_gap_days: 0,
    },
  ],
  credit_report_discrepancies: [],
  dispute_history: [],
  collection_activities: [],
  servicer_communications: [],
  error_flags: ['payment_misallocation'],
  fresh_start_eligible: true,
  rehabilitation_eligible: true,
  discharge_eligible: false,
  borrower_defense_eligible: false,
  user_id: 'user-123',
  created_at: new Date('2016-08-01'),
  updated_at: new Date('2024-10-01'),
  last_payment_date: new Date('2022-12-01'),
  original_balance: 15000,
};

const borrowerProfile = {
  credit_score: 640,
  annual_income: 78000,
  employment_status: 'employed',
  dispute_count: 1,
  cooperation_score: 0.85,
};

const servicerAnalysis: ServicerAnalysisResult = {
  servicer_name: 'Navient',
  vulnerability_score: 0.92,
  error_patterns: [
    {
      pattern_type: 'payment_misallocation',
      description: 'Misapplied borrower payments',
      frequency: 3,
      severity: 'high',
      legal_basis: 'FCRA',
      detection_method: 'audit',
      evidence: ['ledger mismatch'],
      exploitation_potential: 0.85,
    } satisfies ErrorPattern,
  ],
  compliance_violations: [
    {
      violation_id: 'cv-001',
      servicer_id: 'navient',
      violation_type: 'FCRA',
      regulation: '623(a)',
      severity: 'major',
      status: 'open',
      evidence: ['report snapshot'],
    } satisfies ComplianceViolation,
  ],
  exploitation_opportunities: [
    {
      opportunity_id: 'opp-001',
      servicer_id: 'navient',
      type: 'Regulatory complaint',
      description: 'Escalate through CFPB for faster relief',
      legal_basis: ['FCRA 623(a)'],
      success_probability: 0.8,
      potential_impact: 'Expedited correction',
      required_evidence: ['Compile statements'],
      recommended_approach: 'File CFPB complaint',
      timeline_estimate: 30,
    } satisfies ExploitationOpportunity,
  ],
  recommended_strategies: ['fresh_start'],
  confidence_level: 0.94,
};

type MonitoringPlan = {
  checkpoints: Array<{ target_date: string }>;
  next_review: string;
};

type StrategyOrchestrationShape = {
  primary_strategy: { strategy_name: string };
  monitoring_checkpoints: Array<{ target_date: string }>;
};

describe('StudentLoanAIEngine runtime safeguards', () => {
  let aiEngine: StudentLoanAIEngine;

  beforeEach(() => {
    aiEngine = new StudentLoanAIEngine();
    analyzeServicerMock.mockResolvedValue(servicerAnalysis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('produces monitoring plans with ISO timestamps tied to servicer context', async () => {
    const [recommendation] = await aiEngine.generateAIStrategyRecommendations(
      [baseLoan],
      borrowerProfile
    );

    const monitoringPlan = recommendation.monitoring_plan as MonitoringPlan;
    expect(monitoringPlan.checkpoints.length).toBeGreaterThan(0);
    monitoringPlan.checkpoints.forEach((checkpoint) => {
      expect(typeof checkpoint.target_date).toBe('string');
      expect(Number.isNaN(Date.parse(checkpoint.target_date))).toBe(false);
    });
    expect(Number.isNaN(Date.parse(monitoringPlan.next_review))).toBe(false);

    const decisionMatrix = recommendation.decision_matrix as {
      servicer_profile: { servicer_name: string };
    };
    expect(decisionMatrix.servicer_profile.servicer_name).toBe('Navient');
    expect(analyzeServicerMock).toHaveBeenCalledWith('Navient', [baseLoan]);
  });

  it('aligns automation workflows with orchestration metadata when automation is preferred', async () => {
    const [recommendation] = await aiEngine.generateAIStrategyRecommendations(
      [baseLoan],
      borrowerProfile
    );

    const workflow = await aiEngine.createAutomationWorkflow(
      recommendation,
      [baseLoan],
      { preferAutomation: true }
    );

    const orchestration = recommendation.strategy_orchestration as StrategyOrchestrationShape;
    expect(workflow.workflow_name).toBe(orchestration.primary_strategy.strategy_name);
    expect(workflow.trigger_conditions).toEqual(['Documentation ready']);
    expect(workflow.parameters).toMatchObject({
      loan_ids: [baseLoan.loan_id],
      automation_level: recommendation.automation_level,
    });
  });

  it('emits JSON-serializable orchestration artifacts with normalized checkpoint dates', async () => {
    const [recommendation] = await aiEngine.generateAIStrategyRecommendations(
      [baseLoan],
      borrowerProfile
    );

    const orchestration = recommendation.strategy_orchestration as StrategyOrchestrationShape;
    orchestration.monitoring_checkpoints.forEach((checkpoint) => {
      expect(typeof checkpoint.target_date).toBe('string');
      expect(Number.isNaN(Date.parse(checkpoint.target_date))).toBe(false);
    });

    expect(() => JSON.stringify(recommendation.strategy_orchestration)).not.toThrow();
  });
});
