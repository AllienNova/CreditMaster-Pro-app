/**
 * Sprint 7 — Execution Quality & Error Handling Tests
 *
 * Coverage: FIX reject handler, circuit breaker, clock monitor,
 * dead-letter queue, quality tracker, order state machine.
 */

import { handleReject } from "../fix-error-handler";
import { BrokerCircuitBreaker } from "../broker-circuit-breaker";
import { ClockMonitor } from "../clock-monitor";
import { DeadLetterQueue } from "../dead-letter-queue";
import { QualityTracker } from "../quality-tracker";
import { OrderStateMachine } from "../order-state-machine";
import type { CircuitEvent } from "../broker-circuit-breaker";
import type { FillRecord } from "../quality-tracker";
import type { InvalidTransitionError, StateTransition } from "../order-state-machine";

// ============================================================================
// MOCK POLICY
// ============================================================================

const MOCK_POLICY = {
  meta: {
    schema_version: "1.0",
    file_version: "1.0",
    canonical_package_version: "1.0.0",
  },
  execution: {
    default_tif: { equity: "DAY" },
    slippage_threshold_bps: 10,
    broker_circuit_breaker: {
      consecutive_rejects: 5,
      window_seconds: 60,
      cooldown_seconds: 120,
      probe_after_seconds: 30,
      close_after_successes: 3,
    },
    clock_skew: {
      max_ms: 500,
      ntp_stratum_max: 2,
      measurement_interval_seconds: 10,
      consecutive_breach_limit: 3,
      resume_after_ok: 2,
    },
  },
  canonicalHash: "test-hash",
};

jest.mock("@/lib/trading/config", () => ({
  getPolicy: () => MOCK_POLICY,
}));

// ============================================================================
// FIX ERROR HANDLER
// ============================================================================

describe("FIX Error Handler", () => {
  it("maps code 0 (TooLateToCancel) to FAIL", () => {
    const action = handleReject(0, "ord-1");
    expect(action.kind).toBe("FAIL");
    expect(action.orderId).toBe("ord-1");
    expect(action.rejectCode).toBe(0);
    expect(action.retryDelayMs).toBeNull();
  });

  it("maps code 1 (UnknownSymbol) to DISABLE_SYMBOL", () => {
    const action = handleReject(1, "ord-2");
    expect(action.kind).toBe("DISABLE_SYMBOL");
    expect(action.reason).toBe("Unknown symbol");
  });

  it("maps code 2 (ExchangeClosed) to RETRY with delay", () => {
    const action = handleReject(2, "ord-3");
    expect(action.kind).toBe("RETRY");
    expect(action.retryDelayMs).toBe(5_000);
  });

  it("maps code 3 (OrderExceedsLimit) to ESCALATE", () => {
    const action = handleReject(3, "ord-4");
    expect(action.kind).toBe("ESCALATE");
  });

  it("maps code 5 (UnknownOrder) to FAIL", () => {
    const action = handleReject(5, "ord-5");
    expect(action.kind).toBe("FAIL");
  });

  it("maps code 6 (DuplicateOrder) to FAIL", () => {
    const action = handleReject(6, "ord-6");
    expect(action.kind).toBe("FAIL");
    expect(action.reason).toBe("Duplicate order");
  });

  it("maps code 99 (Other) to ESCALATE", () => {
    const action = handleReject(99, "ord-7");
    expect(action.kind).toBe("ESCALATE");
  });

  it("maps unknown code to ESCALATE", () => {
    const action = handleReject(999, "ord-8");
    expect(action.kind).toBe("ESCALATE");
    expect(action.reason).toBe("Unmapped FIX reject code");
  });

  it("attaches INC_BROKER_REJECT incident for non-DISABLE_SYMBOL actions", () => {
    const action = handleReject(0, "ord-9");
    expect(action.incident.code).toBe("INC_BROKER_REJECT");
  });

  it("attaches modified INC_BROKER_CIRCUIT_OPEN for DISABLE_SYMBOL actions", () => {
    const action = handleReject(1, "ord-10");
    expect(action.incident.code).toBe("INC_BROKER_CIRCUIT_OPEN");
  });
});

// ============================================================================
// BROKER CIRCUIT BREAKER
// ============================================================================

