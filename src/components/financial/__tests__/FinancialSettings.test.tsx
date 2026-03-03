import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import FinancialSettings from "../FinancialSettings";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

describe("FinancialSettings", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    alertSpy.mockRestore();
  });

  it("renders settings sections", () => {
    render(<FinancialSettings />);

    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
    expect(screen.getByText("Data Sync")).toBeInTheDocument();
    expect(screen.getByText("Privacy & Data")).toBeInTheDocument();
  });

  it("displays notification toggles", () => {
    render(<FinancialSettings />);

    expect(screen.getByText("Email Notifications")).toBeInTheDocument();
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
    expect(screen.getByText("Budget Alerts")).toBeInTheDocument();
    expect(screen.getByText("Bill Reminders")).toBeInTheDocument();
    expect(screen.getByText("Goal Milestones")).toBeInTheDocument();
    expect(screen.getByText("Large Transactions")).toBeInTheDocument();
  });

  it("displays privacy settings", () => {
    render(<FinancialSettings />);

    expect(screen.getByText("Share Anonymous Data")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Marketing Communications")).toBeInTheDocument();
  });

  it("displays save button", () => {
    render(<FinancialSettings />);

    expect(screen.getByText("Save Settings")).toBeInTheDocument();
  });

  it("shows saving state when Save is clicked", async () => {
    render(<FinancialSettings />);

    const saveButton = screen.getByText("Save Settings");
    fireEvent.click(saveButton);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows success alert after save completes", async () => {
    render(<FinancialSettings />);

    const saveButton = screen.getByText("Save Settings");
    fireEvent.click(saveButton);

    // Fast-forward through the setTimeout
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });

    expect(alertSpy).toHaveBeenCalledWith("Settings saved successfully!");
  });

  it("shows sign-in message when user is null", () => {
    jest.spyOn(
      require("@/hooks/useAuth"),
      "useAuth",
    ).mockReturnValue({ user: null });

    render(<FinancialSettings />);

    expect(
      screen.getByText("Please log in to manage your financial settings."),
    ).toBeInTheDocument();
  });

  it("displays sync frequency selector", () => {
    render(<FinancialSettings />);

    expect(screen.getByText("Sync Frequency")).toBeInTheDocument();
    expect(screen.getByText("Auto Sync")).toBeInTheDocument();
  });
});
