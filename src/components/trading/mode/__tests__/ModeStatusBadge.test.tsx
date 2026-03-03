/**
 * ModeStatusBadge Component Tests
 *
 * Tests for the operating mode badge display with correct
 * text, styling, size variants, and custom className support.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ModeStatusBadge } from "../ModeStatusBadge";
import type { OperatingMode } from "@/lib/trading/modes/mode-types";

describe("ModeStatusBadge", () => {
  // ========================================================================
  // Mode rendering tests
  // ========================================================================

  it("renders WATCH mode with correct text and blue styling", () => {
    render(<ModeStatusBadge mode="watch" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("WATCH");
    expect(badge).toHaveClass("bg-blue-100");
    expect(badge).toHaveClass("text-blue-700");
  });

  it("renders GUIDED mode with correct text and amber styling", () => {
    render(<ModeStatusBadge mode="guided" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("GUIDED");
    expect(badge).toHaveClass("bg-amber-100");
    expect(badge).toHaveClass("text-amber-700");
  });

  it("renders AUTONOMOUS mode with correct text and green styling", () => {
    render(<ModeStatusBadge mode="autonomous" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("AUTONOMOUS");
    expect(badge).toHaveClass("bg-green-100");
    expect(badge).toHaveClass("text-green-700");
  });

  // ========================================================================
  // Size variant tests
  // ========================================================================

  it("renders sm size with smaller padding and text", () => {
    render(<ModeStatusBadge mode="watch" size="sm" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("px-2");
    expect(badge).toHaveClass("py-0.5");
    expect(badge).toHaveClass("text-xs");
  });

  it("renders md size (default) with medium padding and text", () => {
    render(<ModeStatusBadge mode="watch" size="md" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("px-3");
    expect(badge).toHaveClass("py-1");
    expect(badge).toHaveClass("text-sm");
  });

  it("renders lg size with larger padding and text", () => {
    render(<ModeStatusBadge mode="watch" size="lg" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("px-4");
    expect(badge).toHaveClass("py-1.5");
    expect(badge).toHaveClass("text-base");
  });

  // ========================================================================
  // Custom className test
  // ========================================================================

  it("applies custom className", () => {
    render(<ModeStatusBadge mode="guided" className="mt-4 ml-2" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("mt-4");
    expect(badge).toHaveClass("ml-2");
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  it("has correct aria-label for accessibility", () => {
    render(<ModeStatusBadge mode="autonomous" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "Trading mode: AUTONOMOUS",
    );
  });

  it("defaults to md size when no size prop is provided", () => {
    render(<ModeStatusBadge mode="watch" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("text-sm");
  });
});
