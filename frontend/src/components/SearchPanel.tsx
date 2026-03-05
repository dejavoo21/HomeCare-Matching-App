import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../services/api';

interface SearchResult {
  kind: 'request' | 'user' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  meta?: any;
}

interface SearchPanelProps {
  onSelectResult?: (result: SearchResult) => void;
}

export function SearchPanel({ onSelectResult }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.searchGlobal(query.trim(), 15) as any;
        const formattedResults = res?.data?.results || [];
        setResults(formattedResults);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (onSelectResult) onSelectResult(result);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search requests, users, events..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
          ) : (
            <div>
              {results.map((result) => (
                <button
                  key={`${result.kind}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-gray-500 mt-1">{result.subtitle}</div>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                      {result.kind}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
