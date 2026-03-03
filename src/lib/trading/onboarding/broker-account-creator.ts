/**
 * Broker Account Creator
 *
 * Creates brokerage accounts across multiple brokers once KYC is approved.
 * Supports individual, joint, and retirement account types.
 * Handles parallel multi-broker creation with graceful partial-failure handling.
 *
 * State is managed via in-memory Maps (production would persist to Supabase).
 */

import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// TYPES
// ============================================================================

export type AccountType =
  | "individual"
  | "joint"
  | "ira_traditional"
  | "ira_roth"
  | "custodial";

export type AccountStatus = "pending" | "active" | "suspended" | "closed";

export interface BrokerAccountRequest {
  userId: string;
  broker: SupportedBroker;
  accountType: AccountType;
  kycProfileId: string;
}

export interface BrokerAccount {
  id: string;
  userId: string;
  broker: SupportedBroker;
  externalAccountId: string;
  accountType: AccountType;
  status: AccountStatus;
  createdAt: Date;
  activatedAt?: Date;
  suspendedAt?: Date;
  suspendReason?: string;
  capabilities: string[];
}

export interface AccountCreationResult {
  success: boolean;
  account?: BrokerAccount;
  error?: string;
  retryable: boolean;
}

export interface MultiAccountCreationResult {
  broker: SupportedBroker;
  result: AccountCreationResult;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Account types supported by each broker */
const BROKER_ACCOUNT_TYPES: Readonly<Record<SupportedBroker, readonly AccountType[]>> = {
  alpaca: ["individual", "ira_traditional", "ira_roth"],
  interactive_brokers: [
    "individual",
    "joint",
    "ira_traditional",
    "ira_roth",
    "custodial",
  ],
  schwab: [
    "individual",
    "joint",
    "ira_traditional",
    "ira_roth",
    "custodial",
  ],
  drivewealth: ["individual"],
  paper: ["individual"],
};

/** Default capabilities granted per broker upon account creation */
const BROKER_DEFAULT_CAPABILITIES: Readonly<Record<SupportedBroker, readonly string[]>> = {
  alpaca: [
    "stocks",
    "etfs",
    "crypto",
    "fractional_shares",
    "extended_hours",
    "margin",
  ],
  interactive_brokers: [
    "stocks",
    "etfs",
    "options",
    "futures",
    "forex",
    "bonds",
    "margin",
  ],
  schwab: ["stocks", "etfs", "options", "mutual_funds", "bonds", "margin"],
  drivewealth: ["stocks", "etfs", "fractional_shares"],
  paper: [
    "stocks",
    "etfs",
    "crypto",
    "fractional_shares",
    "paper_trading",
  ],
};

/** Errors that can be retried */
const RETRYABLE_ERROR_PATTERNS = [
  "timeout",
  "rate_limit",
  "service_unavailable",
  "temporary",
  "connection",
] as const;

// ============================================================================
// BROKER ACCOUNT CREATOR
// ============================================================================

export class BrokerAccountCreator {
  /** `${userId}:${broker}` -> BrokerAccount */
  private readonly accounts: Map<string, BrokerAccount> = new Map();

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Create a brokerage account on a specific broker.
   * Validates the account type is supported by the broker.
   * Paper broker accounts are created and activated instantly.
   */
  async createAccount(
    request: BrokerAccountRequest,
  ): Promise<AccountCreationResult> {
    const key = `${request.userId}:${request.broker}`;

    // Check if account already exists
    const existing = this.accounts.get(key);
    if (existing && existing.status !== "closed") {
      return {
        success: false,
        error: `Account already exists for broker "${request.broker}" with status "${existing.status}"`,
        retryable: false,
      };
    }

    // Validate account type for broker
    const supportedTypes = BROKER_ACCOUNT_TYPES[request.broker];
    if (!supportedTypes.includes(request.accountType)) {
      return {
        success: false,
        error: `Account type "${request.accountType}" is not supported by broker "${request.broker}". Supported: ${supportedTypes.join(", ")}`,
        retryable: false,
      };
    }

    // Validate KYC profile ID
    if (!request.kycProfileId?.trim()) {
      return {
        success: false,
        error: "kycProfileId is required",
        retryable: false,
      };
    }

    try {
      const account = await this.createBrokerAccount(request);
      this.accounts.set(key, account);

      return {
        success: true,
        account: { ...account },
        retryable: false,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error during account creation";
      return {
        success: false,
        error: message,
        retryable: this.isRetryableError(message),
      };
    }
  }

  /**
   * Create accounts on multiple brokers in parallel.
   * Partial failures do not affect successful creations.
   */
  async createMultiBrokerAccounts(
    userId: string,
    brokers: SupportedBroker[],
    accountType: AccountType,
    kycProfileId: string,
  ): Promise<MultiAccountCreationResult[]> {
    if (brokers.length === 0) {
      throw new Error("At least one broker must be specified");
    }

    const results = await Promise.allSettled(
      brokers.map(async (broker) => {
        const result = await this.createAccount({
          userId,
          broker,
          accountType,
          kycProfileId,
        });
        return { broker, result };
      }),
    );

    return results.map((settled, index) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }

      const broker = brokers[index];
      return {
        broker,
        result: {
          success: false,
          error:
            settled.reason instanceof Error
              ? settled.reason.message
              : "Account creation failed unexpectedly",
          retryable: true,
        },
      };
    });
  }

