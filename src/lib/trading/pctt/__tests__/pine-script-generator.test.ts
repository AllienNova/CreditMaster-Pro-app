/**
 * Pine Script Generator Tests
 *
 * Tests the PCTT Pine Script v5 code generation.
 * Mocks pctt-core to provide PCTTConfig/DEFAULT_PCTT_CONFIG.
 */

import { generatePCTTPineScript } from "../pine-script-generator";
import { DEFAULT_PCTT_CONFIG } from "../pctt-core";

describe("generatePCTTPineScript", () => {
  // =========================================================================
  // BASIC GENERATION
  // =========================================================================

  describe("basic generation", () => {
    it("returns a non-empty string", () => {
      const script = generatePCTTPineScript();
      expect(script).toBeTruthy();
      expect(typeof script).toBe("string");
      expect(script.length).toBeGreaterThan(100);
    });

    it("contains //@version=5 directive", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("//@version=5");
    });

    it("contains indicator declaration", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain('indicator("PCTT Structure"');
    });

    it("contains overlay=true", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("overlay=true");
    });

    it("contains Pine Script sections", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("// INPUTS");
      expect(script).toContain("// CALCULATIONS");
      expect(script).toContain("// BOUNDARY ESTIMATION");
      expect(script).toContain("// REGIME DETECTION");
      expect(script).toContain("// EVENT STATE MACHINE");
      expect(script).toContain("// SIGNALS");
      expect(script).toContain("// PLOTTING");
      expect(script).toContain("// INFO TABLE");
      expect(script).toContain("// ALERTS");
    });
  });

  // =========================================================================
  // DEFAULT CONFIG VALUES IN SCRIPT
  // =========================================================================

  describe("default config values", () => {
    it("embeds default pivotDepth", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.int(${DEFAULT_PCTT_CONFIG.pivotDepth}, "Pivot Depth"`,
      );
    });

    it("embeds default atrPeriod", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.int(${DEFAULT_PCTT_CONFIG.atrPeriod}, "ATR Period"`,
      );
    });

    it("embeds default breakPenetration", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.breakPenetration}, "Break Penetration (ATR)"`,
      );
    });

    it("embeds default breakConfirmation", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.breakConfirmation}, "Break Confirmation (ATR)"`,
      );
    });

    it("embeds default retestTolerance", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.retestTolerance}, "Retest Tolerance (ATR)"`,
      );
    });

    it("embeds default retestWindow", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.int(${DEFAULT_PCTT_CONFIG.retestWindow}, "Retest Window (bars)"`,
      );
    });

    it("embeds default minQScore", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.minQScore}, "Min Q-Score"`,
      );
    });

    it("embeds default stopBuffer", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.stopBuffer}, "Stop Buffer (ATR)"`,
      );
    });

    it("embeds default target1R", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.target1R}, "Target 1 (R)"`,
      );
    });

    it("embeds default target2R", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.target2R}, "Target 2 (R)"`,
      );
    });

    it("embeds default erPeriod", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.int(${DEFAULT_PCTT_CONFIG.erPeriod}, "Efficiency Ratio Period"`,
      );
    });

    it("embeds default erTrendThreshold", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.float(${DEFAULT_PCTT_CONFIG.erTrendThreshold}, "ER Trend Threshold"`,
      );
    });

    it("embeds default maxCrossings", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain(
        `input.int(${DEFAULT_PCTT_CONFIG.maxCrossings}, "Max Crossings (Range)"`,
      );
    });
  });

  // =========================================================================
  // CUSTOM CONFIG OVERRIDES
  // =========================================================================

  describe("custom config overrides", () => {
    it("uses custom pivotDepth", () => {
      const script = generatePCTTPineScript({ pivotDepth: 10 });
      expect(script).toContain('input.int(10, "Pivot Depth"');
    });

    it("uses custom atrPeriod", () => {
      const script = generatePCTTPineScript({ atrPeriod: 21 });
      expect(script).toContain('input.int(21, "ATR Period"');
    });

    it("uses custom minQScore", () => {
      const script = generatePCTTPineScript({ minQScore: 0.75 });
      expect(script).toContain('input.float(0.75, "Min Q-Score"');
    });

    it("uses custom stopBuffer", () => {
      const script = generatePCTTPineScript({ stopBuffer: 1.0 });
      expect(script).toContain('input.float(1, "Stop Buffer (ATR)"');
    });

    it("uses custom target R values", () => {
      const script = generatePCTTPineScript({ target1R: 1.5, target2R: 3.0 });
      expect(script).toContain('input.float(1.5, "Target 1 (R)"');
      expect(script).toContain('input.float(3, "Target 2 (R)"');
    });
  });

  // =========================================================================
  // OPTIONS
  // =========================================================================

  describe("options", () => {
    it("uses custom indicator name", () => {
      const script = generatePCTTPineScript(
        {},
        { indicatorName: "My Custom PCTT" },
      );
      expect(script).toContain("My Custom PCTT");
      expect(script).toContain('indicator("My Custom PCTT"');
    });

    it("sets showPivots display option", () => {
      const script = generatePCTTPineScript({}, { showPivots: false });
      expect(script).toContain('input.bool(false, "Show Pivots"');
    });

    it("sets showQScores display option", () => {
      const script = generatePCTTPineScript({}, { showQScores: false });
      expect(script).toContain('input.bool(false, "Show Q-Scores"');
    });

    it("sets showRegime display option", () => {
      const script = generatePCTTPineScript({}, { showRegime: false });
      expect(script).toContain('input.bool(false, "Show Regime"');
    });

    it("sets showSignals display option", () => {
      const script = generatePCTTPineScript({}, { showSignals: false });
      expect(script).toContain('input.bool(false, "Show Signals"');
    });

    it("defaults all display options to true", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain('input.bool(true, "Show Pivots"');
      expect(script).toContain('input.bool(true, "Show Q-Scores"');
      expect(script).toContain('input.bool(true, "Show Regime"');
      expect(script).toContain('input.bool(true, "Show Signals"');
    });
  });

  // =========================================================================
  // ALERTS
  // =========================================================================

  describe("alerts", () => {
    it("includes alert conditions when enableAlerts is true", () => {
      const script = generatePCTTPineScript({}, { enableAlerts: true });
      expect(script).toContain("alertcondition(longSignal");
      expect(script).toContain("alertcondition(shortSignal");
      expect(script).toContain("PCTT Long Entry");
      expect(script).toContain("PCTT Short Entry");
    });

    it("includes break and retest alert conditions", () => {
      const script = generatePCTTPineScript({}, { enableAlerts: true });
      expect(script).toContain("PCTT Resistance Break");
      expect(script).toContain("PCTT Support Break");
      expect(script).toContain("PCTT Bullish Retest");
      expect(script).toContain("PCTT Bearish Retest");
    });

    it("disables alert conditions when enableAlerts is false", () => {
      const script = generatePCTTPineScript({}, { enableAlerts: false });
      expect(script).toContain("// Alerts disabled");
      expect(script).not.toContain("alertcondition(longSignal");
      expect(script).not.toContain("alertcondition(shortSignal");
    });

    it("defaults alerts to enabled", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("alertcondition(longSignal");
    });
  });

  // =========================================================================
  // WEBHOOK JSON PAYLOAD
  // =========================================================================

  describe("webhook JSON payload", () => {
    it("includes webhook alert with JSON payload for long signals", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("if longSignal");
      expect(script).toContain('"signal":"long"');
    });

    it("includes webhook alert with JSON payload for short signals", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("if shortSignal");
      expect(script).toContain('"signal":"short"');
    });

    it("includes all required fields in webhook payload", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain('"symbol":"');
      expect(script).toContain('"price":');
      expect(script).toContain('"stop":');
      expect(script).toContain('"target1":');
      expect(script).toContain('"target2":');
      expect(script).toContain('"qScore":');
      expect(script).toContain('"regime":"');
      expect(script).toContain('"timestamp":"');
    });
  });

  // =========================================================================
  // PINE SCRIPT STRUCTURE
  // =========================================================================

  describe("Pine Script structure", () => {
    it("contains pivot detection logic", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("ta.pivothigh");
      expect(script).toContain("ta.pivotlow");
    });

    it("contains ATR calculation", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("ta.atr(");
    });

    it("contains efficiency ratio calculation", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("efficiencyRatio");
    });

    it("contains regime classification", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("isTrendUp");
      expect(script).toContain("isTrendDown");
      expect(script).toContain("isRange");
      expect(script).toContain("isTransition");
    });

    it("contains state machine states", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain('"idle"');
      expect(script).toContain('"freeze_up"');
      expect(script).toContain('"freeze_down"');
      expect(script).toContain('"retest_up"');
      expect(script).toContain('"retest_down"');
      expect(script).toContain('"entry_long"');
      expect(script).toContain('"entry_short"');
    });

    it("contains Q-score sigmoid calculation", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("1.0 / (1.0 + math.exp(-");
    });

    it("contains boundary line estimation", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("estimateLine");
      expect(script).toContain("bestSlope");
      expect(script).toContain("bestIntercept");
    });

    it("contains plotting for support and resistance", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain('"Support"');
      expect(script).toContain('"Resistance"');
    });

    it("contains info table", () => {
      const script = generatePCTTPineScript();
      expect(script).toContain("table.new(");
      expect(script).toContain("table.cell(");
      expect(script).toContain("infoTable");
    });
  });

  // =========================================================================
  // DEFAULT EXPORT
  // =========================================================================

  describe("default export", () => {
    it("default export is the same function", async () => {
      const mod = await import("../pine-script-generator");
      expect(mod.default).toBe(generatePCTTPineScript);
    });
  });
});