describe("BrokerCircuitBreaker", () => {
  let cb: BrokerCircuitBreaker;

  beforeEach(() => {
    cb = new BrokerCircuitBreaker();
  });

  it("starts in CLOSED state", () => {
    expect(cb.getState("broker-a")).toBe("CLOSED");
  });

  it("allows sending in CLOSED state", () => {
    expect(cb.canSend("broker-a")).toBe(true);
  });

  it("stays CLOSED under threshold failures", () => {
    const now = 1000000;
    for (let i = 0; i < 4; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    expect(cb.getState("broker-a")).toBe("CLOSED");
  });

  it("transitions CLOSED -> OPEN after 5 consecutive rejects in window", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    expect(cb.getState("broker-a")).toBe("OPEN");
  });

  it("emits INC_BROKER_CIRCUIT_OPEN on transition to OPEN", () => {
    const events: CircuitEvent[] = [];
    cb.onTransition((e) => events.push(e));
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    const openEvent = events.find((e) => e.newState === "OPEN");
    expect(openEvent).toBeDefined();
    expect(openEvent?.incident?.code).toBe("INC_BROKER_CIRCUIT_OPEN");
  });

  it("blocks sending in OPEN state", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    expect(cb.canSend("broker-a", now + 1000)).toBe(false);
  });

  it("transitions OPEN -> HALF_OPEN after probe_after_seconds", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    // 30 seconds later
    const probeTime = now + 31_000;
    expect(cb.canSend("broker-a", probeTime)).toBe(true);
    expect(cb.getState("broker-a")).toBe("HALF_OPEN");
  });

  it("transitions HALF_OPEN -> CLOSED after 3 consecutive successes", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    // Move to HALF_OPEN
    cb.canSend("broker-a", now + 31_000);
    expect(cb.getState("broker-a")).toBe("HALF_OPEN");

    // 3 successes
    cb.recordSuccess("broker-a");
    cb.recordSuccess("broker-a");
    cb.recordSuccess("broker-a");
    expect(cb.getState("broker-a")).toBe("CLOSED");
  });

  it("transitions HALF_OPEN -> OPEN on any reject", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    cb.canSend("broker-a", now + 31_000);
    expect(cb.getState("broker-a")).toBe("HALF_OPEN");

    cb.recordFailure("broker-a", now + 32_000);
    expect(cb.getState("broker-a")).toBe("OPEN");
  });

  it("does not trip if failures are outside the time window", () => {
    const baseTime = 1000000;
    // 3 failures at time 0
    for (let i = 0; i < 3; i++) {
      cb.recordFailure("broker-a", baseTime + i * 100);
    }
    // 2 more failures 90 seconds later (outside 60s window)
    for (let i = 0; i < 2; i++) {
      cb.recordFailure("broker-a", baseTime + 90_000 + i * 100);
    }
    expect(cb.getState("broker-a")).toBe("CLOSED");
  });

  it("reset() returns broker to CLOSED", () => {
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    expect(cb.getState("broker-a")).toBe("OPEN");
    cb.reset("broker-a");
    expect(cb.getState("broker-a")).toBe("CLOSED");
  });

  it("getSnapshot returns correct data", () => {
    const now = 1000000;
    cb.recordFailure("broker-a", now);
    const snap = cb.getSnapshot("broker-a");
    expect(snap.brokerId).toBe("broker-a");
    expect(snap.state).toBe("CLOSED");
    expect(snap.consecutiveFailures).toBe(1);
    expect(snap.lastFailureAt).toBe(now);
  });

  it("unsubscribe works", () => {
    const events: CircuitEvent[] = [];
    const unsub = cb.onTransition((e) => events.push(e));
    unsub();
    const now = 1000000;
    for (let i = 0; i < 5; i++) {
      cb.recordFailure("broker-a", now + i * 100);
    }
    expect(events).toHaveLength(0);
  });
});

// ============================================================================
// CLOCK MONITOR
// ============================================================================

