/**
 * Tests for drawing-engine.ts
 *
 * Covers: createDrawing, getFibonacciLevels, serialize/deserialize,
 * and the localStorage helpers.
 */

import {
  createDrawing,
  getFibonacciLevels,
  serializeDrawings,
  deserializeDrawings,
  getDrawingsForSymbol,
  saveDrawingsForSymbol,
  type Drawing,
  type DrawingPoint,
} from "../drawing-engine";

// ============================================================================
// HELPERS
// ============================================================================

function makePoint(time: number, price: number): DrawingPoint {
  return { time, price };
}

// ============================================================================
// createDrawing
// ============================================================================

describe("createDrawing", () => {
  it("returns a Drawing with the given type and points", () => {
    const points = [makePoint(1000, 100), makePoint(2000, 120)];
    const drawing = createDrawing("trendline", points);

    expect(drawing.type).toBe("trendline");
    expect(drawing.points).toEqual(points);
    expect(drawing.visible).toBe(true);
  });

  it("assigns a unique id each call", () => {
    const a = createDrawing("horizontal", [makePoint(1000, 50)]);
    const b = createDrawing("horizontal", [makePoint(1000, 50)]);
    expect(a.id).not.toBe(b.id);
  });

  it("applies default style when none provided", () => {
    const drawing = createDrawing("fibonacci", [makePoint(0, 0), makePoint(1, 1)]);
    expect(drawing.style.color).toBe("#10b981");
    expect(drawing.style.lineWidth).toBe(1);
    expect(drawing.style.lineStyle).toBe("solid");
  });

  it("merges partial style override", () => {
    const drawing = createDrawing("trendline", [makePoint(0, 0)], {
      color: "#ff0000",
      lineStyle: "dashed",
    });
    expect(drawing.style.color).toBe("#ff0000");
    expect(drawing.style.lineStyle).toBe("dashed");
    expect(drawing.style.lineWidth).toBe(1);  // default unchanged
  });
});

// ============================================================================
// getFibonacciLevels
// ============================================================================

describe("getFibonacciLevels", () => {
  const high = makePoint(1000, 200);
  const low = makePoint(500, 100);
  let levels: ReturnType<typeof getFibonacciLevels>;

  beforeEach(() => {
    levels = getFibonacciLevels(high, low);
  });

  it("returns exactly 7 levels", () => {
    expect(levels).toHaveLength(7);
  });

  it("0% level equals the high price", () => {
    const zero = levels.find((l) => l.ratio === 0);
    expect(zero?.price).toBeCloseTo(200, 5);
  });

  it("100% level equals the low price", () => {
    const hundred = levels.find((l) => l.ratio === 1);
    expect(hundred?.price).toBeCloseTo(100, 5);
  });

  it("50% level is the midpoint", () => {
    const fifty = levels.find((l) => l.ratio === 0.5);
    expect(fifty?.price).toBeCloseTo(150, 5);
  });

  it("61.8% level is calculated correctly", () => {
    // price = 200 - (200 - 100) * 0.618 = 138.2
    const fib618 = levels.find((l) => l.ratio === 0.618);
    expect(fib618?.price).toBeCloseTo(138.2, 1);
  });

  it("labels are present for all standard ratios", () => {
    const labels = levels.map((l) => l.label);
    expect(labels).toContain("0%");
    expect(labels).toContain("23.6%");
    expect(labels).toContain("38.2%");
    expect(labels).toContain("50%");
    expect(labels).toContain("61.8%");
    expect(labels).toContain("78.6%");
    expect(labels).toContain("100%");
  });

  it("handles same high and low (zero range)", () => {
    const samePoint = makePoint(1000, 100);
    const flatLevels = getFibonacciLevels(samePoint, samePoint);
    flatLevels.forEach((l) => {
      expect(l.price).toBeCloseTo(100, 5);
    });
  });
});

// ============================================================================
// serializeDrawings / deserializeDrawings
// ============================================================================

describe("serializeDrawings / deserializeDrawings", () => {
  function makeDrawing(type: Drawing["type"] = "trendline"): Drawing {
    return createDrawing(type, [makePoint(1000, 100), makePoint(2000, 120)]);
  }

  it("round-trips an empty array", () => {
    const json = serializeDrawings([]);
    expect(deserializeDrawings(json)).toEqual([]);
  });

  it("round-trips a single drawing", () => {
    const drawing = makeDrawing();
    const json = serializeDrawings([drawing]);
    const result = deserializeDrawings(json);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(drawing);
  });

  it("round-trips multiple drawings of different types", () => {
    const drawings = [makeDrawing("trendline"), makeDrawing("horizontal"), makeDrawing("fibonacci")];
    const json = serializeDrawings(drawings);
    const result = deserializeDrawings(json);
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.type)).toEqual(["trendline", "horizontal", "fibonacci"]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(deserializeDrawings("not-json")).toEqual([]);
    expect(deserializeDrawings("")).toEqual([]);
  });

  it("returns empty array when JSON is not an array", () => {
    expect(deserializeDrawings('{"type":"trendline"}')).toEqual([]);
  });

  it("filters out malformed entries", () => {
    const valid = makeDrawing();
    const malformed = { id: 123, type: "trendline" };  // id should be string
    const json = JSON.stringify([valid, malformed]);
    const result = deserializeDrawings(json);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(valid.id);
  });
});

// ============================================================================
// getDrawingsForSymbol / saveDrawingsForSymbol
// ============================================================================

describe("getDrawingsForSymbol / saveDrawingsForSymbol", () => {
  const SYMBOL = "AAPL";

  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when nothing is stored", () => {
    expect(getDrawingsForSymbol(SYMBOL)).toEqual([]);
  });

  it("saves and retrieves drawings", () => {
    const drawing = createDrawing("horizontal", [makePoint(1000, 150)]);
    saveDrawingsForSymbol(SYMBOL, [drawing]);

    const result = getDrawingsForSymbol(SYMBOL);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(drawing);
  });

  it("overwrites previous data for the same symbol", () => {
    const first = createDrawing("trendline", [makePoint(0, 0)]);
    saveDrawingsForSymbol(SYMBOL, [first]);

    const second = createDrawing("fibonacci", [makePoint(1, 1), makePoint(2, 2)]);
    saveDrawingsForSymbol(SYMBOL, [second]);

    const result = getDrawingsForSymbol(SYMBOL);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(second.id);
  });

  it("isolates data by symbol", () => {
    const appl = createDrawing("horizontal", [makePoint(0, 100)]);
    const tsla = createDrawing("trendline", [makePoint(0, 200)]);
    saveDrawingsForSymbol("AAPL", [appl]);
    saveDrawingsForSymbol("TSLA", [tsla]);

    expect(getDrawingsForSymbol("AAPL")[0].id).toBe(appl.id);
    expect(getDrawingsForSymbol("TSLA")[0].id).toBe(tsla.id);
  });
});
