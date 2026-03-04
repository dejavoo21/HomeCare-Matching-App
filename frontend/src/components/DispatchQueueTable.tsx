import { useMemo, useState, useEffect } from "react";
import { CareRequest } from "../types/index";

type Props = {
  requests: CareRequest[];
  onView: (r: CareRequest) => void;
  onRequeue?: (requestId: string) => Promise<void>;
  onCancel?: (requestId: string) => Promise<void>;
  search: string;
  onSearchChange: (q: string) => void;
};

function formatDate(dt: any) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function statusPill(status: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("queued")) return "pill pill-queued";
  if (s.includes("offered")) return "pill pill-offered";
  if (s.includes("assigned")) return "pill pill-assigned";
  if (s.includes("accepted")) return "pill pill-accepted";
  if (s.includes("en_route") || s.includes("en route")) return "pill pill-enroute";
  if (s.includes("completed")) return "pill pill-completed";
  if (s.includes("cancel")) return "pill pill-cancelled";
  return "pill";
}

function urgencyPill(u: string) {
  const v = String(u || "").toLowerCase();
  if (v === "critical") return "pill pill-urg-critical";
  if (v === "high") return "pill pill-urg-high";
  if (v === "medium") return "pill pill-urg-med";
  return "pill pill-urg-low";
}

function useCountdown(expiresAtIso?: string) {
  const [ms, setMs] = useState<number>(() => {
    if (!expiresAtIso) return 0;
    return Math.max(0, new Date(expiresAtIso).getTime() - Date.now());
  });

  useEffect(() => {
    if (!expiresAtIso) return;
    const id = window.setInterval(() => {
      setMs(Math.max(0, new Date(expiresAtIso).getTime() - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAtIso]);

  return ms;
}

function Countdown({ expiresAt }: { expiresAt?: string }) {
  const ms = useCountdown(expiresAt);
  if (!expiresAt) return <span className="muted">—</span>;
  if (ms <= 0) return <span className="pill pill-expired">Expired</span>;
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  const danger = ms <= 60_000;
  return <span className={danger ? "countdown countdown-danger" : "countdown"}>{m}:{s}</span>;
}

export function DispatchQueueTable({ requests, onView, onRequeue, onCancel, search, onSearchChange }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests || [])
      .filter((r) => {
        if (statusFilter !== "all" && String(r.status).toLowerCase() !== statusFilter) return false;
        if (urgencyFilter !== "all" && String(r.urgency).toLowerCase() !== urgencyFilter) return false;
        if (!q) return true;

        const hay = [
          r.id,
          r.serviceType,
          r.address,
          r.description,
          r.clientId,
          r.assignedProfessionalId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      // newest first
      .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
  }, [requests, statusFilter, urgencyFilter, search]);

  return (
    <div className="queue-card">
      <div className="queue-header">
        <div>
          <h2 className="section-title">Dispatch Queue</h2>
          <p className="muted">Filter and manage requests in real time.</p>
        </div>

        <div className="queue-filters">
          <input
            className="input"
            placeholder="Search (service, address, client, ID)…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="offered">Offered</option>
            <option value="accepted">Accepted</option>
            <option value="en_route">En Route</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select className="select" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            <option value="all">All urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Assigned/Offered To</th>
              <th>Offer Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No requests match your filters.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 20).map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="req-main">
                      <div className="req-title">{r.description || r.serviceType}</div>
                      <div className="req-sub muted">
                        <span className="mono">{r.id.slice(0, 8)}</span> • {r.address}
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={urgencyPill(r.urgency)}>{String(r.urgency).toUpperCase()}</span>
                  </td>

                  <td>
                    <span className={statusPill(r.status)}>{String(r.status).toUpperCase()}</span>
                  </td>

                  <td className="nowrap">{formatDate(r.scheduledDateTime)}</td>

                  <td>
                    {r.assignedProfessionalId ? (
                      <span className="mono">{r.assignedProfessionalId.slice(0, 8)}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td>
                    {/* if your API includes offerExpiresAt on request, it will show. Otherwise it stays "—" */}
                    <Countdown expiresAt={(r as any).offerExpiresAt} />
                  </td>

                  <td className="actions">
                    <button className="btn btn-small" onClick={() => onView(r)}>
                      View
                    </button>

                    {onRequeue && ["offered", "accepted", "en_route"].includes(String(r.status).toLowerCase()) && (
                      <button className="btn btn-small btn-secondary" onClick={() => onRequeue(r.id)}>
                        Requeue
                      </button>
                    )}

                    {onCancel && ["queued", "offered"].includes(String(r.status).toLowerCase()) && (
                      <button className="btn btn-small btn-danger" onClick={() => onCancel(r.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="queue-footer muted">
        Showing {Math.min(filtered.length, 20)} of {filtered.length} requests
      </div>
    </div>
  );
}
