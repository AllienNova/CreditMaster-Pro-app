/**
 * Tests for Calendar Component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import Calendar, { CalendarEvent } from "../Calendar";

describe("Calendar", () => {
  const mockOnDateSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Fix date to January 15, 2026
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render with day headers", () => {
    render(<Calendar />);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("should display current month and year", () => {
    render(<Calendar />);
    expect(screen.getByText("January 2026")).toBeInTheDocument();
  });

  it("should navigate to previous month", () => {
    render(<Calendar />);
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("December 2025")).toBeInTheDocument();
  });

  it("should navigate to next month", () => {
    render(<Calendar />);
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("February 2026")).toBeInTheDocument();
  });

  it("should navigate to today when Today button is clicked", () => {
    render(<Calendar onDateSelect={mockOnDateSelect} />);
    // Navigate away first
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("February 2026")).toBeInTheDocument();
    // Click Today
    fireEvent.click(screen.getByText("Today"));
    expect(screen.getByText("January 2026")).toBeInTheDocument();
    expect(mockOnDateSelect).toHaveBeenCalled();
  });

  it("should call onDateSelect when a date is clicked", () => {
    render(<Calendar onDateSelect={mockOnDateSelect} />);
    fireEvent.click(screen.getByText("10"));
    expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
    const selectedDate = mockOnDateSelect.mock.calls[0][0];
    expect(selectedDate.getDate()).toBe(10);
    expect(selectedDate.getMonth()).toBe(0); // January
    expect(selectedDate.getFullYear()).toBe(2026);
  });

  it("should highlight selected date", () => {
    const selectedDate = new Date(2026, 0, 20);
    render(<Calendar selectedDate={selectedDate} />);
    const button = screen.getByText("20").closest("button");
    expect(button?.className).toContain("bg-blue-600");
  });

  it("should highlight today", () => {
    render(<Calendar highlightToday={true} />);
    const todayButton = screen.getByText("15").closest("button");
    expect(todayButton?.className).toContain("bg-blue-50");
  });

  it("should disable dates before minDate", () => {
    const minDate = new Date(2026, 0, 10);
    render(<Calendar minDate={minDate} onDateSelect={mockOnDateSelect} />);
    const earlyDate = screen.getByText("5").closest("button");
    expect(earlyDate).toBeDisabled();
    fireEvent.click(earlyDate!);
    expect(mockOnDateSelect).not.toHaveBeenCalled();
  });

  it("should disable dates after maxDate", () => {
    const maxDate = new Date(2026, 0, 20);
    render(<Calendar maxDate={maxDate} onDateSelect={mockOnDateSelect} />);
    const lateDate = screen.getByText("25").closest("button");
    expect(lateDate).toBeDisabled();
  });

  it("should show event dots when events are provided", () => {
    const events: CalendarEvent[] = [
      { date: new Date(2026, 0, 15), title: "Bill Due", type: "bill" },
      { date: new Date(2026, 0, 15), title: "Paycheck", type: "income" },
    ];
    render(<Calendar events={events} showEventDots={true} />);
    // Events should have dots rendered
    const dateButton = screen.getByText("15").closest("button");
    expect(dateButton?.querySelectorAll(".rounded-full").length).toBeGreaterThan(0);
  });

  it("should show event legend when events exist", () => {
    const events: CalendarEvent[] = [
      { date: new Date(2026, 0, 15), title: "Bill Due", type: "bill" },
    ];
    render(<Calendar events={events} />);
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Reminders")).toBeInTheDocument();
  });

  it("should not show event legend when no events", () => {
    render(<Calendar events={[]} />);
    expect(screen.queryByText("Bills")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Calendar className="custom-calendar" />);
    expect(container.querySelector(".custom-calendar")).toBeInTheDocument();
  });

  it("should start on the selected date's month", () => {
    const selectedDate = new Date(2026, 5, 10); // June 2026
    render(<Calendar selectedDate={selectedDate} />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("should hide event dots when showEventDots is false", () => {
    const events: CalendarEvent[] = [
      { date: new Date(2026, 0, 15), title: "Bill Due", type: "bill" },
    ];
    render(<Calendar events={events} showEventDots={false} />);
    const dateButton = screen.getByText("15").closest("button");
    // Should not have dot container
    expect(dateButton?.querySelector(".absolute")).toBeNull();
  });
});
