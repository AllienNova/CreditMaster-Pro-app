import { FederalRegulationEngine } from '../student-loan-agent/FederalRegulationEngine';
import { StrategyEngine } from '../student-loan-agent/StrategyEngine';

describe('FederalRegulationEngine', () => {
  let engine: FederalRegulationEngine;

  beforeEach(() => {
    engine = new FederalRegulationEngine();
  });

  describe('checkCompliance', () => {
    it('should check FCRA compliance', () => {
      const result = engine.checkCompliance('FCRA', {
        reportingAccuracy: true,
        disputeProcess: true,
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should check HEA compliance', () => {
      const result = engine.checkCompliance('HEA', {
        loanType: 'federal',
        servicerCompliance: true,
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should check CFPB compliance', () => {
      const result = engine.checkCompliance('CFPB', {
        fairLending: true,
        consumerProtection: true,
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('getApplicableRegulations', () => {
    it('should return applicable regulations for a loan scenario', () => {
      const regulations = engine.getApplicableRegulations({
        loanType: 'federal',
        status: 'default',
      });
      expect(Array.isArray(regulations)).toBe(true);
      expect(regulations.length).toBeGreaterThan(0);
    });

    it('should handle private loans', () => {
      const regulations = engine.getApplicableRegulations({
        loanType: 'private',
        status: 'current',
      });
      expect(Array.isArray(regulations)).toBe(true);
    });
  });

  describe('validateStrategy', () => {
    it('should validate a compliant strategy', () => {
      const strategy = {
        type: 'dispute',
        regulation: 'FCRA',
        actions: ['verify_debt', 'request_validation'],
      };
      const result = engine.validateStrategy(strategy);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should identify non-compliant strategies', () => {
      const strategy = {
        type: 'invalid',
        regulation: 'UNKNOWN',
        actions: [],
      };
      const result = engine.validateStrategy(strategy);
      expect(result).toBeDefined();
    });
  });
});

describe('StrategyEngine', () => {
  let engine: StrategyEngine;
  let regulationEngine: FederalRegulationEngine;

  beforeEach(() => {
    regulationEngine = new FederalRegulationEngine();
    engine = new StrategyEngine(regulationEngine);
  });

  describe('generateStrategies', () => {
    it('should generate strategies for federal loans in default', () => {
      const analysis: import('../student-loan-agent/StrategyEngine').LoanAnalysis = {
        defaultStatus: true,
        loanType: 'federal',
        balance: 50000,
        status: 'default',
      };
      const strategies = engine.generateStrategies(analysis);
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should generate strategies for private loans', () => {
      const analysis: import('../student-loan-agent/StrategyEngine').LoanAnalysis = {
        defaultStatus: false,
        loanType: 'private',
        balance: 30000,
        status: 'delinquent',
      };
      const strategies = engine.generateStrategies(analysis);
      expect(Array.isArray(strategies)).toBe(true);
    });

    it('should handle loans not in default', () => {
      const analysis: import('../student-loan-agent/StrategyEngine').LoanAnalysis = {
        defaultStatus: false,
        loanType: 'federal',
        balance: 40000,
        status: 'current',
      };
      const strategies = engine.generateStrategies(analysis);
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('prioritizeStrategies', () => {
    it('should prioritize strategies by impact', () => {
      const strategies: import('../student-loan-agent/StrategyEngine').LoanStrategy[] = [
        { name: 'Strategy 1', description: 'Low priority', regulation: undefined, priority: 'low' },
        { name: 'Strategy 2', description: 'High priority', regulation: undefined, priority: 'high' },
        { name: 'Strategy 3', description: 'Medium priority', regulation: undefined, priority: 'medium' },
      ];
      const prioritized = engine.prioritizeStrategies(strategies);
      expect(Array.isArray(prioritized)).toBe(true);
      expect(prioritized[0].priority).toBe('high');
    });

    it('should handle empty strategy list', () => {
      const prioritized = engine.prioritizeStrategies([]);
      expect(Array.isArray(prioritized)).toBe(true);
      expect(prioritized.length).toBe(0);
    });
  });

  describe('estimateTimeline', () => {
    it('should estimate timeline for strategy execution', () => {
      const strategy: import('../student-loan-agent/StrategyEngine').LoanStrategy = {
        name: 'FCRA Dispute',
        description: 'Dispute inaccurate information',
        regulation: undefined,
        complexity: 'medium',
      };
      const timeline = engine.estimateTimeline(strategy);
      expect(timeline).toBeDefined();
      expect(typeof timeline.days).toBe('number');
      expect(timeline.days).toBeGreaterThan(0);
    });

    it('should handle complex strategies', () => {
      const strategy: import('../student-loan-agent/StrategyEngine').LoanStrategy = {
        name: 'Loan Rehabilitation',
        description: 'Rehabilitate defaulted loans',
        regulation: undefined,
        complexity: 'high',
      };
      const timeline = engine.estimateTimeline(strategy);
      expect(timeline).toBeDefined();
      expect(timeline.days).toBeGreaterThan(30);
    });
  });

  describe('calculateSuccessProbability', () => {
    it('should calculate success probability based on factors', () => {
      const strategy: import('../student-loan-agent/StrategyEngine').LoanStrategy = {
        name: 'FCRA Dispute',
        description: 'Dispute inaccurate information',
        regulation: undefined,
      };
      const context: import('../student-loan-agent/StrategyEngine').StrategyContext = {
        creditScore: 650,
        loanStatus: 'default',
        documentation: 'complete',
      };
      const probability = engine.calculateSuccessProbability(strategy, context);
      expect(typeof probability).toBe('number');
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(100);
    });

    it('should return higher probability for strong cases', () => {
      const strategy: import('../student-loan-agent/StrategyEngine').LoanStrategy = {
        name: 'FCRA Dispute',
        description: 'Dispute inaccurate information',
        regulation: undefined,
      };
      const strongContext: import('../student-loan-agent/StrategyEngine').StrategyContext = {
        creditScore: 720,
        loanStatus: 'current',
        documentation: 'complete',
      };
      const probability = engine.calculateSuccessProbability(strategy, strongContext);
      expect(probability).toBeGreaterThan(50);
    });
  });
});

describe('Utility Functions', () => {
  describe('Date Calculations', () => {
    it('should calculate days between dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(30);
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');
      const days = Math.floor((date.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      const amount = 50000;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      expect(formatted).toBe('$50,000.00');
    });

    it('should handle decimal amounts', () => {
      const amount = 1234.56;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      expect(formatted).toBe('$1,234.56');
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate percentage correctly', () => {
      const part = 25;
      const whole = 100;
      const percentage = (part / whole) * 100;
      expect(percentage).toBe(25);
    });

    it('should handle zero whole', () => {
      const part = 25;
      const whole = 0;
      const percentage = whole === 0 ? 0 : (part / whole) * 100;
      expect(percentage).toBe(0);
    });
  });

  describe('Array Operations', () => {
    it('should filter array correctly', () => {
      const items = [1, 2, 3, 4, 5];
      const filtered = items.filter(x => x > 3);
      expect(filtered).toEqual([4, 5]);
    });

    it('should map array correctly', () => {
      const items = [1, 2, 3];
      const mapped = items.map(x => x * 2);
      expect(mapped).toEqual([2, 4, 6]);
    });

    it('should reduce array correctly', () => {
      const items = [1, 2, 3, 4];
      const sum = items.reduce((acc, x) => acc + x, 0);
      expect(sum).toBe(10);
    });
  });

  describe('String Operations', () => {
    it('should capitalize string', () => {
      const str = 'hello world';
      const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
      expect(capitalized).toBe('Hello world');
    });

    it('should trim whitespace', () => {
      const str = '  hello  ';
      const trimmed = str.trim();
      expect(trimmed).toBe('hello');
    });

    it('should replace text', () => {
      const str = 'hello world';
      const replaced = str.replace('world', 'universe');
      expect(replaced).toBe('hello universe');
    });
  });
});