describe("ClockMonitor", () => {
  let cm: ClockMonitor;

  beforeEach(() => {
    cm = new ClockMonitor();
  });

  it("returns OK when skew is within threshold", () => {
    const now = Date.now();
    const result = cm.checkClockSkew(now - 100, now);
    expect(result.status).toBe("OK");
    expect(result.halted).toBe(false);
    expect(result.skewMs).toBe(100);
  });

  it("returns BREACH on a single over-threshold check", () => {
    const now = Date.now();
    const result = cm.checkClockSkew(now - 600, now);
    expect(result.status).toBe("BREACH");
    expect(result.halted).toBe(false);
    expect(result.consecutiveBreaches).toBe(1);
  });

  it("HALTs after consecutive_breach_limit (3) breaches", () => {
    const now = Date.now();
    cm.checkClockSkew(now - 600, now);
    cm.checkClockSkew(now - 700, now);
    const result = cm.checkClockSkew(now - 800, now);
    expect(result.status).toBe("HALTED");
    expect(result.halted).toBe(true);
    expect(result.incident?.code).toBe("INC_CLOCK_SKEW");
  });

  it("does not double-emit incident on subsequent breaches after halt", () => {
    const now = Date.now();
    cm.checkClockSkew(now - 600, now);
    cm.checkClockSkew(now - 700, now);
    cm.checkClockSkew(now - 800, now); // triggers halt
    const result = cm.checkClockSkew(now - 900, now); // still halted
    expect(result.halted).toBe(true);
    expect(result.incident).toBeNull();
  });

  it("resumes after resume_after_ok (2) consecutive OK checks", () => {
    const now = Date.now();
    // Trip the halt
    cm.checkClockSkew(now - 600, now);
    cm.checkClockSkew(now - 700, now);
    cm.checkClockSkew(now - 800, now);
    expect(cm.isHalted()).toBe(true);

    // 1 OK is not enough
    cm.checkClockSkew(now - 100, now);
    expect(cm.isHalted()).toBe(true);

    // 2nd OK resumes
    cm.checkClockSkew(now - 50, now);
    expect(cm.isHalted()).toBe(false);
  });

  it("resets breach counter on OK check", () => {
    const now = Date.now();
    cm.checkClockSkew(now - 600, now); // breach 1
    cm.checkClockSkew(now - 100, now); // OK resets
    cm.checkClockSkew(now - 700, now); // breach 1 again
    expect(cm.getConsecutiveBreaches()).toBe(1);
    expect(cm.isHalted()).toBe(false);
  });

  it("reset() clears all state", () => {
    const now = Date.now();
    cm.checkClockSkew(now - 600, now);
    cm.checkClockSkew(now - 700, now);
    cm.checkClockSkew(now - 800, now);
    expect(cm.isHalted()).toBe(true);
    cm.reset();
    expect(cm.isHalted()).toBe(false);
    expect(cm.getConsecutiveBreaches()).toBe(0);
    expect(cm.getConsecutiveOks()).toBe(0);
  });
});

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

describe("DeadLetterQueue", () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue();
  });

  it("enqueues an item and assigns an id", () => {
    const item = dlq.enqueue({ orderId: "ord-1", reason: "timeout" });
    expect(item.id).toBeTruthy();
    expect(item.orderId).toBe("ord-1");
    expect(item.retryCount).toBe(0);
  });

  it("dequeues the oldest item", () => {
    dlq.enqueue({ orderId: "ord-1", reason: "a" });
    dlq.enqueue({ orderId: "ord-2", reason: "b" });
    const item = dlq.dequeue();
    expect(item?.orderId).toBe("ord-1");
    expect(dlq.size()).toBe(1);
  });

  it("returns undefined on dequeue from empty queue", () => {
    expect(dlq.dequeue()).toBeUndefined();
  });

  it("getAll returns all items", () => {
    dlq.enqueue({ orderId: "ord-1", reason: "a" });
    dlq.enqueue({ orderId: "ord-2", reason: "b" });
    expect(dlq.getAll()).toHaveLength(2);
  });

  it("retry increments retryCount", () => {
    const item = dlq.enqueue({ orderId: "ord-1", reason: "fail", maxRetries: 3 });
    expect(dlq.retry(item.id)).toBe(true);
    expect(dlq.get(item.id)?.retryCount).toBe(1);
  });

  it("retry returns false and emits INC_DEAD_LETTER after maxRetries exceeded", () => {
    const events: Array<{ type: string; incident: unknown }> = [];
    dlq.onEvent((e) => events.push({ type: e.type, incident: e.incident }));

    const item = dlq.enqueue({ orderId: "ord-1", reason: "fail", maxRetries: 2 });
    dlq.retry(item.id); // 1
    dlq.retry(item.id); // 2
    const result = dlq.retry(item.id); // 3 > maxRetries(2) -> exhausted
    expect(result).toBe(false);
    const exhausted = events.find((e) => e.type === "EXHAUSTED");
    expect(exhausted).toBeDefined();
    expect((exhausted?.incident as { code: string })?.code).toBe("INC_DEAD_LETTER");
  });

  it("retry returns false for unknown item", () => {
    expect(dlq.retry("nonexistent")).toBe(false);
  });

  it("remove deletes an item", () => {
    const item = dlq.enqueue({ orderId: "ord-1", reason: "a" });
    expect(dlq.remove(item.id)).toBe(true);
    expect(dlq.size()).toBe(0);
  });

  it("clear empties the queue", () => {
    dlq.enqueue({ orderId: "ord-1", reason: "a" });
    dlq.enqueue({ orderId: "ord-2", reason: "b" });
    dlq.clear();
    expect(dlq.size()).toBe(0);
  });
});

