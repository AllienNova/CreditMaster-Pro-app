/**
 * Broker Account Creator Tests
 *
 * Tests for account creation, multi-broker parallel creation,
 * account status transitions, suspension/reactivation, and error handling.
 */

import { BrokerAccountCreator } from "../broker-account-creator";
import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// TESTS
// ============================================================================

describe("BrokerAccountCreator", () => {
  let creator: BrokerAccountCreator;

  beforeEach(() => {
    creator = new BrokerAccountCreator();
  });

  // ==========================================================================
  // SINGLE ACCOUNT CREATION
  // ==========================================================================

  describe("createAccount", () => {
    it("should create an individual account on Alpaca with pending status", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.broker).toBe("alpaca");
      expect(result.account?.accountType).toBe("individual");
      expect(result.account?.status).toBe("pending");
      expect(result.account?.id).toMatch(/^ACCT-/);
      expect(result.account?.externalAccountId).toMatch(/^ALP-/);
      expect(result.account?.capabilities).toContain("stocks");
      expect(result.account?.createdAt).toBeInstanceOf(Date);
    });

    it("should create a paper account with instant active status", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "paper",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      expect(result.success).toBe(true);
      expect(result.account?.status).toBe("active");
      expect(result.account?.activatedAt).toBeInstanceOf(Date);
      expect(result.account?.capabilities).toContain("paper_trading");
    });

    it("should reject unsupported account types for a broker", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "drivewealth",
        accountType: "joint",
        kycProfileId: "kyc-001",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported by broker");
      expect(result.retryable).toBe(false);
    });

    it("should reject duplicate account creation for the same broker", async () => {
      await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      const duplicate = await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toContain("already exists");
      expect(duplicate.retryable).toBe(false);
    });

    it("should reject missing kycProfileId", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("kycProfileId is required");
    });

    it("should create IRA accounts on supported brokers", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "interactive_brokers",
        accountType: "ira_roth",
        kycProfileId: "kyc-001",
      });
      expect(result.success).toBe(true);
      expect(result.account?.accountType).toBe("ira_roth");
    });

    it("should reject IRA accounts on unsupported brokers", async () => {
      const result = await creator.createAccount({
        userId: "user-001",
        broker: "paper",
        accountType: "ira_traditional",
        kycProfileId: "kyc-001",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("should assign broker-specific capabilities", async () => {
      const ibResult = await creator.createAccount({
        userId: "user-001",
        broker: "interactive_brokers",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      expect(ibResult.account?.capabilities).toContain("options");
      expect(ibResult.account?.capabilities).toContain("futures");
      expect(ibResult.account?.capabilities).toContain("forex");
    });
  });

  // ==========================================================================
  // MULTI-BROKER CREATION
  // ==========================================================================

  describe("createMultiBrokerAccounts", () => {
    it("should create accounts on multiple brokers in parallel", async () => {
      const brokers: SupportedBroker[] = ["alpaca", "drivewealth", "paper"];
      const results = await creator.createMultiBrokerAccounts(
        "user-001",
        brokers,
        "individual",
        "kyc-001",
      );
      expect(results).toHaveLength(3);
      for (const entry of results) {
        expect(entry.result.success).toBe(true);
      }
    });

    it("should handle partial failures gracefully", async () => {
      // DriveWealth doesn't support joint accounts
      const brokers: SupportedBroker[] = ["alpaca", "drivewealth"];
      const results = await creator.createMultiBrokerAccounts(
        "user-001",
        brokers,
        "joint" as "individual", // DriveWealth will fail
        "kyc-001",
      );
      expect(results).toHaveLength(2);

      const alpacaResult = results.find((r) => r.broker === "alpaca");
      // Alpaca doesn't support joint either — so both fail
      expect(alpacaResult?.result.success).toBe(false);

      const dwResult = results.find((r) => r.broker === "drivewealth");
      expect(dwResult?.result.success).toBe(false);
    });

    it("should throw if no brokers are specified", async () => {
      await expect(
        creator.createMultiBrokerAccounts(
          "user-001",
          [],
          "individual",
          "kyc-001",
        ),
      ).rejects.toThrow("At least one broker must be specified");
    });

    it("should create both paper (active) and real (pending) accounts", async () => {
      const results = await creator.createMultiBrokerAccounts(
        "user-001",
        ["paper", "alpaca"],
        "individual",
        "kyc-001",
      );
      const paperResult = results.find((r) => r.broker === "paper");
      expect(paperResult?.result.account?.status).toBe("active");

      const alpacaResult = results.find((r) => r.broker === "alpaca");
      expect(alpacaResult?.result.account?.status).toBe("pending");
    });
  });

  // ==========================================================================
  // ACCOUNT RETRIEVAL
  // ==========================================================================

  describe("getAccount / getAllAccounts / getAccountStatus", () => {
    beforeEach(async () => {
      await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      await creator.createAccount({
        userId: "user-001",
        broker: "paper",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
    });

    it("should retrieve a specific account", () => {
      const account = creator.getAccount("user-001", "alpaca");
      expect(account).not.toBeNull();
      expect(account?.broker).toBe("alpaca");
    });

    it("should return null for non-existent account", () => {
      const account = creator.getAccount("user-001", "schwab");
      expect(account).toBeNull();
    });

    it("should retrieve all accounts for a user", () => {
      const accounts = creator.getAllAccounts("user-001");
      expect(accounts).toHaveLength(2);
      const brokers = accounts.map((a) => a.broker);
      expect(brokers).toContain("alpaca");
      expect(brokers).toContain("paper");
    });

    it("should return empty array for unknown user", () => {
      const accounts = creator.getAllAccounts("unknown");
      expect(accounts).toHaveLength(0);
    });

    it("should return account status", () => {
      expect(creator.getAccountStatus("user-001", "alpaca")).toBe("pending");
      expect(creator.getAccountStatus("user-001", "paper")).toBe("active");
    });

    it("should return null status for non-existent account", () => {
      expect(creator.getAccountStatus("user-001", "schwab")).toBeNull();
    });

    it("should return copies (not references)", () => {
      const a1 = creator.getAccount("user-001", "alpaca");
      const a2 = creator.getAccount("user-001", "alpaca");
      expect(a1).not.toBe(a2);
      expect(a1).toEqual(a2);
    });
  });

  // ==========================================================================
  // SUSPENSION & REACTIVATION
  // ==========================================================================

  describe("suspendAccount / reactivateAccount", () => {
    beforeEach(async () => {
      // Create an active paper account
      await creator.createAccount({
        userId: "user-001",
        broker: "paper",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
    });

    it("should suspend an active account", () => {
      const suspended = creator.suspendAccount(
        "user-001",
        "paper",
        "Suspicious activity",
      );
      expect(suspended.status).toBe("suspended");
      expect(suspended.suspendReason).toBe("Suspicious activity");
      expect(suspended.suspendedAt).toBeInstanceOf(Date);
    });

    it("should throw when suspending non-existent account", () => {
      expect(() =>
        creator.suspendAccount("user-001", "schwab", "test"),
      ).toThrow("No account found");
    });

    it("should throw when suspending a non-active account", async () => {
      // Alpaca accounts start as pending, not active
      await creator.createAccount({
        userId: "user-002",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-002",
      });
      expect(() =>
        creator.suspendAccount("user-002", "alpaca", "test"),
      ).toThrow("Only active accounts can be suspended");
    });

    it("should throw when suspension reason is empty", () => {
      expect(() =>
        creator.suspendAccount("user-001", "paper", ""),
      ).toThrow("Suspension reason is required");
    });

    it("should reactivate a suspended account", () => {
      creator.suspendAccount("user-001", "paper", "Investigation");
      const reactivated = creator.reactivateAccount("user-001", "paper");
      expect(reactivated.status).toBe("active");
      expect(reactivated.suspendedAt).toBeUndefined();
      expect(reactivated.suspendReason).toBeUndefined();
    });

    it("should throw when reactivating non-existent account", () => {
      expect(() =>
        creator.reactivateAccount("user-001", "schwab"),
      ).toThrow("No account found");
    });

    it("should throw when reactivating a non-suspended account", () => {
      // Paper account is active, not suspended
      expect(() =>
        creator.reactivateAccount("user-001", "paper"),
      ).toThrow("Only suspended accounts can be reactivated");
    });

    it("should reflect suspension in getAccountStatus", () => {
      creator.suspendAccount("user-001", "paper", "Review needed");
      expect(creator.getAccountStatus("user-001", "paper")).toBe("suspended");
    });

    it("should allow re-suspension after reactivation", () => {
      creator.suspendAccount("user-001", "paper", "First");
      creator.reactivateAccount("user-001", "paper");
      const reSuspended = creator.suspendAccount(
        "user-001",
        "paper",
        "Second",
      );
      expect(reSuspended.status).toBe("suspended");
      expect(reSuspended.suspendReason).toBe("Second");
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("edge cases", () => {
    it("should generate unique account IDs", async () => {
      const r1 = await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      const r2 = await creator.createAccount({
        userId: "user-002",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-002",
      });
      expect(r1.account?.id).not.toBe(r2.account?.id);
      expect(r1.account?.externalAccountId).not.toBe(
        r2.account?.externalAccountId,
      );
    });

    it("should allow different users to have the same broker", async () => {
      const r1 = await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      const r2 = await creator.createAccount({
        userId: "user-002",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-002",
      });
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
    });

    it("should isolate accounts between users", async () => {
      await creator.createAccount({
        userId: "user-001",
        broker: "alpaca",
        accountType: "individual",
        kycProfileId: "kyc-001",
      });
      await creator.createAccount({
        userId: "user-002",
        broker: "paper",
        accountType: "individual",
        kycProfileId: "kyc-002",
      });

      const user1Accounts = creator.getAllAccounts("user-001");
      expect(user1Accounts).toHaveLength(1);
      expect(user1Accounts[0].broker).toBe("alpaca");

      const user2Accounts = creator.getAllAccounts("user-002");
      expect(user2Accounts).toHaveLength(1);
      expect(user2Accounts[0].broker).toBe("paper");
    });
  });
});
