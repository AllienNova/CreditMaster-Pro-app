// Student Loan Types

export interface FederalProgramApplication {
  userId: string;
  programType: 'fresh-start' | 'rehabilitation' | 'consolidation';
  loanIds: string[];
  personalInfo: {
    firstName: string;
    lastName: string;
    ssn: string;
    dateOfBirth: string;
    email: string;
    phone: string;
  };
  financialInfo?: {
    annualIncome: number;
    householdSize: number;
    employmentStatus: string;
  };
  additionalData?: Record<string, any>;
}

export interface ApplicationStatus {
  applicationId: string;
  status: 'pending' | 'in-progress' | 'approved' | 'denied' | 'completed';
  submittedDate: string;
  lastUpdated: string;
  details: string;
  nextSteps?: string[];
}

export interface StudentLoan {
  id: string;
  servicer: string;
  loanType: 'federal' | 'private';
  balance: number;
  interestRate: number;
  status: 'current' | 'delinquent' | 'default' | 'forbearance' | 'deferment';
  monthlyPayment: number;
  originationDate: string;
  disbursementAmount: number;
}

export interface NSLDSData {
  userId: string;
  loans: StudentLoan[];
  grants: {
    id: string;
    type: string;
    amount: number;
    disbursementDate: string;
  }[];
  retrievedDate: string;
}

export interface DisputeItem {
  id: string;
  loanId: string;
  disputeType: 'inaccurate-balance' | 'incorrect-status' | 'unauthorized-inquiry' | 'other';
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  submittedDate: string;
  resolvedDate?: string;
  outcome?: string;
}

export interface CreditImpactAnalysis {
  currentScore: number;
  projectedScore: number;
  potentialIncrease: number;
  timeframe: string;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
}

