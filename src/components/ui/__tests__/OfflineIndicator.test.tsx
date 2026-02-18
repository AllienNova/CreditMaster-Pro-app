/**
 * Tests for OfflineIndicator Component
 */

import { render, screen, waitFor } from "@testing-library/react";
import { OfflineIndicator } from "../OfflineIndicator";
import { useOnline } from "@/hooks/useOnline";

// Mock useOnline hook
jest.mock("@/hooks/useOnline");

const mockUseOnline = useOnline as jest.MockedFunction<typeof useOnline>;

describe("OfflineIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should not render when online and never was offline", () => {
    mockUseOnline.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: new Date(),
      lastOfflineAt: null,
      checkConnection: jest.fn(),
    });

    const { container } = render(<OfflineIndicator />);

    expect(container.firstChild).toBeNull();
  });

  it("should render offline banner when offline", () => {
    const cachedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    render(<OfflineIndicator cachedAt={cachedAt} />);

    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing cached data/i)).toBeInTheDocument();
    expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
  });

  it("should render reconnected banner when coming back online", () => {
    const lastOnlineAt = new Date();

    mockUseOnline.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      lastOnlineAt,
      lastOfflineAt: new Date(Date.now() - 10000),
      checkConnection: jest.fn(),
    });

    render(<OfflineIndicator />);

    expect(screen.getByText(/Back online/i)).toBeInTheDocument();
    expect(screen.getByText(/Data synced/i)).toBeInTheDocument();
  });

  it("should auto-dismiss reconnected message after 5 seconds", async () => {
    mockUseOnline.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      lastOnlineAt: new Date(),
      lastOfflineAt: new Date(Date.now() - 10000),
      checkConnection: jest.fn(),
    });

    const { container } = render(<OfflineIndicator />);

    expect(screen.getByText(/Back online/i)).toBeInTheDocument();

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("should render badge variant", () => {
    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    const { container } = render(<OfflineIndicator variant="badge" />);

    expect(container.querySelector(".inline-flex")).toBeInTheDocument();
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
  });

  it("should render badge variant when online", () => {
    mockUseOnline.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      lastOnlineAt: new Date(),
      lastOfflineAt: new Date(Date.now() - 10000),
      checkConnection: jest.fn(),
    });

    render(<OfflineIndicator variant="badge" />);

    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it("should not show cached timestamp when showCachedTimestamp is false", () => {
    const cachedAt = new Date(Date.now() - 5 * 60 * 1000);

    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    render(
      <OfflineIndicator showCachedTimestamp={false} cachedAt={cachedAt} />,
    );

    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/5m ago/i)).not.toBeInTheDocument();
  });

  it("should render at bottom position", () => {
    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    const { container } = render(<OfflineIndicator position="bottom" />);

    expect(container.querySelector(".bottom-0")).toBeInTheDocument();
  });

  it("should have proper ARIA attributes", () => {
    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    render(<OfflineIndicator />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
  });

  it("should format timestamps correctly", () => {
    mockUseOnline.mockReturnValue({
      isOnline: false,
      wasOffline: true,
      lastOnlineAt: null,
      lastOfflineAt: new Date(),
      checkConnection: jest.fn(),
    });

    // Test different time intervals
    const justNow = new Date();
    render(<OfflineIndicator cachedAt={justNow} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });
});
