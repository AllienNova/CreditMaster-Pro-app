import { ROLES, roleRank, isAtLeast, isRole } from "../roles";
describe("roles", () => {
  it("defines exactly the four canonical roles", () => {
    expect([...ROLES].sort()).toEqual(["admin", "premium", "super_admin", "user"]);
  });
  it("ranks user < premium < admin < super_admin", () => {
    expect(roleRank("user")).toBeLessThan(roleRank("premium"));
    expect(roleRank("premium")).toBeLessThan(roleRank("admin"));
    expect(roleRank("admin")).toBeLessThan(roleRank("super_admin"));
  });
  it("isAtLeast is true when actual meets or exceeds required", () => {
    expect(isAtLeast("admin", "premium")).toBe(true);
    expect(isAtLeast("user", "admin")).toBe(false);
  });
  it("isRole rejects non-canonical values", () => {
    expect(isRole("enterprise")).toBe(false);
    expect(isRole("unknown")).toBe(false);
    expect(isRole("user")).toBe(true);
    expect(isRole(null)).toBe(false);
  });
});
