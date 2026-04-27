/**
 * Order Lifecycle State Machine
 *
 * Enforces valid order state transitions:
 *   PENDING -> SENT -> ACKED -> PARTIAL_FILL -> FILLED
 *                                            -> CANCELLED
 *                           -> FILLED
 *                           -> CANCELLED
 *                  -> REJECTED
 *          -> CANCELLED
 *
 * Invalid transitions throw and emit INC_ORDER_STATE_INVALID (via listener).
 */

import {
  INC_ORDER_ORPHANED,
  type CanonicalIncident,
} from "@/lib/trading/incidents/incident-codes";

// ============================================================================
// TYPES
// ============================================================================

export type MachineOrderState =
  | "PENDING"
  | "SENT"
  | "ACKED"
  | "PARTIAL_FILL"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";

export type OrderMachineEvent =
  | "SEND"
  | "ACK"
  | "PARTIAL_FILL"
  | "FILL"
  | "CANCEL"
  | "REJECT";

export interface StateTransition {
  orderId: string;
  previousState: MachineOrderState;
  newState: MachineOrderState;
  event: OrderMachineEvent;
  timestamp: number;
}

export interface InvalidTransitionError {
  orderId: string;
  currentState: MachineOrderState;
  event: OrderMachineEvent;
  message: string;
  incident: CanonicalIncident;
}

// ============================================================================
// TRANSITION TABLE
// ============================================================================

/**
 * For each state, the set of valid events and the resulting state.
 */
const TRANSITIONS: ReadonlyMap<
  MachineOrderState,
  ReadonlyMap<OrderMachineEvent, MachineOrderState>
> = new Map([
  [
    "PENDING",
    new Map<OrderMachineEvent, MachineOrderState>([
      ["SEND", "SENT"],
      ["CANCEL", "CANCELLED"],
    ]),
  ],
  [
    "SENT",
    new Map<OrderMachineEvent, MachineOrderState>([
      ["ACK", "ACKED"],
      ["REJECT", "REJECTED"],
      ["CANCEL", "CANCELLED"],
    ]),
  ],
  [
    "ACKED",
    new Map<OrderMachineEvent, MachineOrderState>([
      ["PARTIAL_FILL", "PARTIAL_FILL"],
      ["FILL", "FILLED"],
      ["CANCEL", "CANCELLED"],
    ]),
  ],
  [
    "PARTIAL_FILL",
    new Map<OrderMachineEvent, MachineOrderState>([
      ["PARTIAL_FILL", "PARTIAL_FILL"],
      ["FILL", "FILLED"],
      ["CANCEL", "CANCELLED"],
    ]),
  ],
  // Terminal states: no valid transitions
  ["FILLED", new Map()],
  ["CANCELLED", new Map()],
  ["REJECTED", new Map()],
]);

// We reuse INC_ORDER_ORPHANED for invalid state transitions since no
// dedicated INC_ORDER_STATE_INVALID exists in the canonical taxonomy.
// The incident description is overridden at the call site.
const INC_ORDER_STATE_INVALID: CanonicalIncident = {
  ...INC_ORDER_ORPHANED,
  code: "INC_ORDER_STATE_INVALID",
  description: "An illegal order state transition was attempted",
};

// ============================================================================
// STATE MACHINE
// ============================================================================

export class OrderStateMachine {
  private readonly orders: Map<string, MachineOrderState> = new Map();
  private readonly transitionListeners: Array<
    (transition: StateTransition) => void
  > = [];
  private readonly errorListeners: Array<
    (err: InvalidTransitionError) => void
  > = [];

  /**
   * Subscribe to successful state transitions.
   */
  onTransition(listener: (transition: StateTransition) => void): () => void {
    this.transitionListeners.push(listener);
    return () => {
      const idx = this.transitionListeners.indexOf(listener);
      if (idx >= 0) this.transitionListeners.splice(idx, 1);
    };
  }

  /**
   * Subscribe to invalid transition attempts.
   */
  onError(listener: (err: InvalidTransitionError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const idx = this.errorListeners.indexOf(listener);
      if (idx >= 0) this.errorListeners.splice(idx, 1);
    };
  }

  /**
   * Register a new order in PENDING state.
   * Throws if the order already exists.
   */
  register(orderId: string): void {
    if (this.orders.has(orderId)) {
      throw new Error(`Order ${orderId} is already registered`);
    }
    this.orders.set(orderId, "PENDING");
  }

  /**
   * Attempt a state transition for an order.
   *
   * Returns the new state on success.
   * Throws on invalid transition (also emits to error listeners).
   */
  transition(
    orderId: string,
    event: OrderMachineEvent,
    now: number = Date.now(),
  ): MachineOrderState {
    const currentState = this.orders.get(orderId);
    if (currentState === undefined) {
      const err: InvalidTransitionError = {
        orderId,
        currentState: "PENDING",
        event,
        message: `Order ${orderId} is not registered`,
        incident: INC_ORDER_STATE_INVALID,
      };
      this.emitError(err);
      throw new Error(err.message);
    }

    const validEvents = TRANSITIONS.get(currentState);
    const newState = validEvents?.get(event);

    if (newState === undefined) {
      const err: InvalidTransitionError = {
        orderId,
        currentState,
        event,
        message: `Invalid transition: ${currentState} + ${event} for order ${orderId}`,
        incident: INC_ORDER_STATE_INVALID,
      };
      this.emitError(err);
      throw new Error(err.message);
    }

    this.orders.set(orderId, newState);

    const transition: StateTransition = {
      orderId,
      previousState: currentState,
      newState,
      event,
      timestamp: now,
    };
    for (const listener of this.transitionListeners) {
      listener(transition);
    }

    return newState;
  }

  /**
   * Returns the current state of an order, or undefined if not registered.
   */
  getState(orderId: string): MachineOrderState | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Returns true if the order is in a terminal state (FILLED, CANCELLED, REJECTED).
   */
  isTerminal(orderId: string): boolean {
    const state = this.orders.get(orderId);
    return state === "FILLED" || state === "CANCELLED" || state === "REJECTED";
  }

  /**
   * Remove an order from tracking (cleanup after archival).
   */
  remove(orderId: string): void {
    this.orders.delete(orderId);
  }

  /**
   * Number of orders currently tracked.
   */
  size(): number {
    return this.orders.size;
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private emitError(err: InvalidTransitionError): void {
    for (const listener of this.errorListeners) {
      listener(err);
    }
  }
}
