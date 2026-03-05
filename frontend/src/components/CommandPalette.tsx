import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

type SearchItem = {
  kind: "request" | "user" | "event";
  id: string;
  title: string;
  subtitle?: string;
  meta?: any;
};

type ActionId = "offer" | "requeue" | "cancel";

const RECENT_KEY = "hc_recent_search";

function iconForKind(kind: string): string {
  if (kind === "request") return "📋";
  if (kind === "user") return "👤";
  return "⚡";
}

function prettyKind(kind: string): string {
  if (kind === "request") return "Request";
  if (kind === "user") return "User";
  return "Event";
}

function loadRecent(): SearchItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: SearchItem) {
  const existing = loadRecent();
  const next = [item, ...existing.filter((x) => !(x.kind === item.kind && x.id === item.id))].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette({
  open,
  onClose,
  onSearchSelect,
  contextRequestId,
}: {
  open: boolean;
  onClose: () => void;
  onSearchSelect?: (item: SearchItem) => void;
  contextRequestId?: string | null;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<SearchItem[]>([]);

  // Manual Offer
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [proId, setProId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus when opened
  useEffect(() => {
    if (!open) return;
    setQ("");
    setItems([]);
    setActive(0);
    setMsg("");
    setRecent(loadRecent());
    setProId("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // click outside closes
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  // Load professionals once per open (for manual offer)
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = (await api.getAllProfessionals()) as any;
        setProfessionals(res?.data || []);
      } catch {
        setProfessionals([]);
      }
    })();
  }, [open]);

  const proOptions = useMemo(() => {
    return (professionals || [])
      .filter((p: any) => (p.isActive ?? true) === true)
      .filter((p: any) => ["nurse", "doctor"].includes(String(p.role).toLowerCase()))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  }, [professionals]);

  // Debounced global search in palette
  useEffect(() => {
    if (!open) return;
    const query = q.trim();

    if (!query) {
      setItems([]);
      setLoading(false);
      setActive(0);
      return;
    }

    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = (await api.searchGlobal(query, 10)) as any;
        const results = (res?.data?.results || []) as SearchItem[];
        setItems(results);
        setActive(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [q, open]);

  const runAction = async (id: ActionId) => {
    if (!contextRequestId) {
      setMsg("Select a request first (open a request drawer), then use actions.");
      return;
    }

    try {
      setBusy(true);
      setMsg("");

      if (id === "offer") {
        if (!proId) {
          setMsg("Select a nurse/doctor first.");
          return;
        }
        await api.offerToProfessional(contextRequestId, proId);
        setMsg("✅ Offer sent (3 min expiry).");
      }

      if (id === "requeue") {
        await api.requeueRequest(contextRequestId);
        setMsg("✅ Request requeued.");
      }

      if (id === "cancel") {
        await api.cancelRequest(contextRequestId);
        setMsg("✅ Request cancelled.");
      }
    } catch (e: any) {
      setMsg(e?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const selectItem = (it: SearchItem) => {
    saveRecent(it);
    onSearchSelect?.(it);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(0, items.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) selectItem(it);
      return;
    }
  };

  if (!open) return null;

  return (
    <div className="cpOverlay" role="presentation">
      <div className="cpPanel" ref={wrapRef} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cpTop">
          <div>
            <div className="cpTitle">Command Palette</div>
            <div className="cpSubtitle">Search + quick actions</div>
          </div>
          <button className="cpClose" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cpSearchRow">
          <input
            ref={inputRef}
            className="input cpInput"
            placeholder="Search requests, users, events…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="cpKbd">Ctrl K</div>
        </div>

        <div className="cpActions">
          <div className="cpActionGroup">
            <div className="cpActionLabel">Manual Offer</div>
            <div className="cpActionRow">
              <select
                className="select cpSelect"
                value={proId}
                onChange={(e) => setProId(e.target.value)}
                disabled={busy}
              >
                <option value="">Select nurse/doctor…</option>
                {proOptions.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              <button className="btn" disabled={busy || !proId} onClick={() => runAction("offer")}>
                {busy ? "..." : "Offer"}
              </button>
            </div>
          </div>

          <div className="cpActionRow2">
            <button className="btn" disabled={busy} onClick={() => runAction("requeue")}>
              Requeue
            </button>
            <button className="btn btnDanger" disabled={busy} onClick={() => runAction("cancel")}>
              Cancel
            </button>
          </div>

          {msg ? <div className="cpMsg">{msg}</div> : null}
        </div>

        <div className="cpList" role="listbox">
          {loading ? (
            <div className="cpEmpty">Searching…</div>
          ) : q.trim().length === 0 ? (
            recent.length === 0 ? (
              <div className="cpEmpty">Type to search…</div>
            ) : (
              <>
                <div className="cpSectionLabel">Recent</div>
                {recent.map((it, idx) => (
                  <button
                    key={`${it.kind}:${it.id}`}
                    className={idx === active ? "cpItem cpItem-active" : "cpItem"}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectItem(it)}
                    role="option"
                    aria-selected={idx === active}
                  >
                    <div className="cpItemTop">
                      <span className="cpItemIcon" aria-hidden="true">{iconForKind(it.kind)}</span>
                      <span className={`searchTag tag-${it.kind}`}>{prettyKind(it.kind)}</span>
                      <span className="cpItemTitle">{it.title}</span>
                    </div>
                    {it.subtitle ? <div className="cpItemSub muted">{it.subtitle}</div> : null}
                  </button>
                ))}
              </>
            )
          ) : items.length === 0 ? (
            <div className="cpEmpty">No results for "{q}"</div>
          ) : (
            <>
              <div className="cpSectionLabel">Results</div>
              {items.map((it, idx) => (
                <button
                  key={`${it.kind}:${it.id}`}
                  className={idx === active ? "cpItem cpItem-active" : "cpItem"}
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectItem(it)}
                  role="option"
                  aria-selected={idx === active}
                >
                  <div className="cpItemTop">
                    <span className="cpItemIcon" aria-hidden="true">{iconForKind(it.kind)}</span>
                    <span className={`searchTag tag-${it.kind}`}>{prettyKind(it.kind)}</span>
                    <span className="cpItemTitle">{it.title}</span>
                  </div>
                  {it.subtitle ? <div className="cpItemSub muted">{it.subtitle}</div> : null}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="cpFooter">
          <span className="muted">Esc to close • ↑ ↓ Enter to select</span>
        </div>
      </div>
    </div>
  );
}