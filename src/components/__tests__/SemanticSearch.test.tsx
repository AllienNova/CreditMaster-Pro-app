/**
 * SemanticSearch — tests against the real component.
 *
 * WHAT THIS FILE USED TO DO. It opened with
 *
 *   jest.mock("../semantic-search/SemanticSearch", () => { ...inline fake... })
 *
 * and then rendered that replacement. All ten tests asserted on
 * `data-testid="semantic-search"`, `search-input` and `score-1`, none of which
 * the real component has. They exercised the mock, passed against a version of
 * the component that did not typecheck, and passed identically before and
 * after the fabrication below was removed from it. That is worse than having
 * no tests: it reported coverage that did not exist.
 *
 * No assertion was weakened to get here — the previous ten could only ever
 * describe the fake, so there was nothing about the component to preserve.
 *
 * WHAT IS TESTED NOW. The real component, and in particular what was taken out
 * of it:
 *
 *   setResults(filtered.length > 0 ? filtered : SAMPLE_RESULTS);
 *
 * With no `onSearch`, a query matching nothing returned all four sample
 * documents at 95%/89%/82%/78% "match" — so every search succeeded whatever
 * was typed, behind an 800 ms delay staged to look like work. The index
 * dropdown claimed the corpus to match ("All Documents (1250)").
 *
 * The component is mounted nowhere, so none of that ever reached a reader.
 * These tests exist so it cannot start to.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import SemanticSearch, {
  type SearchResult,
} from "../semantic-search/SemanticSearch";

function result(over: Partial<SearchResult> = {}): SearchResult {
  return {
    id: "r-1",
    title: "A real document",
    content: "Returned by the caller's own search function.",
    similarity: 0.91,
    highlights: ["real"],
    ...over,
  };
}

function search(query = "fcra") {
  fireEvent.change(
    screen.getByPlaceholderText("Search documents using natural language..."),
    { target: { value: query } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("SemanticSearch — without a backend it invents nothing", () => {
  it("says search is not connected rather than returning documents", async () => {
    render(<SemanticSearch />);

    search();

    expect(
      await screen.findByText("Search is not connected"),
    ).toBeInTheDocument();
    expect(screen.getByText(/documents we made up/i)).toBeInTheDocument();
  });

  it("returns none of the sample documents for any query", async () => {
    render(<SemanticSearch />);

    search("anything at all");
    await screen.findByText("Search is not connected");

    for (const title of [
      "FCRA Rights and Dispute Process",
      "How to Write an Effective Dispute Letter",
      "Understanding Credit Score Factors",
      "Dealing with Collection Agencies",
    ]) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
  });

  it("shows no similarity score, since nothing was compared", async () => {
    render(<SemanticSearch />);

    search();
    await screen.findByText("Search is not connected");

    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it("offers no index, rather than claiming a corpus", () => {
    render(<SemanticSearch />);

    // "All Documents (1250)" described 1,250 documents that do not exist.
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.queryByText(/1250/)).not.toBeInTheDocument();
  });

  it("reports no result count when it did not search", async () => {
    render(<SemanticSearch />);

    search();
    await screen.findByText("Search is not connected");

    expect(screen.queryByText(/Found \d+ result/)).not.toBeInTheDocument();
  });
});

describe("SemanticSearch — with a backend it shows what the backend said", () => {
  it("renders the caller's results", async () => {
    const onSearch = jest.fn().mockResolvedValue([result()]);
    render(<SemanticSearch onSearch={onSearch} />);

    search();

    expect(await screen.findByText("A real document")).toBeInTheDocument();
    expect(screen.getByText("91% match")).toBeInTheDocument();
  });

  it("passes the query and the selected index through", async () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    render(<SemanticSearch onSearch={onSearch} />);

    search("late payment");

    await waitFor(() =>
      expect(onSearch).toHaveBeenCalledWith("late payment", "all"),
    );
  });

  it("reports zero results as zero", async () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    render(<SemanticSearch onSearch={onSearch} />);

    search();

    expect(await screen.findByText("Found 0 results")).toBeInTheDocument();
    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });

  it("says the search failed rather than showing anything in its place", async () => {
    const onSearch = jest.fn().mockRejectedValue(new Error("index offline"));
    render(<SemanticSearch onSearch={onSearch} />);

    search();

    expect(await screen.findByText(/The search failed/)).toBeInTheDocument();
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it("renders the indexes it was given", () => {
    render(
      <SemanticSearch
        indexes={[
          {
            id: "guides",
            name: "Guides",
            documentCount: 3,
            lastUpdated: "2026-08-01",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("option", { name: "Guides (3)" }),
    ).toBeInTheDocument();
  });

  it("does not search on an empty query", () => {
    const onSearch = jest.fn();
    render(<SemanticSearch onSearch={onSearch} />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("honours a custom placeholder and className", () => {
    const { container } = render(
      <SemanticSearch placeholder="Ask a question" className="custom-class" />,
    );

    expect(screen.getByPlaceholderText("Ask a question")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
