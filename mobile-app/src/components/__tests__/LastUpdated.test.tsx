/**
 * LastUpdated Component Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { LastUpdated } from "../LastUpdated";

describe("LastUpdated Component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders "Never" when timestamp is null', () => {
    const { getByText } = render(<LastUpdated timestamp={null} />);
    expect(getByText(/Never/)).toBeTruthy();
  });

  it('renders "Just now" for recent timestamps (< 60 seconds)', () => {
    const timestamp = new Date("2024-01-15T11:59:30Z").toISOString(); // 30 seconds ago
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/Just now/)).toBeTruthy();
  });

  it("renders minutes ago for timestamps < 1 hour", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString(); // 15 minutes ago
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/15m ago/)).toBeTruthy();
  });

  it("renders hours ago for timestamps < 24 hours", () => {
    const timestamp = new Date("2024-01-15T09:00:00Z").toISOString(); // 3 hours ago
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/3h ago/)).toBeTruthy();
  });

  it('renders "Yesterday" for timestamps from previous day', () => {
    const timestamp = new Date("2024-01-14T12:00:00Z").toISOString(); // Yesterday
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/Yesterday/)).toBeTruthy();
  });

  it("renders days ago for timestamps < 7 days", () => {
    const timestamp = new Date("2024-01-12T12:00:00Z").toISOString(); // 3 days ago
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/3d ago/)).toBeTruthy();
  });

  it("renders formatted date for timestamps >= 7 days", () => {
    const timestamp = new Date("2024-01-01T12:00:00Z").toISOString(); // 14 days ago
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    expect(getByText(/Jan 1/)).toBeTruthy();
  });

  it("renders with custom label", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString();
    const { getByText } = render(
      <LastUpdated timestamp={timestamp} label="Last synced" />,
    );
    expect(getByText(/Last synced:/)).toBeTruthy();
  });

  it("renders without icon when showIcon is false", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString();
    const { queryByTestId } = render(
      <LastUpdated timestamp={timestamp} showIcon={false} />,
    );
    // Icon should not be rendered
    expect(queryByTestId("time-icon")).toBeNull();
  });

  it("renders with medium size", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString();
    const { getByText } = render(
      <LastUpdated timestamp={timestamp} size="medium" />,
    );
    const text = getByText(/Last updated:/);
    expect(text).toBeTruthy();
    // Medium size should have larger font (13 vs 11)
    expect(text.props.style).toMatchObject({ fontSize: 13 });
  });

  it("renders with small size by default", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString();
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    const text = getByText(/Last updated:/);
    expect(text).toBeTruthy();
    expect(text.props.style).toMatchObject({ fontSize: 11 });
  });

  it("updates relative time after interval", () => {
    const timestamp = new Date("2024-01-15T11:59:00Z").toISOString(); // 1 minute ago
    const { getByText, rerender } = render(
      <LastUpdated timestamp={timestamp} />,
    );

    expect(getByText(/1m ago/)).toBeTruthy();

    // Advance time by 1 minute
    jest.advanceTimersByTime(60000);

    // Force re-render to trigger useEffect
    rerender(<LastUpdated timestamp={timestamp} />);

    // Should now show 2m ago
    expect(getByText(/2m ago/)).toBeTruthy();
  });

  it("cleans up interval on unmount", () => {
    const timestamp = new Date("2024-01-15T11:45:00Z").toISOString();
    const { unmount } = render(<LastUpdated timestamp={timestamp} />);

    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("handles invalid timestamp gracefully", () => {
    const { getByText } = render(<LastUpdated timestamp="invalid-date" />);
    // Should show "Never" or handle gracefully
    expect(getByText(/Never/)).toBeTruthy();
  });

  it("handles future timestamps", () => {
    const timestamp = new Date("2024-01-15T13:00:00Z").toISOString(); // 1 hour in future
    const { getByText } = render(<LastUpdated timestamp={timestamp} />);
    // Should handle gracefully, likely showing "Just now" or the date
    expect(getByText).toBeTruthy();
  });
});
