'use client';

/**
 * Semantic Search Component
 * 
 * Provides semantic search functionality using text embeddings and vector similarity.
 * Integrates with AIML API for embedding generation.
 */

import { useState, useCallback } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  highlights?: string[];
}

export interface DocumentIndex {
  id: string;
  name: string;
  documentCount: number;
  lastUpdated: string;
}

interface SemanticSearchProps {
  indexes?: DocumentIndex[];
  onSearch?: (query: string, indexId?: string) => Promise<SearchResult[]>;
  placeholder?: string;
  className?: string;
}

// Sample results for demonstration
const SAMPLE_RESULTS: SearchResult[] = [
  { id: '1', title: 'FCRA Rights and Dispute Process', content: 'The Fair Credit Reporting Act (FCRA) gives you the right to dispute inaccurate information on your credit report...', similarity: 0.95, highlights: ['dispute', 'credit report'] },
  { id: '2', title: 'How to Write an Effective Dispute Letter', content: 'When writing a dispute letter to a credit bureau, be specific about the item you are disputing...', similarity: 0.89, highlights: ['dispute letter', 'credit bureau'] },
  { id: '3', title: 'Understanding Credit Score Factors', content: 'Your credit score is calculated based on five main factors: payment history, credit utilization...', similarity: 0.82, highlights: ['credit score', 'payment history'] },
  { id: '4', title: 'Dealing with Collection Agencies', content: 'If you have a collection account on your credit report, you have several options for dispute and removal...', similarity: 0.78, highlights: ['collection', 'removal'] },
];

const SAMPLE_INDEXES: DocumentIndex[] = [
  { id: 'all', name: 'All Documents', documentCount: 1250, lastUpdated: '2024-01-15' },
  { id: 'disputes', name: 'Dispute Templates', documentCount: 45, lastUpdated: '2024-01-14' },
  { id: 'laws', name: 'Credit Laws & Regulations', documentCount: 120, lastUpdated: '2024-01-10' },
  { id: 'guides', name: 'User Guides', documentCount: 85, lastUpdated: '2024-01-12' },
];

export default function SemanticSearch({
  indexes = SAMPLE_INDEXES,
  onSearch,
  placeholder = 'Search documents using natural language...',
  className = '',
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);

    try {
      if (onSearch) {
        const searchResults = await onSearch(query, selectedIndex);
        setResults(searchResults);
      } else {
        // Simulate search with sample data
        await new Promise(resolve => setTimeout(resolve, 800));
        const filtered = SAMPLE_RESULTS.filter(r =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.content.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.length > 0 ? filtered : SAMPLE_RESULTS);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedIndex, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-100';
    if (similarity >= 0.8) return 'text-blue-600 bg-blue-100';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Semantic Search</h3>
      
      {/* Search Input */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          {indexes.map(index => (
            <option key={index.id} value={index.id}>{index.name} ({index.documentCount})</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {isSearching ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
          </p>
          
          {results.map(result => (
            <div key={result.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">{result.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2">{result.content}</p>
                  {result.highlights && result.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.highlights.map((h, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">{h}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${getSimilarityColor(result.similarity)}`}>
                  {(result.similarity * 100).toFixed(0)}% match
                </span>
              </div>
            </div>
          ))}

          {results.length === 0 && !isSearching && (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-1">Try different keywords or search in a different index</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-8 text-gray-400 dark:text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p>Enter a question or topic to search</p>
          <p className="text-sm mt-1">Uses AI to find semantically relevant results</p>
        </div>
      )}
    </div>
  );
}

