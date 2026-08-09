/**
 * Render tests for app/documents/index.tsx — real documentApi wiring
 * (TASK Wave-7 P1 parity: de-mock the mobile Documents screen).
 *
 * Verifies that the screen consumes the REAL documentApi instead of the old
 * hardcoded DOCUMENTS mock + setTimeout:
 *   - real documents from documentApi.getAll() render on success
 *   - the empty state renders when the API returns []
 *   - an honest error state renders on failure (NO fallback to mock data)
 *   - the former hardcoded mock rows never appear
 *   - the upload button drives documentApi.upload() with the picked file
 */

import React from "react";
import {
  render,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import DocumentsScreen from "../../../app/documents/index";
import { documentApi } from "../../services/api/user";
import type { Document } from "../../services/api/types";

// Replace the real user-api module with jest mocks for the two methods the
// screen uses. Same resolved module the screen imports, so the mock applies.
jest.mock("../../services/api/user", () => ({
  documentApi: {
    getAll: jest.fn(),
    upload: jest.fn(),
  },
}));

// expo-document-picker is NOT mocked globally in jest.setup.js — mock it here.
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

const mockGetAll = documentApi.getAll as jest.Mock;
const mockUpload = documentApi.upload as jest.Mock;
const mockGetDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;

// The six rows the old mock array hardcoded. None may ever render again.
const FORMER_MOCK_ROWS = [
  "Experian Credit Report",
  "Dispute Letter - Late Payment",
  "Equifax Response",
  "Driver License",
  "TransUnion Report",
  "Goodwill Letter Template",
];

const makeDoc = (overrides: Partial<Document> = {}): Document => ({
  id: "doc-1",
  userId: "user-1",
  name: "My Real Credit Report.pdf",
  type: "credit_report",
  fileUrl: "https://files.example.com/doc-1.pdf",
  fileSize: 204800,
  mimeType: "application/pdf",
  status: "analyzed",
  uploadedAt: "2026-01-15T10:00:00Z",
  ...overrides,
});

describe("DocumentsScreen (app/documents/index.tsx) — real documentApi wiring", () => {
  it("renders documents returned by documentApi.getAll() on success", async () => {
    mockGetAll.mockResolvedValue({
      success: true,
      data: {
        documents: [
          makeDoc(),
          makeDoc({
            id: "doc-2",
            name: "Bureau Dispute Response.pdf",
            type: "dispute_response",
            status: "processing",
          }),
        ],
      },
    });

    const { getByText, queryByTestId } = render(<DocumentsScreen />);

    await waitFor(() =>
      expect(getByText("My Real Credit Report.pdf")).toBeTruthy(),
    );
    expect(getByText("Bureau Dispute Response.pdf")).toBeTruthy();
    // The loading indicator is gone once data has loaded.
    expect(queryByTestId("loading-indicator")).toBeNull();
    // Proves the real API was called (not a setTimeout mock).
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when documentApi.getAll() returns no documents", async () => {
    mockGetAll.mockResolvedValue({ success: true, data: { documents: [] } });

    const { getByTestId, queryByText } = render(<DocumentsScreen />);

    await waitFor(() => expect(getByTestId("empty-state")).toBeTruthy());
    for (const row of FORMER_MOCK_ROWS) {
      expect(queryByText(row)).toBeNull();
    }
  });

  it("renders an honest error state on failure — no fallback to mock data", async () => {
    mockGetAll.mockResolvedValue({
      success: false,
      error: { code: "HTTP_500", message: "Server error while loading" },
    });

    const { getByTestId, getByText, queryByText, queryByTestId } = render(
      <DocumentsScreen />,
    );

    await waitFor(() => expect(getByTestId("error-state")).toBeTruthy());
    expect(getByText("Server error while loading")).toBeTruthy();
    // Must NOT silently show documents / empty state when the call failed.
    expect(queryByTestId("empty-state")).toBeNull();
    for (const row of FORMER_MOCK_ROWS) {
      expect(queryByText(row)).toBeNull();
    }
  });

  it("never renders the former hardcoded mock rows on a successful load", async () => {
    mockGetAll.mockResolvedValue({
      success: true,
      data: { documents: [makeDoc()] },
    });

    const { getByText, queryByText } = render(<DocumentsScreen />);

    await waitFor(() =>
      expect(getByText("My Real Credit Report.pdf")).toBeTruthy(),
    );
    for (const row of FORMER_MOCK_ROWS) {
      expect(queryByText(row)).toBeNull();
    }
  });

  it("uploads a picked file via documentApi.upload() and refreshes the list", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/new-report.pdf",
          name: "new-report.pdf",
          mimeType: "application/pdf",
          size: 1234,
        },
      ],
    });
    // First load: empty. After upload: one real doc.
    mockGetAll
      .mockResolvedValueOnce({ success: true, data: { documents: [] } })
      .mockResolvedValueOnce({
        success: true,
        data: {
          documents: [makeDoc({ id: "doc-new", name: "new-report.pdf" })],
        },
      });
    mockUpload.mockResolvedValue({
      success: true,
      data: makeDoc({ id: "doc-new", name: "new-report.pdf" }),
    });

    const { getByTestId, getByText } = render(<DocumentsScreen />);

    await waitFor(() => expect(getByTestId("empty-state")).toBeTruthy());

    fireEvent.press(getByTestId("upload-button"));

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "file:///tmp/new-report.pdf",
        name: "new-report.pdf",
        type: "application/pdf",
      }),
      expect.any(String),
    );
    // List refreshed from the API after a successful upload.
    await waitFor(() => expect(getByText("new-report.pdf")).toBeTruthy());
    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it("does not call documentApi.upload() when the picker is canceled", async () => {
    mockGetAll.mockResolvedValue({ success: true, data: { documents: [] } });
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: null });

    const { getByTestId } = render(<DocumentsScreen />);

    await waitFor(() => expect(getByTestId("empty-state")).toBeTruthy());

    fireEvent.press(getByTestId("upload-button"));

    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalledTimes(1));
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
