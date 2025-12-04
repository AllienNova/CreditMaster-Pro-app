import { MLPredictionModels } from '../ml-prediction-models';
import type { StudentLoan } from '@/types/student-loan';

const createLoan = (): StudentLoan => ({
  id: 'loan-10',
  loan_id: 'loan-10',
  servicer: 'navient',
  servicer_name: 'Navient',
  account_number: '000111222',
  loanType: 'federal',
  loan_type: 'Federal Direct Subsidized',
  balance: 18000,
  current_balance: 18000,
  original_amount: 20000,
  interestRate: 0.055,
  interest_rate: 0.055,
  status: 'default',
  loan_status: 'default',
  monthlyPayment: 210,
  originationDate: '2018-08-01',
  disbursement_date: new Date('2018-08-01'),
  disbursementAmount: 20000,
  default_date: new Date('2023-02-15'),
  payment_history: [
    {
      payment_date: '2022-11-01',
      payment_amount: 210,
      principal_amount: 140,
      interest_amount: 70,
    },
  ],
  servicer_transfer_history: [],
  credit_report_discrepancies: [],
  dispute_history: [],
  collection_activities: [],
  servicer_communications: [],
  error_flags: ['incorrect_status'],
  fresh_start_eligible: true,
  rehabilitation_eligible: true,
  discharge_eligible: false,
  borrower_defense_eligible: false,
  user_id: 'user-42',
  created_at: new Date('2018-08-01'),
  updated_at: new Date('2024-10-01'),
  last_payment_date: new Date('2022-11-01'),
  original_balance: 20000,
});

describe('MLPredictionModels runtime shape guarantees', () => {
  let ml: MLPredictionModels;

  beforeEach(() => {
    ml = new MLPredictionModels();
  });

  it('serializes dispute predictions with json-safe feature payloads', async () => {
    const loan = createLoan();
    const servicerProfile = {
      error_rate: 0.2,
      vulnerability_score: 0.85,
      compliance_score: 0.6,
      response_quality_score: 0.5,
    };
    const borrowerProfile = {
      credit_score: 610,
      annual_income: 72000,
      dispute_count: 2,
      cooperation_score: 0.9,
    };
    const errorDetails = [{ error_type: 'payment', severity: 0.8 }];

    const prediction = await ml.predictDisputeSuccess(
      loan,
      servicerProfile,
      borrowerProfile,
      errorDetails
    );

    expect(prediction.input_features.loan_balance).toBe(loan.current_balance);
    expect(prediction.expected_outcomes).toEqual(
      expect.objectContaining({
        credit_report_corrections: expect.any(Number),
        payment_history_improvements: expect.any(Number),
      })
    );
    expect(() => JSON.stringify(prediction)).not.toThrow();
  });

  it('defaults credit improvement timeline breakdown to an object', async () => {
    const loan = createLoan();

    const prediction = await ml.predictCreditScoreImprovement(loan, 590, ['fresh_start']);

    expect(prediction.expected_outcomes.timeline_breakdown).toEqual({});
    expect(prediction.success_probability).toBeGreaterThan(0);
    expect(Number.isNaN(prediction.predicted_timeline)).toBe(false);
  });

  it('falls back to the general federal program classifier when a specific model is unavailable', async () => {
    const loan = createLoan();
    const borrowerProfile = {
      credit_score: 610,
      annual_income: 72000,
      dispute_count: 2,
      cooperation_score: 0.9,
    };

    // Use IDR program type which should return 0.85 probability
    const prediction = await ml.predictFederalProgramSuccess(loan, 'idr', borrowerProfile);

    expect(prediction.prediction_type).toBe('federal_program_success');
    expect(prediction.success_probability).toBeCloseTo(0.85);
    expect(prediction.input_features.program_type_encoded).toBeDefined();
  });
});