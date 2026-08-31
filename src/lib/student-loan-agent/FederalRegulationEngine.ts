import regulationsData from './regulations.json';

interface RegulationEntry {
  name: string;
  description: string;
  key_provisions?: string[];
  eligibility?: string[];
  requirements?: string[];
  protections?: string[];
}

type RegulationKey =
  | 'fcra'
  | 'fresh_start_program'
  | 'loan_rehabilitation'
  | 'hea'
  | 'cfpb';

type RegulationDatabase = Record<RegulationKey, RegulationEntry>;

interface ComplianceResult {
  isCompliant: boolean;
  regulation?: string;
  message: string;
  violations: string[];
}

interface LoanScenario {
  loanType: 'federal' | 'private';
  status?: 'current' | 'default' | 'delinquent';
}

interface StrategyPlan {
  type: string;
  regulation?: RegulationKey;
  actions: string[];
}

interface StrategyValidationResult {
  isValid: boolean;
  message: string;
  violations: string[];
}

export class FederalRegulationEngine {
  private regulationDatabase: Partial<RegulationDatabase> = {};

  constructor() {
    this.loadRegulations();
  }

  private async loadRegulations(): Promise<void> {
    try {
      this.regulationDatabase = regulationsData as RegulationDatabase;
      console.log('Federal regulations loaded.');
    } catch (error) {
      console.error('Failed to load federal regulations:', error);
      this.regulationDatabase = {};
    }
  }

  public getRegulation(key: RegulationKey): RegulationEntry | undefined {
    return this.regulationDatabase[key];
  }

  public async checkForUpdates(): Promise<void> {
    console.log('Checking for regulation updates...');
    await this.loadRegulations();
  }

  public checkCompliance(regulationType: string): ComplianceResult {
    const regulationKey = regulationType.toLowerCase() as RegulationKey;
    const regulation = this.regulationDatabase[regulationKey];

    if (!regulation) {
      return {
        isCompliant: false,
        message: `Unknown regulation type: ${regulationType}`,
        violations: ['Unknown regulation'],
      };
    }

    return {
      isCompliant: true,
      regulation: regulation.name,
      message: `Compliance check passed for ${regulation.name}`,
      violations: [],
    };
  }

  public getApplicableRegulations(scenario: LoanScenario): RegulationEntry[] {
    const applicable: RegulationEntry[] = [];

    if (scenario.loanType === 'federal') {
      applicable.push(
        ...this.collectRegulations(['fcra', 'hea', 'cfpb'])
      );

      if (scenario.status === 'default') {
        applicable.push(
          ...this.collectRegulations(['fresh_start_program', 'loan_rehabilitation'])
        );
      }
    } else if (scenario.loanType === 'private') {
      applicable.push(...this.collectRegulations(['fcra', 'cfpb']));
    }

    return applicable;
  }

  public validateStrategy(strategy: StrategyPlan): StrategyValidationResult {
    if (!strategy.regulation) {
      return {
        isValid: false,
        message: 'Strategy must reference a regulation',
        violations: ['Missing regulation'],
      };
    }

    if (!this.regulationDatabase[strategy.regulation]) {
      return {
        isValid: false,
        message: `Invalid or unknown regulation: ${strategy.regulation}`,
        violations: ['Unknown regulation'],
      };
    }

    if (!strategy.actions || strategy.actions.length === 0) {
      return {
        isValid: false,
        message: 'Strategy must include actions',
        violations: ['No actions specified'],
      };
    }

    return {
      isValid: true,
      message: 'Strategy is compliant',
      violations: [],
    };
  }

  private collectRegulations(keys: RegulationKey[]): RegulationEntry[] {
    return keys
      .map((key) => this.regulationDatabase[key])
      .filter((regulation): regulation is RegulationEntry => Boolean(regulation));
  }
}