// ============================================================================
// QUALITY TRACKER
// ============================================================================

describe("QualityTracker", () => {
  let qt: QualityTracker;

  beforeEach(() => {
    qt = new QualityTracker();
  });

  const makeFill = (overrides: Partial<FillRecord> = {}): FillRecord => ({
    brokerId: "broker-a",
    orderId: "ord-1",
    symbol: "AAPL",
    expectedPrice: 150.0,
    fillPrice: 150.0,
    latencyMs: 10,
    filled: true,
    timestamp: Date.now(),
    ...overrides,
  });

  it("returns zero metrics for unknown broker", () => {
    const metrics = qt.getMetrics("unknown");
    expect(metrics.totalOrders).toBe(0);
    expect(metrics.fillRate).toBe(0);
  });

  it("tracks a fill with zero slippage", () => {
    qt.recordFill(makeFill());
    const metrics = qt.getMetrics("broker-a");
    expect(metrics.totalOrders).toBe(1);
    expect(metrics.filledOrders).toBe(1);
    expect(metrics.avgSlippageBps).toBe(0);
    expect(metrics.fillRate).toBe(1);
  });

  it("computes correct slippage in bps", () => {
    qt.recordFill(makeFill({ expectedPrice: 100, fillPrice: 100.05 }));
    const metrics = qt.getMetrics("broker-a");
    expect(metrics.avgSlippageBps).toBeCloseTo(5, 1);
  });

  it("tracks rejects separately", () => {
    qt.recordFill(makeFill({ filled: false }));
    const metrics = qt.getMetrics("broker-a");
    expect(metrics.rejectedOrders).toBe(1);
    expect(metrics.filledOrders).toBe(0);
    expect(metrics.rejectRate).toBe(1);
  });

  it("computes average latency", () => {
    qt.recordFill(makeFill({ latencyMs: 10 }));
    qt.recordFill(makeFill({ latencyMs: 20 }));
    const metrics = qt.getMetrics("broker-a");
    expect(metrics.avgLatencyMs).toBe(15);
  });

  it("fires slippage alert when threshold exceeded", () => {
    const alerts: Array<{ slippageBps: number }> = [];
    qt.onSlippageAlert((a) => alerts.push({ slippageBps: a.slippageBps }));

    // 10 bps threshold; 20 bps slippage
    qt.recordFill(makeFill({ expectedPrice: 100, fillPrice: 100.20 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].slippageBps).toBeCloseTo(20, 1);
  });

  it("does not fire alert when slippage is within threshold", () => {
    const alerts: unknown[] = [];
    qt.onSlippageAlert((a) => alerts.push(a));
    qt.recordFill(makeFill({ expectedPrice: 100, fillPrice: 100.005 }));
    expect(alerts).toHaveLength(0);
  });

  it("reset clears broker data", () => {
    qt.recordFill(makeFill());
    qt.reset("broker-a");
    expect(qt.getMetrics("broker-a").totalOrders).toBe(0);
  });

  it("tracks max and min slippage", () => {
    qt.recordFill(makeFill({ expectedPrice: 100, fillPrice: 100.10 }));
    qt.recordFill(makeFill({ expectedPrice: 100, fillPrice: 99.95 }));
    const metrics = qt.getMetrics("broker-a");
    expect(metrics.maxSlippageBps).toBeCloseTo(10, 1);
    expect(metrics.minSlippageBps).toBeCloseTo(-5, 1);
  });
});

// ============================================================================
// ORDER STATE MACHINE
// ============================================================================

describe("OrderStateMachine", () => {
  let sm: OrderStateMachine;

  beforeEach(() => {
    sm = new OrderStateMachine();
  });

  it("registers an order in PENDING state", () => {
    sm.register("ord-1");
    expect(sm.getState("ord-1")).toBe("PENDING");
  });

  it("throws on duplicate register", () => {
    sm.register("ord-1");
    expect(() => sm.register("ord-1")).toThrow("already registered");
  });

  it("transitions PENDING -> SENT on SEND", () => {
    sm.register("ord-1");
    expect(sm.transition("ord-1", "SEND")).toBe("SENT");
  });

  it("transitions SENT -> ACKED on ACK", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    expect(sm.transition("ord-1", "ACK")).toBe("ACKED");
  });

  it("transitions ACKED -> PARTIAL_FILL on PARTIAL_FILL", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    expect(sm.transition("ord-1", "PARTIAL_FILL")).toBe("PARTIAL_FILL");
  });

  it("transitions PARTIAL_FILL -> FILLED on FILL", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    sm.transition("ord-1", "PARTIAL_FILL");
    expect(sm.transition("ord-1", "FILL")).toBe("FILLED");
  });

  it("transitions ACKED -> FILLED on FILL (skip partial)", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    expect(sm.transition("ord-1", "FILL")).toBe("FILLED");
  });

  it("transitions SENT -> REJECTED on REJECT", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    expect(sm.transition("ord-1", "REJECT")).toBe("REJECTED");
  });

  it("transitions PENDING -> CANCELLED on CANCEL", () => {
    sm.register("ord-1");
    expect(sm.transition("ord-1", "CANCEL")).toBe("CANCELLED");
  });

  it("transitions ACKED -> CANCELLED on CANCEL", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    expect(sm.transition("ord-1", "CANCEL")).toBe("CANCELLED");
  });

  it("allows multiple PARTIAL_FILL transitions", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    sm.transition("ord-1", "PARTIAL_FILL");
    expect(sm.transition("ord-1", "PARTIAL_FILL")).toBe("PARTIAL_FILL");
  });

  it("throws on invalid transition (FILLED -> SEND)", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    sm.transition("ord-1", "FILL");
    expect(() => sm.transition("ord-1", "SEND")).toThrow("Invalid transition");
  });

  it("throws on transition for unregistered order", () => {
    expect(() => sm.transition("unknown", "SEND")).toThrow("not registered");
  });

  it("emits error listener on invalid transition", () => {
    const errors: InvalidTransitionError[] = [];
    sm.onError((e) => errors.push(e));
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    sm.transition("ord-1", "FILL");
    try {
      sm.transition("ord-1", "SEND");
    } catch {
      // expected
    }
    expect(errors).toHaveLength(1);
    expect(errors[0].incident.code).toBe("INC_ORDER_STATE_INVALID");
  });

  it("emits transition listener on valid transition", () => {
    const transitions: StateTransition[] = [];
    sm.onTransition((t) => transitions.push(t));
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    expect(transitions).toHaveLength(1);
    expect(transitions[0].previousState).toBe("PENDING");
    expect(transitions[0].newState).toBe("SENT");
  });

  it("isTerminal returns true for FILLED, CANCELLED, REJECTED", () => {
    sm.register("ord-1");
    sm.transition("ord-1", "SEND");
    sm.transition("ord-1", "ACK");
    sm.transition("ord-1", "FILL");
    expect(sm.isTerminal("ord-1")).toBe(true);

    sm.register("ord-2");
    sm.transition("ord-2", "CANCEL");
    expect(sm.isTerminal("ord-2")).toBe(true);

    sm.register("ord-3");
    sm.transition("ord-3", "SEND");
    sm.transition("ord-3", "REJECT");
    expect(sm.isTerminal("ord-3")).toBe(true);
  });

  it("isTerminal returns false for non-terminal states", () => {
    sm.register("ord-1");
    expect(sm.isTerminal("ord-1")).toBe(false);
    sm.transition("ord-1", "SEND");
    expect(sm.isTerminal("ord-1")).toBe(false);
  });

  it("remove deletes order from tracking", () => {
    sm.register("ord-1");
    sm.remove("ord-1");
    expect(sm.getState("ord-1")).toBeUndefined();
    expect(sm.size()).toBe(0);
  });

  it("size reflects tracked orders", () => {
    sm.register("ord-1");
    sm.register("ord-2");
    expect(sm.size()).toBe(2);
    sm.remove("ord-1");
    expect(sm.size()).toBe(1);
  });
});