  /**
   * Get an account for a specific user and broker.
   * Returns null if no account exists.
   */
  getAccount(
    userId: string,
    broker: SupportedBroker,
  ): BrokerAccount | null {
    const account = this.accounts.get(`${userId}:${broker}`);
    return account ? { ...account } : null;
  }

  /**
   * Get all brokerage accounts for a user across all brokers.
   */
  getAllAccounts(userId: string): BrokerAccount[] {
    const result: BrokerAccount[] = [];
    for (const [key, account] of this.accounts) {
      if (key.startsWith(`${userId}:`)) {
        result.push({ ...account });
      }
    }
    return result;
  }

  /**
   * Get the status of a specific account.
   * Returns null if no account exists.
   */
  getAccountStatus(
    userId: string,
    broker: SupportedBroker,
  ): AccountStatus | null {
    const account = this.accounts.get(`${userId}:${broker}`);
    return account?.status ?? null;
  }

  /**
   * Suspend a brokerage account with a reason.
   * Throws if the account does not exist or is not active.
   */
  suspendAccount(
    userId: string,
    broker: SupportedBroker,
    reason: string,
  ): BrokerAccount {
    const key = `${userId}:${broker}`;
    const account = this.accounts.get(key);

    if (!account) {
      throw new Error(
        `No account found for user "${userId}" on broker "${broker}"`,
      );
    }
    if (account.status !== "active") {
      throw new Error(
        `Cannot suspend account with status "${account.status}". Only active accounts can be suspended.`,
      );
    }
    if (!reason?.trim()) {
      throw new Error("Suspension reason is required");
    }

    account.status = "suspended";
    account.suspendedAt = new Date();
    account.suspendReason = reason;

    return { ...account };
  }

  /**
   * Reactivate a suspended brokerage account.
   * Throws if the account does not exist or is not suspended.
   */
  reactivateAccount(
    userId: string,
    broker: SupportedBroker,
  ): BrokerAccount {
    const key = `${userId}:${broker}`;
    const account = this.accounts.get(key);

    if (!account) {
      throw new Error(
        `No account found for user "${userId}" on broker "${broker}"`,
      );
    }
    if (account.status !== "suspended") {
      throw new Error(
        `Cannot reactivate account with status "${account.status}". Only suspended accounts can be reactivated.`,
      );
    }

    account.status = "active";
    account.suspendedAt = undefined;
    account.suspendReason = undefined;

    return { ...account };
  }

  // ==========================================================================
  // PRIVATE — ACCOUNT CREATION
  // ==========================================================================

  private async createBrokerAccount(
    request: BrokerAccountRequest,
  ): Promise<BrokerAccount> {
    const now = new Date();
    const capabilities = [
      ...(BROKER_DEFAULT_CAPABILITIES[request.broker] ?? []),
    ];

    // Paper broker: instant activation
    if (request.broker === "paper") {
      return {
        id: this.generateAccountId(),
        userId: request.userId,
        broker: request.broker,
        externalAccountId: this.generateExternalId(request.broker),
        accountType: request.accountType,
        status: "active",
        createdAt: now,
        activatedAt: now,
        capabilities,
      };
    }

    // Real brokers: pending until broker activates
    return {
      id: this.generateAccountId(),
      userId: request.userId,
      broker: request.broker,
      externalAccountId: this.generateExternalId(request.broker),
      accountType: request.accountType,
      status: "pending",
      createdAt: now,
      capabilities,
    };
  }

  // ==========================================================================
  // PRIVATE — HELPERS
  // ==========================================================================

  private generateAccountId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ACCT-${timestamp}-${random}`;
  }

  private generateExternalId(broker: SupportedBroker): string {
    const prefix = broker.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${random}`;
  }

  private isRetryableError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return RETRYABLE_ERROR_PATTERNS.some((pattern) =>
      lowerMessage.includes(pattern),
    );
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const brokerAccountCreator = new BrokerAccountCreator();
export default brokerAccountCreator;
