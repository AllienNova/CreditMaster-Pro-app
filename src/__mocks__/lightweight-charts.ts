/**
 * Manual mock for lightweight-charts (ESM-only package)
 *
 * This mock provides the same interface as lightweight-charts v5
 * for use in Jest tests. The package is ESM-only and cannot be
 * resolved by Jest's CJS module resolver, so we use moduleNameMapper
 * to redirect imports to this mock.
 */

const mockSetData = jest.fn();
const mockCreatePriceLine = jest.fn();
const mockSetMarkers = jest.fn();
const mockApplyOptions = jest.fn();

const mockSeriesApi = {
  setData: mockSetData,
  createPriceLine: mockCreatePriceLine,
  setMarkers: mockSetMarkers,
  applyOptions: mockApplyOptions,
};

const mockFitContent = jest.fn();
const mockSubscribeVisibleLogicalRangeChange = jest.fn();
const mockGetVisibleLogicalRange = jest
  .fn()
  .mockReturnValue({ from: 0, to: 100 });
const mockSetVisibleLogicalRange = jest.fn();

const mockTimeScale = {
  fitContent: mockFitContent,
  subscribeVisibleLogicalRangeChange: mockSubscribeVisibleLogicalRangeChange,
  getVisibleLogicalRange: mockGetVisibleLogicalRange,
  setVisibleLogicalRange: mockSetVisibleLogicalRange,
};

const mockPriceScaleApplyOptions = jest.fn();
const mockPriceScale = {
  applyOptions: mockPriceScaleApplyOptions,
};

const mockRemove = jest.fn();
const mockSubscribeCrosshairMove = jest.fn();

const mockChartApi = {
  addSeries: jest.fn().mockReturnValue(mockSeriesApi),
  removeSeries: jest.fn(),
  applyOptions: jest.fn(),
  timeScale: jest.fn().mockReturnValue(mockTimeScale),
  priceScale: jest.fn().mockReturnValue(mockPriceScale),
  remove: mockRemove,
  subscribeCrosshairMove: mockSubscribeCrosshairMove,
};

export const createChart = jest.fn().mockReturnValue(mockChartApi);

export const ColorType = { Solid: "Solid" };
export const CrosshairMode = { Normal: 0 };
export const LineStyle = { Solid: 0, Dashed: 1, Dotted: 2 };

// Series type identifiers (v5 API)
export const CandlestickSeries = "CandlestickSeries";
export const LineSeries = "LineSeries";
export const AreaSeries = "AreaSeries";
export const HistogramSeries = "HistogramSeries";
export const BaselineSeries = "BaselineSeries";

// Re-export the mock internals for test access
export const __mockChartApi = mockChartApi;
export const __mockSeriesApi = mockSeriesApi;
export const __mockTimeScale = mockTimeScale;
export const __mockPriceScale = mockPriceScale;
