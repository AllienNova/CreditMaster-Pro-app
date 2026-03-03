/**
 * HouseholdService — Unit Tests
 *
 * Tests household CRUD, invitation lifecycle, member management,
 * privacy controls, shared budgets, joint goals, and financial summaries.
 */

import { householdService } from "../household-service";

// ---------------------------------------------------------------------------
// Unique user/household helpers
// ---------------------------------------------------------------------------

let counter = 0;
function uid(): string {
  return `hh-test-user-${++counter}-${Date.now()}`;
}

function createTestHousehold(ownerId?: string) {
  const owner = ownerId ?? uid();
  const hh = householdService.createHousehold(
    owner,
    "Test Family",
    "Owner User",
    "owner@test.com",
  );
  return { household: hh, ownerId: owner };
}

// =========================================================================
// Tests
// =========================================================================

describe("HouseholdService", () => {
  // -----------------------------------------------------------------------
  // Household CRUD
  // -----------------------------------------------------------------------

  describe("createHousehold", () => {
    it("should create a household with owner as first member", () => {
      const { household, ownerId } = createTestHousehold();

      expect(household.id).toMatch(/^hh_/);
      expect(household.name).toBe("Test Family");
      expect(household.ownerId).toBe(ownerId);
      expect(household.members).toHaveLength(1);
      expect(household.members[0].role).toBe("owner");
      expect(household.members[0].userId).toBe(ownerId);
    });

    it("should use default settings when none provided", () => {
      const { household } = createTestHousehold();

      expect(household.settings.defaultVisibility).toBe("household");
      expect(household.settings.largePurchaseThreshold).toBe(500);
      expect(household.settings.sharedCurrency).toBe("USD");
      expect(household.settings.requireApprovalForLargePurchases).toBe(false);
    });

    it("should merge custom settings with defaults", () => {
      const ownerId = uid();
      const hh = householdService.createHousehold(
        ownerId,
        "Custom HH",
        "Owner",
        "owner@test.com",
        { largePurchaseThreshold: 1000, sharedCurrency: "EUR" },
      );

      expect(hh.settings.largePurchaseThreshold).toBe(1000);
      expect(hh.settings.sharedCurrency).toBe("EUR");
      expect(hh.settings.defaultVisibility).toBe("household");
    });

    it("should set default privacy settings for owner", () => {
      const { household } = createTestHousehold();
      const privacy = household.members[0].privacySettings;

      expect(privacy.shareSpending).toBe(true);
      expect(privacy.shareIncome).toBe(false);
      expect(privacy.shareSavings).toBe(false);
    });
  });

  describe("getHousehold", () => {
    it("should retrieve a household by ID", () => {
      const { household } = createTestHousehold();
      const fetched = householdService.getHousehold(household.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(household.id);
    });

    it("should return null for unknown ID", () => {
      expect(householdService.getHousehold("nonexistent")).toBeNull();
    });
  });

  describe("getHouseholdsByUser", () => {
    it("should find all households a user belongs to", () => {
      const userId = uid();
      createTestHousehold(userId);
      createTestHousehold(userId);

      const households = householdService.getHouseholdsByUser(userId);
      expect(households).toHaveLength(2);
    });

    it("should return empty array for user with no households", () => {
      expect(householdService.getHouseholdsByUser("nobody")).toEqual([]);
    });
  });

  describe("updateHouseholdSettings", () => {
    it("should allow owner to update settings", () => {
      const { household, ownerId } = createTestHousehold();
      const updated = householdService.updateHouseholdSettings(
        household.id,
        ownerId,
        { largePurchaseThreshold: 2000 },
      );

      expect(updated).not.toBeNull();
      expect(updated!.settings.largePurchaseThreshold).toBe(2000);
    });

    it("should allow admin to update settings", () => {
      const { household, ownerId } = createTestHousehold();
      const adminId = uid();

      // Add an admin member via invitation
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "admin@test.com",
        "admin",
      );
      householdService.acceptInvitation(inv!.id, adminId, "Admin User");

      const updated = householdService.updateHouseholdSettings(
        household.id,
        adminId,
        { sharedCurrency: "GBP" },
      );

      expect(updated).not.toBeNull();
      expect(updated!.settings.sharedCurrency).toBe("GBP");
    });

    it("should reject settings update from member role", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();

      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "member@test.com",
        "member",
      );
      householdService.acceptInvitation(inv!.id, memberId, "Member");

      expect(
        householdService.updateHouseholdSettings(household.id, memberId, {
          sharedCurrency: "JPY",
        }),
      ).toBeNull();
    });

    it("should return null for unknown household", () => {
      expect(
        householdService.updateHouseholdSettings("unknown", "user", {}),
      ).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Invitations
  // -----------------------------------------------------------------------

  describe("invitations", () => {
    it("should create an invitation", () => {
      const { household, ownerId } = createTestHousehold();
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "invitee@test.com",
      );

      expect(inv).not.toBeNull();
      expect(inv!.id).toMatch(/^inv_/);
      expect(inv!.status).toBe("pending");
      expect(inv!.inviteeEmail).toBe("invitee@test.com");
      expect(inv!.role).toBe("member"); // default role
    });

    it("should reject invitation from viewer", () => {
      const { household, ownerId } = createTestHousehold();
      const viewerId = uid();

      const vInv = householdService.inviteMember(
        household.id,
        ownerId,
        "viewer@test.com",
        "viewer",
      );
      householdService.acceptInvitation(vInv!.id, viewerId, "Viewer");

      const result = householdService.inviteMember(
        household.id,
        viewerId,
        "another@test.com",
      );
      expect(result).toBeNull();
    });

    it("should reject duplicate email invitation", () => {
      const { household, ownerId } = createTestHousehold();

      expect(
        householdService.inviteMember(
          household.id,
          ownerId,
          "owner@test.com", // same as owner's email
        ),
      ).toBeNull();
    });

    it("should return null for unknown household", () => {
      expect(
        householdService.inviteMember("unknown", "user", "email@test.com"),
      ).toBeNull();
    });

    it("should accept an invitation and add member", () => {
      const { household, ownerId } = createTestHousehold();
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "new@test.com",
      );
      const newUserId = uid();
      const updated = householdService.acceptInvitation(
        inv!.id,
        newUserId,
        "New Member",
      );

      expect(updated).not.toBeNull();
      expect(updated!.members).toHaveLength(2);
      expect(updated!.members[1].userId).toBe(newUserId);
      expect(updated!.members[1].displayName).toBe("New Member");
    });

    it("should reject accepting already-accepted invitation", () => {
      const { household, ownerId } = createTestHousehold();
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "first@test.com",
      );
      householdService.acceptInvitation(inv!.id, uid(), "First");

      // Try to accept again
      expect(
        householdService.acceptInvitation(inv!.id, uid(), "Second"),
      ).toBeNull();
    });

    it("should decline an invitation", () => {
      const { household, ownerId } = createTestHousehold();
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "decline@test.com",
      );

      expect(householdService.declineInvitation(inv!.id)).toBe(true);

      // Can't accept after declining
      expect(
        householdService.acceptInvitation(inv!.id, uid(), "Late"),
      ).toBeNull();
    });

    it("should reject declining non-pending invitation", () => {
      expect(householdService.declineInvitation("nonexistent")).toBe(false);
    });

    it("should list invitations for a household", () => {
      const { household, ownerId } = createTestHousehold();
      householdService.inviteMember(household.id, ownerId, "a@test.com");
      householdService.inviteMember(household.id, ownerId, "b@test.com");

      const invitations = householdService.getInvitations(household.id);
      expect(invitations).toHaveLength(2);
    });

    it("should set expiry date 7 days in the future", () => {
      const { household, ownerId } = createTestHousehold();
      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "expiry@test.com",
      );

      const diffDays = (inv!.expiresAt.getTime() - inv!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7);
    });
  });

  // -----------------------------------------------------------------------
  // Member Management
  // -----------------------------------------------------------------------

  describe("removeMember", () => {
    it("should allow owner to remove a member", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();

      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "remove@test.com",
      );
      householdService.acceptInvitation(inv!.id, memberId, "Remove Me");

      expect(
        householdService.removeMember(household.id, ownerId, memberId),
      ).toBe(true);

      const hh = householdService.getHousehold(household.id);
      expect(hh!.members).toHaveLength(1);
    });

    it("should not allow removing the owner", () => {
      const { household, ownerId } = createTestHousehold();
      expect(
        householdService.removeMember(household.id, ownerId, ownerId),
      ).toBe(false);
    });

    it("should not allow member role to remove others", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();
      const targetId = uid();

      const inv1 = householdService.inviteMember(
        household.id,
        ownerId,
        "member@test.com",
        "member",
      );
      householdService.acceptInvitation(inv1!.id, memberId, "Member");

      const inv2 = householdService.inviteMember(
        household.id,
        ownerId,
        "target@test.com",
        "member",
      );
      householdService.acceptInvitation(inv2!.id, targetId, "Target");

      expect(
        householdService.removeMember(household.id, memberId, targetId),
      ).toBe(false);
    });

    it("should return false for unknown household", () => {
      expect(householdService.removeMember("unknown", "a", "b")).toBe(false);
    });
  });

  describe("updateMemberPrivacy", () => {
    it("should update privacy settings for a member", () => {
      const { household, ownerId } = createTestHousehold();
      const member = householdService.updateMemberPrivacy(
        household.id,
        ownerId,
        { shareIncome: true, shareSavings: true },
      );

      expect(member).not.toBeNull();
      expect(member!.privacySettings.shareIncome).toBe(true);
      expect(member!.privacySettings.shareSavings).toBe(true);
      expect(member!.privacySettings.shareSpending).toBe(true); // preserved
    });

    it("should return null for unknown household or user", () => {
      expect(
        householdService.updateMemberPrivacy("unknown", "user", {}),
      ).toBeNull();
    });
  });

  describe("updateMemberRole", () => {
    it("should allow owner to change member role", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();

      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "role@test.com",
      );
      householdService.acceptInvitation(inv!.id, memberId, "Member");

      expect(
        householdService.updateMemberRole(
          household.id,
          ownerId,
          memberId,
          "admin",
        ),
      ).toBe(true);

      const hh = householdService.getHousehold(household.id);
      const member = hh!.members.find((m) => m.userId === memberId);
      expect(member!.role).toBe("admin");
    });

    it("should not allow non-owner to change roles", () => {
      const { household, ownerId } = createTestHousehold();
      const adminId = uid();
      const memberId = uid();

      const inv1 = householdService.inviteMember(
        household.id,
        ownerId,
        "admin@test.com",
        "admin",
      );
      householdService.acceptInvitation(inv1!.id, adminId, "Admin");

      const inv2 = householdService.inviteMember(
        household.id,
        ownerId,
        "member@test.com",
      );
      householdService.acceptInvitation(inv2!.id, memberId, "Member");

      expect(
        householdService.updateMemberRole(
          household.id,
          adminId,
          memberId,
          "admin",
        ),
      ).toBe(false);
    });

    it("should not allow changing owner's own role", () => {
      const { household, ownerId } = createTestHousehold();
      expect(
        householdService.updateMemberRole(
          household.id,
          ownerId,
          ownerId,
          "admin",
        ),
      ).toBe(false);
    });

    it("should return false for unknown target member", () => {
      const { household, ownerId } = createTestHousehold();
      expect(
        householdService.updateMemberRole(
          household.id,
          ownerId,
          "nonexistent",
          "admin",
        ),
      ).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Shared Budgets
  // -----------------------------------------------------------------------

  describe("shared budgets", () => {
    it("should create a shared budget", () => {
      const { household } = createTestHousehold();
      const budget = householdService.createSharedBudget(
        household.id,
        "Groceries",
        "food",
        1000,
      );

      expect(budget).not.toBeNull();
      expect(budget!.id).toMatch(/^sb_/);
      expect(budget!.name).toBe("Groceries");
      expect(budget!.monthlyLimit).toBe(1000);
      expect(budget!.spent).toBe(0);
      expect(budget!.remaining).toBe(1000);
      expect(budget!.period).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should return null for unknown household", () => {
      expect(
        householdService.createSharedBudget("unknown", "Test", "cat", 100),
      ).toBeNull();
    });

    it("should add expenses and track contributions", () => {
      const { household } = createTestHousehold();
      const budget = householdService.createSharedBudget(
        household.id,
        "Groceries",
        "food",
        1000,
      );

      const updated = householdService.addBudgetExpense(
        household.id,
        budget!.id,
        "user-1",
        "Alice",
        200,
      );

      expect(updated!.spent).toBe(200);
      expect(updated!.remaining).toBe(800);
      expect(updated!.contributions).toHaveLength(1);
      expect(updated!.contributions[0].amount).toBe(200);
      expect(updated!.contributions[0].percentage).toBe(100);
    });

    it("should aggregate contributions from same member", () => {
      const { household } = createTestHousehold();
      const budget = householdService.createSharedBudget(
        household.id,
        "Groceries",
        "food",
        1000,
      );

      householdService.addBudgetExpense(household.id, budget!.id, "user-1", "Alice", 200);
      const updated = householdService.addBudgetExpense(
        household.id,
        budget!.id,
        "user-1",
        "Alice",
        100,
      );

      expect(updated!.contributions).toHaveLength(1);
      expect(updated!.contributions[0].amount).toBe(300);
    });

    it("should calculate percentages across multiple members", () => {
      const { household } = createTestHousehold();
      const budget = householdService.createSharedBudget(
        household.id,
        "Dining",
        "dining",
        500,
      );

      householdService.addBudgetExpense(household.id, budget!.id, "u1", "Alice", 300);
      const updated = householdService.addBudgetExpense(
        household.id,
        budget!.id,
        "u2",
        "Bob",
        200,
      );

      expect(updated!.contributions).toHaveLength(2);
      const alice = updated!.contributions.find((c) => c.memberName === "Alice");
      const bob = updated!.contributions.find((c) => c.memberName === "Bob");
      expect(alice!.percentage).toBe(60);
      expect(bob!.percentage).toBe(40);
    });

    it("should clamp remaining at zero when overspent", () => {
      const { household } = createTestHousehold();
      const budget = householdService.createSharedBudget(
        household.id,
        "Small",
        "misc",
        100,
      );

      const updated = householdService.addBudgetExpense(
        household.id,
        budget!.id,
        "u1",
        "Alice",
        200,
      );

      expect(updated!.spent).toBe(200);
      expect(updated!.remaining).toBe(0);
    });

    it("should return null for unknown budget ID", () => {
      const { household } = createTestHousehold();
      expect(
        householdService.addBudgetExpense(household.id, "unknown", "u", "n", 10),
      ).toBeNull();
    });

    it("should list shared budgets", () => {
      const { household } = createTestHousehold();
      householdService.createSharedBudget(household.id, "A", "cat1", 100);
      householdService.createSharedBudget(household.id, "B", "cat2", 200);

      const budgets = householdService.getSharedBudgets(household.id);
      expect(budgets).toHaveLength(2);
    });

    it("should return empty for household with no budgets", () => {
      expect(householdService.getSharedBudgets("nobudgets")).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Joint Goals
  // -----------------------------------------------------------------------

  describe("joint goals", () => {
    it("should create a joint goal", () => {
      const { household } = createTestHousehold();
      const goal = householdService.createJointGoal(
        household.id,
        "Vacation Fund",
        "Family vacation to Hawaii",
        10000,
      );

      expect(goal).not.toBeNull();
      expect(goal!.id).toMatch(/^jg_/);
      expect(goal!.targetAmount).toBe(10000);
      expect(goal!.currentAmount).toBe(0);
      expect(goal!.status).toBe("active");
    });

    it("should return null for unknown household", () => {
      expect(
        householdService.createJointGoal("unknown", "Test", "Desc", 100),
      ).toBeNull();
    });

    it("should accept contributions", () => {
      const { household } = createTestHousehold();
      const goal = householdService.createJointGoal(
        household.id,
        "Fund",
        "Desc",
        5000,
      );

      const updated = householdService.contributeToGoal(
        household.id,
        goal!.id,
        "user-1",
        "Alice",
        1000,
        "Initial deposit",
      );

      expect(updated!.currentAmount).toBe(1000);
      expect(updated!.contributions).toHaveLength(1);
      expect(updated!.contributions[0].note).toBe("Initial deposit");
    });

    it("should auto-complete when target is reached", () => {
      const { household } = createTestHousehold();
      const goal = householdService.createJointGoal(
        household.id,
        "Small Goal",
        "Desc",
        500,
      );

      householdService.contributeToGoal(household.id, goal!.id, "u1", "Alice", 300);
      const updated = householdService.contributeToGoal(
        household.id,
        goal!.id,
        "u2",
        "Bob",
        200,
      );

      expect(updated!.status).toBe("completed");
      expect(updated!.currentAmount).toBe(500);
    });

    it("should reject contribution to non-active goal", () => {
      const { household } = createTestHousehold();
      const goal = householdService.createJointGoal(
        household.id,
        "Paused",
        "Desc",
        1000,
      );
      householdService.updateGoalStatus(household.id, goal!.id, "paused");

      const result = householdService.contributeToGoal(
        household.id,
        goal!.id,
        "u1",
        "Alice",
        100,
      );
      expect(result).toBeNull();
    });

    it("should update goal status", () => {
      const { household } = createTestHousehold();
      const goal = householdService.createJointGoal(
        household.id,
        "Cancel Me",
        "Desc",
        1000,
      );

      expect(
        householdService.updateGoalStatus(household.id, goal!.id, "cancelled"),
      ).toBe(true);

      const goals = householdService.getJointGoals(household.id);
      expect(goals[0].status).toBe("cancelled");
    });

    it("should return false for unknown goal", () => {
      const { household } = createTestHousehold();
      expect(
        householdService.updateGoalStatus(household.id, "unknown", "paused"),
      ).toBe(false);
    });

    it("should list joint goals", () => {
      const { household } = createTestHousehold();
      householdService.createJointGoal(household.id, "A", "Desc", 100);
      householdService.createJointGoal(household.id, "B", "Desc", 200);

      expect(householdService.getJointGoals(household.id)).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Financial Summary
  // -----------------------------------------------------------------------

  describe("household summary", () => {
    it("should return null for unknown household", () => {
      expect(householdService.getHouseholdSummary("unknown", "user")).toBeNull();
    });

    it("should show requester's own data regardless of privacy", () => {
      const { household, ownerId } = createTestHousehold();
      householdService.setMemberFinancials(ownerId, {
        income: 5000,
        spending: 2000,
        savings: 1000,
      });

      const summary = householdService.getHouseholdSummary(
        household.id,
        ownerId,
      );

      expect(summary).not.toBeNull();
      const ownerSummary = summary!.memberSummaries.find(
        (m) => m.memberId === ownerId,
      );
      expect(ownerSummary!.income).toBe(5000);
      expect(ownerSummary!.spending).toBe(2000);
      expect(ownerSummary!.savings).toBe(1000);
    });

    it("should respect privacy settings for other members", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();

      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "priv@test.com",
      );
      householdService.acceptInvitation(inv!.id, memberId, "Private");

      // Default privacy: only spending is shared
      householdService.setMemberFinancials(memberId, {
        income: 8000,
        spending: 3000,
        savings: 2000,
      });

      const summary = householdService.getHouseholdSummary(
        household.id,
        ownerId,
      );

      const memberSummary = summary!.memberSummaries.find(
        (m) => m.memberId === memberId,
      );

      expect(memberSummary!.income).toBeUndefined(); // income not shared
      expect(memberSummary!.spending).toBe(3000); // spending shared
      expect(memberSummary!.savings).toBeUndefined(); // savings not shared
    });

    it("should aggregate totals only from visible data", () => {
      const { household, ownerId } = createTestHousehold();
      const memberId = uid();

      const inv = householdService.inviteMember(
        household.id,
        ownerId,
        "visible@test.com",
      );
      householdService.acceptInvitation(inv!.id, memberId, "Visible");

      householdService.setMemberFinancials(ownerId, {
        income: 5000,
        spending: 2000,
        savings: 1000,
      });
      householdService.setMemberFinancials(memberId, {
        income: 8000,
        spending: 3000,
        savings: 2000,
      });

      // Owner views summary (member's default: only spending shared)
      const summary = householdService.getHouseholdSummary(
        household.id,
        ownerId,
      );

      // totalIncome includes owner's 5000 + member's 0 (income not shared) = 5000
      expect(summary!.totalIncome).toBe(5000);
      // totalSpending includes both (spending is shared) = 5000
      expect(summary!.totalSpending).toBe(5000);
      // totalSavings includes owner's 1000 + member's 0 = 1000
      expect(summary!.totalSavings).toBe(1000);
    });

    it("should include shared budgets and joint goals", () => {
      const { household } = createTestHousehold();
      householdService.createSharedBudget(household.id, "Budget", "cat", 500);
      householdService.createJointGoal(household.id, "Goal", "Desc", 1000);

      const summary = householdService.getHouseholdSummary(
        household.id,
        "anyone",
      );

      // Summary should include budgets and goals even if member not found
      // (requester just won't have financials)
      expect(summary!.sharedBudgets).toHaveLength(1);
      expect(summary!.jointGoals).toHaveLength(1);
    });
  });
});
