import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, RotateCcw, Ban, Send, UserRound, ClipboardList } from "lucide-react";
import { api } from "../services/api";
import type { CareRequest } from "../types";

type PaletteItem =
  | { kind: "action"; id: string; title: string; subtitle?: string; icon?: React.ReactNode; run: () => Promise<void> | void; disabled?: boolean }
  | { kind: "request"; id: string; title: string; subtitle?: string; icon?: React.ReactNode; requestId: string };

type Props = {
  open: boolean;
  onClose: () => void;

  // current context
  activeRequest?: CareRequest | null;
  onOpenRequest?: (requestId: string) => void; // opens drawer
  onRefresh?: () => void;

  // optional: request list for searching locally (nice UX)
  requests?: CareRequest[];
  professionals?: { id: string; name: string; role: string; isActive?: boolean }[];
};

export function CommandPalette({
  open,
  onClose,
  activeRequest,
  onOpenRequest,
  onRefresh,
  requests = [],
  professionals = [],
}: Props) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Manual offer state inside palette
  const [proId, setProId] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setToast("");
      setActiveIdx(0);
      setProId("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // click outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  const canOffer = useMemo(() => {
    const s = String(activeRequest?.status || "").toLowerCase();
    return !!activeRequest && (s === "queued" || s === "offered");
  }, [activeRequest]);

  const canCancel = useMemo(() => {
    const s = String(activeRequest?.status || "").toLowerCase();
    return !!activeRequest && (s === "queued" || s === "offered");
  }, [activeRequest]);

  const canRequeue = useMemo(() => {
    const s = String(activeRequest?.status || "").toLowerCase();
    return !!activeRequest && ["offered", "accepted", "en_route"].includes(s);
  }, [activeRequest]);

  const proOptions = useMemo(() => {
    return (professionals || [])
      .filter((p: any) => (p.isActive ?? true) === true)
      .filter((p) => ["nurse", "doctor"].includes(String(p.role).toLowerCase()))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [professionals]);

  const runSafe = async (fn: () => Promise<void> | void) => {
    try {
      setBusy(true);
      setToast("");
      await fn();
      onRefresh?.();
    } catch (e: any) {
      setToast(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actions: PaletteItem[] = [
    {
      kind: "action",
      id: "requeue",
      title: "Requeue request",
      subtitle: "Moves request back to queued",
      icon: <RotateCcw size={16} />,
      disabled: !canRequeue || busy,
      run: () => runSafe(async () => {
        if (!activeRequest) return;
        await api.requeueRequest(activeRequest.id);
        setToast("✅ Requeued");
      }),
    },
    {
      kind: "action",
      id: "cancel",
      title: "Cancel request",
      subtitle: "Sets status to cancelled",
      icon: <Ban size={16} />,
      disabled: !canCancel || busy,
      run: () => runSafe(async () => {
        if (!activeRequest) return;
        await api.cancelRequest(activeRequest.id);
        setToast("✅ Cancelled");
      }),
    },
    {
      kind: "action",
      id: "offer",
      title: "Send manual offer",
      subtitle: "Offer to selected nurse/doctor (3 min expiry)",
      icon: <Send size={16} />,
      disabled: !canOffer || busy || !proId,
      run: () => runSafe(async () => {
        if (!activeRequest || !proId) return;
        await api.offerToProfessional(activeRequest.id, proId);
        setToast("✅ Offer sent");
      }),
    },
  ];

  const requestHits: PaletteItem[] = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return (requests || [])
      .filter((r) => {
        const hay = [
          r.id,
          r.description,
          r.address,
          r.serviceType,
          r.clientId,
          r.assignedProfessionalId,
          r.status,
          r.urgency,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 8)
      .map((r) => ({
        kind: "request",
        id: r.id,
        requestId: r.id,
        title: r.description || String(r.serviceType),
        subtitle: `${String(r.status).toUpperCase()} • ${String(r.urgency).toUpperCase()} • ${r.address}`,
        icon: <ClipboardList size={16} />,
      }));
  }, [q, requests]);

  const items: PaletteItem[] = useMemo(() => {
    // If user typed, show matches first, then actions
    if (q.trim()) return [...requestHits, ...actions];
    return actions;
  }, [q, requestHits, actions]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[activeIdx];
      if (!it) return;
      if (it.kind === "request") {
        onOpenRequest?.(it.requestId);
        onClose();
      } else {
        if (!it.disabled) it.run();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="cpOverlay" aria-hidden={!open}>
      <div className="cpPanel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cpHeader">
          <div className="cpTitle">
            <span className="cpIcon"><Search size={16} /></span>
            <div>
              <div className="cpTitleMain">Command Palette</div>
              <div className="cpTitleSub">Search + quick actions</div>
            </div>
          </div>

          <button className="cpClose" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="cpBody">
          <div className="cpSearchRow">
            <input
              ref={inputRef}
              className="input cpInput"
              placeholder="Type to search requests… (or use actions below)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDownInput}
            />

            <div className="cpKbd">Esc</div>
          </div>

          {/* Manual Offer selector (only shows if an active request exists) */}
          {activeRequest && (
            <div className="cpInline">
              <div className="cpInlineLabel">
                <UserRound size={14} /> Manual Offer
              </div>

              <select
                className="select cpSelect"
                value={proId}
                onChange={(e) => setProId(e.target.value)}
                disabled={!canOffer || busy}
              >
                <option value="">Select nurse/doctor…</option>
                {proOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>

              <button
                className="btn"
                disabled={!canOffer || busy || !proId}
                onClick={() => runSafe(async () => {
                  if (!activeRequest || !proId) return;
                  await api.offerToProfessional(activeRequest.id, proId);
                  setToast("✅ Offer sent");
                })}
              >
                {busy ? "Working…" : "Send"}
              </button>
            </div>
          )}

          <div className="cpList" role="listbox">
            {items.map((it, idx) => {
              const active = idx === activeIdx;
              if (it.kind === "request") {
                return (
                  <button
                    key={`req:${it.id}`}
                    className={active ? "cpItem cpItem-active" : "cpItem"}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onOpenRequest?.(it.requestId); onClose(); }}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="cpItemIcon">{it.icon}</span>
                    <span className="cpItemText">
                      <span className="cpItemTitle">{it.title}</span>
                      <span className="cpItemSub">{it.subtitle}</span>
                    </span>
                    <span className="cpPill">Open</span>
                  </button>
                );
              }

              return (
                <button
                  key={`act:${it.id}`}
                  className={[
                    "cpItem",
                    active ? "cpItem-active" : "",
                    it.disabled ? "cpItem-disabled" : "",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !it.disabled && it.run()}
                  role="option"
                  aria-selected={active}
                  disabled={!!it.disabled}
                >
                  <span className="cpItemIcon">{it.icon}</span>
                  <span className="cpItemText">
                    <span className="cpItemTitle">{it.title}</span>
                    <span className="cpItemSub">{it.subtitle}</span>
                  </span>
                  <span className="cpPill">Run</span>
                </button>
              );
            })}
          </div>

          {toast ? <div className="cpToast">{toast}</div> : null}
        </div>

        <div className="cpFooter">
          <span className="muted">Tip:</span> <span className="cpFooterKbd">Ctrl</span>+<span className="cpFooterKbd">K</span> to open
          <span className="cpDot">•</span>
          <span className="muted">↑ ↓ Enter</span>
        </div>
      </div>
    </div>
  );
}
