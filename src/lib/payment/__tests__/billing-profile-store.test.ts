import { billingProfileStore } from "../billing-profile-store";

describe("billingProfileStore", () => {
  it("initializes a profile and updates plan", async () => {
    const profile = await billingProfileStore.getProfile("test-user");
    expect(profile.customerId).toBe("cus_test-user");
    expect(profile.currentPlanId).toBeDefined();

    const updated = await billingProfileStore.updatePlan("test-user", "pro");
    expect(updated.currentPlanId).toBe("pro");
    expect(updated.invoices.length).toBeGreaterThan(1);
  });

  it("marks subscription for cancellation", async () => {
    await billingProfileStore.getProfile("cancel-user");
    const canceled =
      await billingProfileStore.cancelSubscription("cancel-user");
    expect(canceled.cancelAtPeriodEnd).toBe(true);
  });
});
