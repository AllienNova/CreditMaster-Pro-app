import { render, screen } from "@testing-library/react";
import CreditReportImport from "../CreditReportImport";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CreditReportImport", () => {
  const mockOnImportComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        reportId: "report-123",
        accountsCount: 10,
      }),
    });
  });

  it("should render import wizard", () => {
    render(<CreditReportImport onImportComplete={mockOnImportComplete} />);
    expect(screen.getByText(/Import Credit Report/i)).toBeInTheDocument();
  });

  it("should show bureau selection", () => {
    render(<CreditReportImport onImportComplete={mockOnImportComplete} />);
    expect(screen.getByText(/Experian/i)).toBeInTheDocument();
    expect(screen.getByText(/Equifax/i)).toBeInTheDocument();
    expect(screen.getByText(/TransUnion/i)).toBeInTheDocument();
  });

  it("should render without errors", () => {
    const { container } = render(
      <CreditReportImport onImportComplete={mockOnImportComplete} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should accept onImportComplete callback", () => {
    render(<CreditReportImport onImportComplete={mockOnImportComplete} />);
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it("should accept onError callback", () => {
    const mockOnError = jest.fn();
    render(
      <CreditReportImport
        onImportComplete={mockOnImportComplete}
        onError={mockOnError}
      />,
    );
    expect(mockOnError).not.toHaveBeenCalled();
  });
});
