import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

type SearchItem = {
  kind: 'request' | 'user' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  meta?: any;
};

export function CommandBar({
  stats,
  isConnected,
  onSearchSelect,
  searchScope = 'admin',
}: {
  stats?: any;
  isConnected?: boolean;
  onSearchSelect?: (item: SearchItem) => void;
  searchScope?: 'admin';
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounced search
  useEffect(() => {
    const query = q.trim();

    if (!query) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setActive(0);
      return;
    }

    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        if (searchScope === 'admin') {
          const res = (await api.searchGlobal(query, 10)) as any; // { success, data: { results } }
          const results = (res?.data?.results || []) as SearchItem[];
          setItems(results);
          setOpen(true);
          setActive(0);
        }
      } catch (e) {
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [q, searchScope]);

  // Click outside to close
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const hasResults = open && (items.length > 0 || loading);

  const selectItem = (it: SearchItem) => {
    setOpen(false);
    setQ('');
    onSearchSelect?.(it);
  };

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasResults) {
      if (e.key === 'Escape') {
        setQ('');
      }
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[active];
      if (it) selectItem(it);
    }
  };

  const liveText = isConnected ? 'Live' : 'Offline';

  return (
    <div className="commandBarWrapper" ref={wrapRef}>
      <div className="commandBar">
        <div className="commandInner">
          <div className="commandLeft">
            <span
              className={isConnected ? 'liveDot liveDot-on' : 'liveDot'}
              aria-hidden="true"
            />
            <span className="muted">{liveText}</span>
          </div>

          <div className="commandSearch">
            <input
              ref={inputRef}
              className="input commandSearchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search requests, users, activity…"
              onKeyDown={onKeyDown}
              onFocus={() => {
                if (q.trim()) setOpen(true);
              }}
              aria-label="Global search"
              aria-expanded={hasResults}
              aria-controls="global-search-results"
              role="combobox"
            />

            {hasResults && (
              <div className="searchMenu" id="global-search-results" role="listbox">
                {loading ? (
                  <div className="searchEmpty">Searching…</div>
                ) : items.length === 0 ? (
                  <div className="searchEmpty">No results for "{q}"</div>
                ) : (
                  items.map((it, idx) => (
                    <button
                      key={`${it.kind}:${it.id}`}
                      className={idx === active ? 'searchItem searchItem-active' : 'searchItem'}
                      onMouseEnter={() => setActive(idx)}
                      onMouseDown={(e) => e.preventDefault()} // keep focus
                      onClick={() => selectItem(it)}
                      role="option"
                      aria-selected={idx === active}
                    >
                      <div className="searchItemTop">
                        <span className={`searchTag tag-${it.kind}`}>
                          {it.kind.toUpperCase()}
                        </span>
                        <span className="searchTitle">{it.title}</span>
                      </div>
                      {it.subtitle ? (
                        <div className="searchSub muted">{it.subtitle}</div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Optional: show small stat pills on the right */}
          <div className="commandRight">
            {stats ? (
              <>
                <span className="pillSoft">
                  Queued <b>{stats.queuedRequests}</b>
                </span>
                <span className="pillSoft">
                  Offered <b>{stats.offeredRequests}</b>
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
