/**
 * Drawing Engine
 *
 * Core logic for chart drawing tools: trendlines, horizontal lines,
 * and Fibonacci retracements. Includes localStorage persistence helpers.
 */

// ============================================================================
// TYPES
// ============================================================================

export type DrawingType = 'trendline' | 'horizontal' | 'fibonacci';

export interface DrawingPoint {
  time: number;  // unix timestamp (seconds)
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  style: DrawingStyle;
  visible: boolean;
}

export interface FibonacciLevel {
  ratio: number;
  label: string;
  price: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FIBONACCI_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 0,     label: '0%' },
  { ratio: 0.236, label: '23.6%' },
  { ratio: 0.382, label: '38.2%' },
  { ratio: 0.5,   label: '50%' },
  { ratio: 0.618, label: '61.8%' },
  { ratio: 0.786, label: '78.6%' },
  { ratio: 1,     label: '100%' },
];

const DEFAULT_STYLE: DrawingStyle = {
  color: '#10b981',
  lineWidth: 1,
  lineStyle: 'solid',
};

const STORAGE_KEY_PREFIX = 'fynvita_drawings_';

// ============================================================================
// DRAWING CREATION
// ============================================================================

/**
 * Creates a new Drawing object with a unique ID.
 */
export function createDrawing(
  type: DrawingType,
  points: DrawingPoint[],
  style?: Partial<DrawingStyle>,
): Drawing {
  return {
    id: generateId(),
    type,
    points,
    style: { ...DEFAULT_STYLE, ...style },
    visible: true,
  };
}

// ============================================================================
// FIBONACCI
// ============================================================================

/**
 * Returns Fibonacci levels between highPoint and lowPoint at standard ratios:
 * 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
 *
 * Price at each level = high - (high - low) * ratio
 */
export function getFibonacciLevels(
  highPoint: DrawingPoint,
  lowPoint: DrawingPoint,
): FibonacciLevel[] {
  const range = highPoint.price - lowPoint.price;

  return FIBONACCI_RATIOS.map(({ ratio, label }) => ({
    ratio,
    label,
    price: highPoint.price - range * ratio,
  }));
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serializes an array of drawings to a JSON string for persistence.
 */
export function serializeDrawings(drawings: Drawing[]): string {
  return JSON.stringify(drawings);
}

/**
 * Deserializes a JSON string back into an array of drawings.
 * Returns an empty array if the string is invalid.
 */
export function deserializeDrawings(json: string): Drawing[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDrawing);
  } catch {
    return [];
  }
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

/**
 * Loads drawings for a given symbol from localStorage.
 * Returns an empty array if nothing is stored or the environment
 * does not have localStorage (e.g. SSR).
 */
export function getDrawingsForSymbol(symbol: string): Drawing[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + symbol);
  if (!raw) return [];
  return deserializeDrawings(raw);
}

/**
 * Persists drawings for a given symbol to localStorage.
 */
export function saveDrawingsForSymbol(symbol: string, drawings: Drawing[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_PREFIX + symbol, serializeDrawings(drawings));
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function generateId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isDrawingPoint(value: unknown): value is DrawingPoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).time === 'number' &&
    typeof (value as Record<string, unknown>).price === 'number'
  );
}

function isDrawingStyle(value: unknown): value is DrawingStyle {
  const obj = value as Record<string, unknown>;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof obj.color === 'string' &&
    typeof obj.lineWidth === 'number' &&
    (obj.lineStyle === 'solid' || obj.lineStyle === 'dashed' || obj.lineStyle === 'dotted')
  );
}

function isDrawing(value: unknown): value is Drawing {
  const obj = value as Record<string, unknown>;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof obj.id === 'string' &&
    (obj.type === 'trendline' || obj.type === 'horizontal' || obj.type === 'fibonacci') &&
    Array.isArray(obj.points) &&
    (obj.points as unknown[]).every(isDrawingPoint) &&
    isDrawingStyle(obj.style) &&
    typeof obj.visible === 'boolean'
  );
}
