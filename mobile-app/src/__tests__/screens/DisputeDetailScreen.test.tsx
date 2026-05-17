/**
 * TDD test for dispute/[id].tsx de-mocking (TASK-MOK-05, FND-068)
 *
 * Verifies that:
 * 1. The source file imports useDisputeStore (not local state + setTimeout)
 * 2. fetchDisputeById is called on mount with the route id
 * 3. The component reads currentDispute / isLoading from the store
 */

import fs from "fs";
import path from "path";

const SCREEN_PATH = path.resolve(
  __dirname,
  "../../../app/dispute/[id].tsx",
);

describe("dispute/[id].tsx — de-mocked (TASK-MOK-05)", () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, "utf-8");
  });

  it("imports useDisputeStore (not local state-only pattern)", () => {
    expect(source).toMatch(/useDisputeStore/);
  });

  it("does NOT contain setTimeout for data loading", () => {
    // The mock used setTimeout to fake the fetch; real implementation must not
    expect(source).not.toMatch(/setTimeout\s*\(/);
  });

  it("does NOT hardcode mock bureau experian in local state", () => {
    // The old mock set bureau: "experian" in a setTimeout callback
    // After de-mocking there should be no such hardcoded object
    expect(source).not.toMatch(/bureau:\s*["']experian["']/);
  });

  it("calls fetchDisputeById in a useEffect", () => {
    expect(source).toMatch(/fetchDisputeById/);
    expect(source).toMatch(/useEffect/);
  });

  it("reads currentDispute from the store (not local useState)", () => {
    // Old mock used useState<Dispute | null>(null) + setDispute inside setTimeout
    // New implementation reads currentDispute from useDisputeStore
    expect(source).toMatch(/currentDispute/);
    // Must NOT set dispute via setDispute (that was the mock pattern)
    expect(source).not.toMatch(/setDispute\s*\(/);
  });

  it("uses isLoading from store (not local setLoading)", () => {
    // Old mock used const [loading, setLoading] = useState(true) + setLoading(false) in setTimeout
    // New implementation reads isLoading from useDisputeStore
    expect(source).toMatch(/isLoading/);
    expect(source).not.toMatch(/setLoading\s*\(/);
  });

  it("uses camelCase field names (itemType, disputeReason, creditorName)", () => {
    // Old mock used snake_case (item_type, dispute_reason) from the local Dispute type
    // Real Dispute type from src/services/api/types uses camelCase
    expect(source).toMatch(/itemType|creditorName|disputeReason/);
    // Must NOT use the old snake_case fields from the mock object
    expect(source).not.toMatch(/item_type\b/);
    expect(source).not.toMatch(/dispute_reason\b/);
    expect(source).not.toMatch(/item_description\b/);
  });

  it("has testID on the loading indicator for testability", () => {
    expect(source).toMatch(/testID\s*=\s*["']loading-indicator["']/);
  });
});
