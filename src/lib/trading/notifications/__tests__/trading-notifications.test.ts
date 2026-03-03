/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

import {
  TradingNotificationService,
  createTradingNotificationService,
  getTradingNotificationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type TradingNotification,
  type NotificationPreferences,
} from "../trading-notifications";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createService(
  overrides?: Partial<NotificationPreferences>,
): TradingNotificationService {
  return createTradingNotificationService(overrides);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TradingNotificationService", () => {
  let service: TradingNotificationService;

  beforeEach(() => {
    service = createService();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor and defaults
  // ─────────────────────────────────────────────────────────────────────────
  describe("Constructor", () => {
    it("should use default preferences when none provided", () => {
      const prefs = service.getPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("should override default preferences with provided values", () => {
      const custom = createService({
        enableSignalAlerts: false,
        minSignalConfidence: 0.9,
      });
      const prefs = custom.getPreferences();

      expect(prefs.enableSignalAlerts).toBe(false);
      expect(prefs.minSignalConfidence).toBe(0.9);
      // Other defaults preserved
      expect(prefs.enableOrderAlerts).toBe(true);
      expect(prefs.enableRiskAlerts).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createNotification
  // ─────────────────────────────────────────────────────────────────────────
  describe("createNotification", () => {
    it("should create a signal_new notification with correct template", () => {
      const notif = service.createNotification("signal_new", {
        symbol: "AAPL",
        side: "long",
        confidence: 0.85,
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("signal_new");
      expect(notif!.title).toBe("New Signal: AAPL");
      expect(notif!.message).toContain("Long signal");
      expect(notif!.message).toContain("85%");
      expect(notif!.symbol).toBe("AAPL");
      expect(notif!.priority).toBe("medium");
      expect(notif!.read).toBe(false);
      expect(notif!.id).toMatch(/^TN-/);
    });

    it("should create an order_filled notification", () => {
      const notif = service.createNotification("order_filled", {
        symbol: "MSFT",
        side: "Buy",
        quantity: 100,
        price: 450.5,
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Order Filled: MSFT");
      expect(notif!.message).toContain("Buy");
      expect(notif!.message).toContain("100");
      expect(notif!.message).toContain("$450.50");
      expect(notif!.priority).toBe("high");
    });

    it("should create a kill_switch notification with critical priority", () => {
      const notif = service.createNotification("kill_switch", {
        reason: "Max drawdown exceeded",
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Kill Switch Activated");
      expect(notif!.message).toContain("Max drawdown exceeded");
      expect(notif!.priority).toBe("critical");
    });

    it("should create an ise_rotation notification with low priority", () => {
      const notif = service.createNotification("ise_rotation", {
        added: "TSLA, NVDA",
        removed: "XOM",
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Instrument Rotation");
      expect(notif!.message).toContain("TSLA, NVDA");
      expect(notif!.message).toContain("XOM");
      expect(notif!.priority).toBe("low");
    });

    it("should create position_stop_hit notification with P&L", () => {
      const notif = service.createNotification("position_stop_hit", {
        symbol: "GOOG",
        price: 150,
        pnl: -250.5,
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Stop Loss Hit: GOOG");
      expect(notif!.message).toContain("$150");
      expect(notif!.message).toContain("$-250.50");
    });

    it("should create position_target_hit notification with positive P&L", () => {
      const notif = service.createNotification("position_target_hit", {
        symbol: "AMZN",
        price: 200,
        pnl: 500.75,
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Target Hit: AMZN");
      expect(notif!.message).toContain("+$500.75");
    });

    it("should create risk_warning notification", () => {
      const notif = service.createNotification("risk_warning", {
        message: "Portfolio risk elevated",
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Risk Warning");
      expect(notif!.message).toBe("Portfolio risk elevated");
    });

    it("should create risk_critical notification", () => {
      const notif = service.createNotification("risk_critical", {
        message: "Margin call imminent",
      });

      expect(notif).not.toBeNull();
      expect(notif!.title).toBe("Critical Risk Alert");
      expect(notif!.message).toBe("Margin call imminent");
      expect(notif!.priority).toBe("critical");
    });

    it("should store notifications in order (newest first)", () => {
      service.createNotification("signal_new", {
        symbol: "A",
        side: "long",
        confidence: 0.8,
      });
      service.createNotification("signal_new", {
        symbol: "B",
        side: "short",
        confidence: 0.9,
      });

      const all = service.getNotifications();
      expect(all).toHaveLength(2);
      expect(all[0].symbol).toBe("B"); // newest first
      expect(all[1].symbol).toBe("A");
    });

    it("should cap notifications at maxNotifications (100)", () => {
      for (let i = 0; i < 105; i++) {
        service.createNotification("order_filled", {
          symbol: `SYM-${i}`,
          side: "Buy",
          quantity: 1,
          price: 100,
        });
      }

      const all = service.getNotifications();
      expect(all).toHaveLength(100);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Preference-based filtering (shouldNotify)
  // ─────────────────────────────────────────────────────────────────────────
  describe("shouldNotify (preference filtering)", () => {
    it("should suppress signal notifications when enableSignalAlerts is false", () => {
      const svc = createService({ enableSignalAlerts: false });

      const notif = svc.createNotification("signal_new", {
        symbol: "AAPL",
        side: "long",
        confidence: 0.95,
      });

      expect(notif).toBeNull();
    });

    it("should suppress signals below minSignalConfidence", () => {
      const svc = createService({ minSignalConfidence: 0.9 });

      const notif = svc.createNotification("signal_new", {
        symbol: "AAPL",
        side: "long",
        confidence: 0.85,
      });

      expect(notif).toBeNull();
    });

    it("should allow signals at or above minSignalConfidence", () => {
      const svc = createService({ minSignalConfidence: 0.8 });

      const notif = svc.createNotification("signal_new", {
        symbol: "AAPL",
        side: "long",
        confidence: 0.8,
      });

      expect(notif).not.toBeNull();
    });

    it("should suppress order notifications when enableOrderAlerts is false", () => {
      const svc = createService({ enableOrderAlerts: false });

      const notif = svc.createNotification("order_filled", {
        symbol: "MSFT",
        side: "Buy",
        quantity: 10,
        price: 400,
      });

      expect(notif).toBeNull();
    });

    it("should suppress risk notifications when enableRiskAlerts is false", () => {
      const svc = createService({ enableRiskAlerts: false });

      const notif = svc.createNotification("risk_warning", {
        message: "High risk",
      });

      expect(notif).toBeNull();
    });

    it("should suppress ISE rotation when enableISEAlerts is false", () => {
      const svc = createService({ enableISEAlerts: false });

      const notif = svc.createNotification("ise_rotation", {
        added: "TSLA",
      });

      expect(notif).toBeNull();
    });

    it("should always allow kill_switch notifications", () => {
      const svc = createService({
        enableSignalAlerts: false,
        enableOrderAlerts: false,
        enableRiskAlerts: false,
        enableISEAlerts: false,
      });

      const notif = svc.createNotification("kill_switch", {
        reason: "Emergency",
      });

      expect(notif).not.toBeNull();
      expect(notif!.priority).toBe("critical");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Action URLs
  // ─────────────────────────────────────────────────────────────────────────
  describe("getActionUrl", () => {
    it("should return trading page URL with symbol for signal_new", () => {
      const notif = service.createNotification("signal_new", {
        symbol: "TSLA",
        side: "long",
        confidence: 0.8,
      });
      expect(notif!.actionUrl).toBe("/trading?symbol=TSLA");
    });

    it("should return /trading when signal has no symbol", () => {
      const notif = service.createNotification("signal_triggered", {
        side: "long",
        price: 100,
      });
      expect(notif!.actionUrl).toBe("/trading");
    });

    it("should return orders tab for order notifications", () => {
      const notif = service.createNotification("order_filled", {
        symbol: "X",
        side: "Buy",
        quantity: 1,
        price: 10,
      });
      expect(notif!.actionUrl).toBe("/trading?tab=orders");
    });

    it("should return positions tab for position notifications", () => {
      const notif = service.createNotification("position_stop_hit", {
        symbol: "Y",
        price: 50,
        pnl: -10,
      });
      expect(notif!.actionUrl).toBe("/trading?tab=positions");
    });

    it("should return risk tab for risk and kill switch notifications", () => {
      const riskNotif = service.createNotification("risk_warning", {
        message: "test",
      });
      expect(riskNotif!.actionUrl).toBe("/trading?tab=risk");

      const killNotif = service.createNotification("kill_switch", {
        reason: "test",
      });
      expect(killNotif!.actionUrl).toBe("/trading?tab=risk");
    });

    it("should return radar for ISE rotation", () => {
      const notif = service.createNotification("ise_rotation", {
        added: "NEW",
      });
      expect(notif!.actionUrl).toBe("/trading/radar");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Listeners / subscribe
  // ─────────────────────────────────────────────────────────────────────────
  describe("subscribe / listeners", () => {
    it("should call listeners when a notification is created", () => {
      const listener = jest.fn();
      service.subscribe(listener);

      service.createNotification("kill_switch", { reason: "test" });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "kill_switch",
          title: "Kill Switch Activated",
        }),
      );
    });

    it("should support multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      service.subscribe(listener1);
      service.subscribe(listener2);

      service.createNotification("risk_critical", { message: "Alert!" });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should return an unsubscribe function", () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      service.createNotification("kill_switch", { reason: "test1" });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      service.createNotification("kill_switch", { reason: "test2" });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1 - not called again
    });

    it("should handle listener errors gracefully", () => {
      const badListener = jest.fn(() => {
        throw new Error("Listener crash");
      });
      const goodListener = jest.fn();
      service.subscribe(badListener);
      service.subscribe(goodListener);

      // Should not throw even though badListener throws
      expect(() => {
        service.createNotification("kill_switch", { reason: "test" });
      }).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalledTimes(1);
    });

    it("should not call listeners when notification is suppressed by preferences", () => {
      const svc = createService({ enableSignalAlerts: false });
      const listener = jest.fn();
      svc.subscribe(listener);

      svc.createNotification("signal_new", {
        symbol: "X",
        side: "long",
        confidence: 0.9,
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Read / unread management
  // ─────────────────────────────────────────────────────────────────────────
  describe("Read/unread management", () => {
    it("should create notifications as unread", () => {
      service.createNotification("kill_switch", { reason: "test" });

      expect(service.getUnreadCount()).toBe(1);
      expect(service.getUnreadNotifications()).toHaveLength(1);
    });

    it("should mark a notification as read", () => {
      const notif = service.createNotification("kill_switch", {
        reason: "test",
      });
      service.markAsRead(notif!.id);

      expect(service.getUnreadCount()).toBe(0);
      expect(service.getUnreadNotifications()).toHaveLength(0);
    });

    it("should not fail when marking non-existent notification as read", () => {
      expect(() => service.markAsRead("nonexistent-id")).not.toThrow();
    });

    it("should mark all as read", () => {
      service.createNotification("kill_switch", { reason: "a" });
      service.createNotification("kill_switch", { reason: "b" });
      service.createNotification("kill_switch", { reason: "c" });

      expect(service.getUnreadCount()).toBe(3);

      service.markAllAsRead();

      expect(service.getUnreadCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getNotifications / clear
  // ─────────────────────────────────────────────────────────────────────────
  describe("getNotifications / clearNotifications", () => {
    it("should return a copy of notifications (not the internal array)", () => {
      service.createNotification("kill_switch", { reason: "test" });
      const copy = service.getNotifications();
      copy.splice(0, 1);

      // Internal array should be unchanged
      expect(service.getNotifications()).toHaveLength(1);
    });

    it("should clear all notifications", () => {
      service.createNotification("kill_switch", { reason: "a" });
      service.createNotification("kill_switch", { reason: "b" });

      expect(service.getNotifications()).toHaveLength(2);

      service.clearNotifications();

      expect(service.getNotifications()).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updatePreferences / getPreferences
  // ─────────────────────────────────────────────────────────────────────────
  describe("updatePreferences / getPreferences", () => {
    it("should update preferences", () => {
      service.updatePreferences({
        enableSignalAlerts: false,
        soundEnabled: false,
      });

      const prefs = service.getPreferences();
      expect(prefs.enableSignalAlerts).toBe(false);
      expect(prefs.soundEnabled).toBe(false);
      // Others unchanged
      expect(prefs.enableOrderAlerts).toBe(true);
    });

    it("should return a copy of preferences", () => {
      const prefs = service.getPreferences();
      prefs.enableSignalAlerts = false;

      // Internal preferences should be unchanged
      expect(service.getPreferences().enableSignalAlerts).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helper notification methods
  // ─────────────────────────────────────────────────────────────────────────
  describe("Helper notification methods", () => {
    it("notifyNewSignal should create signal_new notification", () => {
      const notif = service.notifyNewSignal("AAPL", "long", 0.85, 175.5);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("signal_new");
      expect(notif!.data).toEqual({
        symbol: "AAPL",
        side: "long",
        confidence: 0.85,
        entryPrice: 175.5,
      });
    });

    it("notifyOrderFilled should create order_filled notification", () => {
      const notif = service.notifyOrderFilled("MSFT", "Buy", 100, 450.25);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("order_filled");
      expect(notif!.message).toContain("Buy");
      expect(notif!.message).toContain("100");
      expect(notif!.message).toContain("$450.25");
    });

    it("notifyStopHit should create position_stop_hit notification", () => {
      const notif = service.notifyStopHit("GOOG", 150, -200);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("position_stop_hit");
    });

    it("notifyTargetHit should create position_target_hit notification", () => {
      const notif = service.notifyTargetHit("AMZN", 200, 350);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("position_target_hit");
    });

    it("notifyRiskWarning should create risk_warning notification", () => {
      const notif = service.notifyRiskWarning("High concentration", {
        concentration: 0.8,
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("risk_warning");
      expect(notif!.data).toEqual(
        expect.objectContaining({ message: "High concentration" }),
      );
    });

    it("notifyKillSwitch should create kill_switch notification", () => {
      const notif = service.notifyKillSwitch("Max drawdown exceeded");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("kill_switch");
      expect(notif!.message).toContain("Max drawdown exceeded");
    });

    it("notifyRotation should create ise_rotation notification", () => {
      const notif = service.notifyRotation(["TSLA", "NVDA"], ["XOM"]);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("ise_rotation");
      expect(notif!.data).toEqual(
        expect.objectContaining({
          added: "TSLA, NVDA",
          removed: "XOM",
        }),
      );
    });

    it("notifyRotation should handle undefined added/removed", () => {
      const notif = service.notifyRotation(undefined, undefined);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("ise_rotation");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // D3: New notification types (mode, compliance, agent, wellness)
  // ─────────────────────────────────────────────────────────────────────────
  describe("D3: Mode notifications", () => {
    it("should create mode_graduated notification", () => {
      const notif = service.createNotification("mode_graduated", {
        fromMode: "watch",
        toMode: "guided",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("mode_graduated");
      expect(notif!.title).toBe("Mode Upgraded: guided");
      expect(notif!.message).toContain("watch");
      expect(notif!.message).toContain("guided");
      expect(notif!.priority).toBe("high");
      expect(notif!.actionUrl).toBe("/trading?tab=mode");
    });

    it("should create mode_blocked notification", () => {
      const notif = service.createNotification("mode_blocked", {
        targetMode: "autonomous",
        reason: "Not enough paper trades",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("mode_blocked");
      expect(notif!.title).toBe("Mode Change Blocked");
      expect(notif!.message).toContain("autonomous");
      expect(notif!.message).toContain("Not enough paper trades");
      expect(notif!.priority).toBe("medium");
    });

    it("should suppress mode notifications when enableModeAlerts is false", () => {
      const svc = createService({ enableModeAlerts: false });

      const notif = svc.createNotification("mode_graduated", {
        fromMode: "watch",
        toMode: "guided",
      });

      expect(notif).toBeNull();
    });
  });

  describe("D3: Compliance notifications", () => {
    it("should create compliance_violation notification with critical priority", () => {
      const notif = service.createNotification("compliance_violation", {
        lawId: "LAW-07",
        message: "Position size exceeds limit",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("compliance_violation");
      expect(notif!.title).toBe("Compliance Violation");
      expect(notif!.message).toContain("LAW-07");
      expect(notif!.message).toContain("Position size exceeds limit");
      expect(notif!.priority).toBe("critical");
      expect(notif!.actionUrl).toBe("/trading?tab=compliance");
    });

    it("should create compliance_warning notification", () => {
      const notif = service.createNotification("compliance_warning", {
        message: "Compliance score approaching threshold",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("compliance_warning");
      expect(notif!.title).toBe("Compliance Warning");
      expect(notif!.message).toBe("Compliance score approaching threshold");
      expect(notif!.priority).toBe("medium");
    });

    it("should suppress compliance notifications when enableComplianceAlerts is false", () => {
      const svc = createService({ enableComplianceAlerts: false });

      const notif = svc.createNotification("compliance_violation", {
        lawId: "LAW-01",
        message: "Violation",
      });

      expect(notif).toBeNull();
    });
  });

  describe("D3: Agent notifications", () => {
    it("should create agent_signal notification", () => {
      const notif = service.createNotification("agent_signal", {
        agentName: "SentimentAgent",
        symbol: "AAPL",
        signal: "bullish momentum detected",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("agent_signal");
      expect(notif!.title).toBe("Agent Signal: SentimentAgent");
      expect(notif!.message).toContain("SentimentAgent");
      expect(notif!.message).toContain("bullish momentum detected");
      expect(notif!.message).toContain("AAPL");
      expect(notif!.priority).toBe("medium");
      expect(notif!.actionUrl).toBe("/trading?tab=agents");
    });

    it("should create agent_error notification", () => {
      const notif = service.createNotification("agent_error", {
        agentName: "EarningsAgent",
        error: "API timeout",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("agent_error");
      expect(notif!.title).toBe("Agent Error: EarningsAgent");
      expect(notif!.message).toContain("API timeout");
      expect(notif!.priority).toBe("high");
    });

    it("should suppress agent notifications when enableAgentAlerts is false", () => {
      const svc = createService({ enableAgentAlerts: false });

      const notif = svc.createNotification("agent_signal", {
        agentName: "Test",
        symbol: "X",
      });

      expect(notif).toBeNull();
    });
  });

  describe("D3: Wellness gate notifications", () => {
    it("should create wellness_blocked notification with critical priority", () => {
      const notif = service.createNotification("wellness_blocked", {
        reason: "DTI ratio too high",
        dtiRatio: 52.3,
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("wellness_blocked");
      expect(notif!.title).toBe("Trading Blocked: Financial Wellness");
      expect(notif!.message).toContain("DTI ratio too high");
      expect(notif!.message).toContain("52.3%");
      expect(notif!.priority).toBe("critical");
      expect(notif!.actionUrl).toBe("/trading?tab=risk");
    });

    it("should create wellness_warning notification", () => {
      const notif = service.createNotification("wellness_warning", {
        message: "Financial metrics approaching trading limits",
      });

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("wellness_warning");
      expect(notif!.title).toBe("Financial Wellness Warning");
      expect(notif!.message).toBe("Financial metrics approaching trading limits");
      expect(notif!.priority).toBe("medium");
    });

    it("should suppress wellness notifications when enableWellnessAlerts is false", () => {
      const svc = createService({ enableWellnessAlerts: false });

      const notif = svc.createNotification("wellness_blocked", {
        reason: "DTI too high",
        dtiRatio: 50,
      });

      expect(notif).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // D3: New helper methods
  // ─────────────────────────────────────────────────────────────────────────
  describe("D3: Helper notification methods", () => {
    it("notifyModeGraduated should create mode_graduated notification", () => {
      const notif = service.notifyModeGraduated("watch", "guided");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("mode_graduated");
      expect(notif!.data).toEqual(
        expect.objectContaining({ fromMode: "watch", toMode: "guided" }),
      );
    });

    it("notifyModeBlocked should create mode_blocked notification", () => {
      const notif = service.notifyModeBlocked("autonomous", "Insufficient paper trades");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("mode_blocked");
      expect(notif!.data).toEqual(
        expect.objectContaining({ targetMode: "autonomous" }),
      );
    });

    it("notifyComplianceViolation should create compliance_violation notification", () => {
      const notif = service.notifyComplianceViolation("LAW-12", "Max loss exceeded");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("compliance_violation");
      expect(notif!.message).toContain("LAW-12");
    });

    it("notifyComplianceWarning should create compliance_warning notification", () => {
      const notif = service.notifyComplianceWarning("Score dropping");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("compliance_warning");
      expect(notif!.message).toBe("Score dropping");
    });

    it("notifyAgentSignal should create agent_signal notification", () => {
      const notif = service.notifyAgentSignal("SentimentAgent", "TSLA", "bearish divergence");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("agent_signal");
      expect(notif!.data).toEqual(
        expect.objectContaining({
          agentName: "SentimentAgent",
          symbol: "TSLA",
          signal: "bearish divergence",
        }),
      );
    });

    it("notifyAgentError should create agent_error notification", () => {
      const notif = service.notifyAgentError("EarningsAgent", "Model unavailable");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("agent_error");
      expect(notif!.message).toContain("Model unavailable");
    });

    it("notifyWellnessBlocked should create wellness_blocked notification", () => {
      const notif = service.notifyWellnessBlocked("DTI exceeds limit", 45.2);

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("wellness_blocked");
      expect(notif!.data).toEqual(
        expect.objectContaining({ reason: "DTI exceeds limit", dtiRatio: 45.2 }),
      );
    });

    it("notifyWellnessWarning should create wellness_warning notification", () => {
      const notif = service.notifyWellnessWarning("DTI approaching limit");

      expect(notif).not.toBeNull();
      expect(notif!.type).toBe("wellness_warning");
      expect(notif!.message).toBe("DTI approaching limit");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // D3: New action URLs
  // ─────────────────────────────────────────────────────────────────────────
  describe("D3: Action URLs for new notification types", () => {
    it("should return mode tab for mode notifications", () => {
      const notif = service.createNotification("mode_graduated", {
        fromMode: "watch",
        toMode: "guided",
      });
      expect(notif!.actionUrl).toBe("/trading?tab=mode");
    });

    it("should return compliance tab for compliance notifications", () => {
      const notif = service.createNotification("compliance_violation", {
        lawId: "LAW-01",
        message: "test",
      });
      expect(notif!.actionUrl).toBe("/trading?tab=compliance");
    });

    it("should return agents tab for agent notifications", () => {
      const notif = service.createNotification("agent_signal", {
        agentName: "Test",
        symbol: "X",
      });
      expect(notif!.actionUrl).toBe("/trading?tab=agents");
    });

    it("should return risk tab for wellness notifications", () => {
      const notif = service.createNotification("wellness_blocked", {
        reason: "DTI too high",
      });
      expect(notif!.actionUrl).toBe("/trading?tab=risk");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // D3: Default preferences include new flags
  // ─────────────────────────────────────────────────────────────────────────
  describe("D3: Default preferences for new alert types", () => {
    it("should have all new alert flags enabled by default", () => {
      const prefs = service.getPreferences();
      expect(prefs.enableModeAlerts).toBe(true);
      expect(prefs.enableComplianceAlerts).toBe(true);
      expect(prefs.enableAgentAlerts).toBe(true);
      expect(prefs.enableWellnessAlerts).toBe(true);
    });

    it("should allow disabling new alert types via constructor", () => {
      const svc = createService({
        enableModeAlerts: false,
        enableComplianceAlerts: false,
        enableAgentAlerts: false,
        enableWellnessAlerts: false,
      });

      const prefs = svc.getPreferences();
      expect(prefs.enableModeAlerts).toBe(false);
      expect(prefs.enableComplianceAlerts).toBe(false);
      expect(prefs.enableAgentAlerts).toBe(false);
      expect(prefs.enableWellnessAlerts).toBe(false);
    });

    it("should allow toggling new preferences via updatePreferences", () => {
      service.updatePreferences({ enableModeAlerts: false });
      expect(service.getPreferences().enableModeAlerts).toBe(false);

      service.updatePreferences({ enableModeAlerts: true });
      expect(service.getPreferences().enableModeAlerts).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Singleton and factory
  // ─────────────────────────────────────────────────────────────────────────
  describe("Singleton and factory functions", () => {
    it("getTradingNotificationService should return same instance", () => {
      const inst1 = getTradingNotificationService();
      const inst2 = getTradingNotificationService();
      expect(inst1).toBe(inst2);
    });

    it("createTradingNotificationService should return new instance each time", () => {
      const inst1 = createTradingNotificationService();
      const inst2 = createTradingNotificationService();
      expect(inst1).not.toBe(inst2);
    });
  });
});
