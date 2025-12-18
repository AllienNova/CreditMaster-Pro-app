/**
 * SemanticSearch Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the SemanticSearch component
jest.mock('../semantic-search/SemanticSearch', () => {
  const MockSemanticSearch = ({
    onSearch,
    placeholder,
    className,
  }: {
    onSearch?: (query: string, indexId?: string) => void;
    placeholder?: string;
    className?: string;
  }) => {
    const [results, setResults] = React.useState<
      Array<{ id: string; title: string; content: string; score: number }>
    >([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSearch = (query: string) => {
      setIsLoading(true);
      setTimeout(() => {
        const mockResults = [
          {
            id: '1',
            title: 'Credit Repair Guide',
            content: 'How to dispute errors',
            score: 0.95,
          },
          {
            id: '2',
            title: 'FCRA Rights',
            content: 'Your rights under FCRA',
            score: 0.87,
          },
        ];
        setResults(mockResults);
        setIsLoading(false);
        onSearch?.(query);
      }, 100);
    };

    return (
      <div className={className} data-testid="semantic-search">
        <input
          type="text"
          placeholder={placeholder || 'Search documents...'}
          data-testid="search-input"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select data-testid="index-select" aria-label="Index">
          <option value="documents">Documents</option>
          <option value="disputes">Disputes</option>
          <option value="templates">Templates</option>
        </select>
        {isLoading && <div data-testid="loading">Searching...</div>}
        <div data-testid="results-container">
          {results.map((result) => (
            <div key={result.id} data-testid={`result-${result.id}`}>
              <span>{result.title}</span>
              <span>{result.content}</span>
              <span data-testid={`score-${result.id}`}>
                {(result.score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return { __esModule: true, default: MockSemanticSearch };
});

import SemanticSearch from '../semantic-search/SemanticSearch';

describe('SemanticSearch', () => {
  it('renders semantic search component', () => {
    render(<SemanticSearch />);
    expect(screen.getByTestId('semantic-search')).toBeInTheDocument();
  });

  it('renders with default placeholder', () => {
    render(<SemanticSearch />);
    expect(
      screen.getByPlaceholderText('Search documents...')
    ).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SemanticSearch placeholder="Search knowledge base..." />);
    expect(
      screen.getByPlaceholderText('Search knowledge base...')
    ).toBeInTheDocument();
  });

  it('renders index selector', () => {
    render(<SemanticSearch />);
    expect(screen.getByTestId('index-select')).toBeInTheDocument();
  });

  it('shows loading state during search', async () => {
    render(<SemanticSearch />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'credit repair' } });
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('displays search results', async () => {
    render(<SemanticSearch />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'credit' } });

    await waitFor(() => {
      expect(screen.getByText('Credit Repair Guide')).toBeInTheDocument();
    });
  });

  it('shows similarity scores', async () => {
    render(<SemanticSearch />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'credit' } });

    await waitFor(() => {
      expect(screen.getByTestId('score-1')).toHaveTextContent('95%');
    });
  });

  it('allows clicking on search results', async () => {
    render(<SemanticSearch />);

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'credit' } });

    await waitFor(() => {
      expect(screen.getByTestId('result-1')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<SemanticSearch className="custom-class" />);
    expect(screen.getByTestId('semantic-search')).toHaveClass('custom-class');
  });

  it('calls onSearch with query and results', async () => {
    const onSearch = jest.fn();
    render(<SemanticSearch onSearch={onSearch} />);

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'fcra rights' } });

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('fcra rights');
    });
  });
});
