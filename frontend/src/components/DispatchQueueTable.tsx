import { useEffect, useMemo, useState } from 'react';
import { CareRequest } from '../types/index';
import { UrgencyQuickSet } from './UrgencyQuickSet';

type Props = {
  requests: CareRequest[];
  onView: (r: CareRequest) => void;
  onOpenThread?: (requestId: string) => void;
  onOffer?: (requestId: string) => Promise<void>;
  onRequeue?: (requestId: string) => Promise<void>;
  onCancel?: (requestId: string) => Promise<void>;
  onSetUrgency?: (requestId: string, urgency: string) => Promise<void>;
  search: string;
  onSearchChange: (q: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  urgencyFilter?: string;
  onUrgencyFilterChange?: (value: string) => void;
  hideToolbar?: boolean;
};

function formatDate(dt: any) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function statusPill(status: string) {
  const s = String(status || '').toLowerCase();
  if (s.includes('queued')) return 'pill pill-queued';
  if (s.includes('offered')) return 'pill pill-offered';
  if (s.includes('assigned')) return 'pill pill-assigned';
  if (s.includes('accepted')) return 'pill pill-accepted';
  if (s.includes('en_route') || s.includes('en route')) return 'pill pill-enroute';
  if (s.includes('completed')) return 'pill pill-completed';
  if (s.includes('cancel')) return 'pill pill-cancelled';
  return 'pill';
}

function urgencyPill(u: string) {
  const v = String(u || '').toLowerCase();
  if (v === 'critical') return 'pill pill-urg-critical';
  if (v === 'high') return 'pill pill-urg-high';
  if (v === 'medium') return 'pill pill-urg-med';
  return 'pill pill-urg-low';
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
  if (!expiresAt) return <span className="muted">-</span>;
  if (ms <= 0) return <span className="pill pill-expired">Expired</span>;
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  const danger = ms <= 60_000;
  return <span className={danger ? 'countdown countdown-danger' : 'countdown'}>{m}:{s}</span>;
}

export function DispatchQueueTable({
  requests,
  onView,
  onOpenThread,
  onOffer,
  onRequeue,
  onCancel,
  onSetUrgency,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
  hideToolbar = false,
}: Props) {
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all');
  const [internalUrgencyFilter, setInternalUrgencyFilter] = useState<string>('all');
  const activeStatusFilter = statusFilter ?? internalStatusFilter;
  const activeUrgencyFilter = urgencyFilter ?? internalUrgencyFilter;
  const updateStatusFilter = onStatusFilterChange ?? setInternalStatusFilter;
  const updateUrgencyFilter = onUrgencyFilterChange ?? setInternalUrgencyFilter;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests || [])
      .filter((r) => {
        if (activeStatusFilter !== 'all' && String(r.status).toLowerCase() !== activeStatusFilter) return false;
        if (activeUrgencyFilter !== 'all' && String(r.urgency).toLowerCase() !== activeUrgencyFilter) return false;
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
          .join(' ')
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
  }, [requests, activeStatusFilter, activeUrgencyFilter, search]);

  return (
    <div className="queue-card">
      {!hideToolbar ? (
        <div className="queueHeader">
          <div className="queueTools" role="toolbar" aria-label="Dispatch queue filters">
            <div className="searchField">
              <span className="searchIcon" aria-hidden="true">?</span>
              <input
                className="input inputSearch"
                placeholder="Search service, address, client, ID..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search requests"
              />
              {search?.trim() ? (
                <button
                  type="button"
                  className="clearBtn"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  title="Clear"
                >
                  x
                </button>
              ) : null}
            </div>

            <div className="filterPills">
              <select
                className="select selectPill"
                value={activeStatusFilter}
                onChange={(e) => updateStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">Status: All</option>
                <option value="queued">Status: Queued</option>
                <option value="offered">Status: Offered</option>
                <option value="accepted">Status: Accepted</option>
                <option value="en_route">Status: En Route</option>
                <option value="completed">Status: Completed</option>
                <option value="cancelled">Status: Cancelled</option>
              </select>

              <select
                className="select selectPill"
                value={activeUrgencyFilter}
                onChange={(e) => updateUrgencyFilter(e.target.value)}
                aria-label="Filter by urgency"
              >
                <option value="all">Urgency: All</option>
                <option value="low">Urgency: Low</option>
                <option value="medium">Urgency: Medium</option>
                <option value="high">Urgency: High</option>
                <option value="critical">Urgency: Critical</option>
              </select>
            </div>

            <div className="queueStatusBadge">
              Showing: <b>{activeStatusFilter === 'all' ? 'ALL' : activeStatusFilter.replace('_', ' ').toUpperCase()}</b>
            </div>
          </div>
        </div>
      ) : null}

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
              <th className="actionsHeader">Actions</th>
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
                    <div className="reqMain">
                      <div className="reqTitleRow">
                        <div className="reqTitle">{r.description || r.serviceType}</div>
                        <span className="reqId mono">{r.id.slice(0, 8)}</span>
                      </div>
                      <div className="reqMeta">
                        <span className="reqMetaItem">{String(r.serviceType).replace(/_/g, ' ')}</span>
                        <span className="dotSep" aria-hidden="true">|</span>
                        <span className="reqMetaItem">{r.address}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="urgencyCell">
                      <span className={`urgencyDot urgency-${String(r.urgency).toLowerCase()}`} />
                      {onSetUrgency ? (
                        <UrgencyQuickSet
                          requestId={r.id}
                          currentUrgency={r.urgency || 'low'}
                          onSetUrgency={onSetUrgency}
                        />
                      ) : (
                        <span className={urgencyPill(r.urgency)}>{String(r.urgency).toUpperCase()}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className={statusPill(r.status)}>{String(r.status).toUpperCase()}</span>
                  </td>

                  <td className="nowrap">{formatDate(r.scheduledDateTime)}</td>

                  <td>
                    {r.assignedProfessionalId ? (
                      <span className="chip mono">{r.assignedProfessionalId.slice(0, 8)}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>

                  <td>
                    <Countdown expiresAt={(r as any).offerExpiresAt} />
                  </td>

                  <td className="actionsCell queueActions">
                    <div className="actionsRow">
                      <button className="btn btn-small" onClick={() => onView(r)}>
                        View
                      </button>

                      <button
                        className="btn btn-small btn-ghost"
                        type="button"
                        onClick={() => onOpenThread?.(r.id)}
                      >
                        Thread
                      </button>

                      <button
                        className="btn btn-small btn-ghost"
                        onClick={() => {
                          if (onOffer) onOffer(r.id);
                        }}
                        disabled={!['queued'].includes(String(r.status).toLowerCase())}
                        aria-disabled={!['queued'].includes(String(r.status).toLowerCase())}
                      >
                        Offer
                      </button>

                      <button
                        className="btn btn-small btn-ghost"
                        onClick={() => {
                          if (onRequeue) onRequeue(r.id);
                        }}
                        disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                        aria-disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                      >
                        Requeue
                      </button>

                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => {
                          if (onCancel) onCancel(r.id);
                        }}
                        disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                        aria-disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="queueMobileList" aria-label="Dispatch queue mobile cards">
        {filtered.length === 0 ? (
          <div className="empty">No requests match your filters.</div>
        ) : (
          filtered.slice(0, 20).map((r) => (
            <article key={`mobile-${r.id}`} className="queueMobileCard">
              <div className="queueMobileTop">
                <div className="reqMain">
                  <div className="reqTitleRow">
                    <div className="reqTitle">{r.description || r.serviceType}</div>
                    <span className="reqId mono">{r.id.slice(0, 8)}</span>
                  </div>
                  <div className="reqMeta">
                    <span className="reqMetaItem">{String(r.serviceType).replace(/_/g, ' ')}</span>
                    <span className="dotSep" aria-hidden="true">|</span>
                    <span className="reqMetaItem">{r.address}</span>
                  </div>
                </div>
              </div>

              <div className="queueMobileMetaGrid">
                <div className="queueMobileMetaItem">
                  <span className="queueMobileMetaLabel">Urgency</span>
                  <span className={urgencyPill(r.urgency)}>{String(r.urgency).toUpperCase()}</span>
                </div>
                <div className="queueMobileMetaItem">
                  <span className="queueMobileMetaLabel">Status</span>
                  <span className={statusPill(r.status)}>{String(r.status).toUpperCase()}</span>
                </div>
                <div className="queueMobileMetaItem">
                  <span className="queueMobileMetaLabel">Scheduled</span>
                  <span>{formatDate(r.scheduledDateTime)}</span>
                </div>
                <div className="queueMobileMetaItem">
                  <span className="queueMobileMetaLabel">Offer Expires</span>
                  <Countdown expiresAt={(r as any).offerExpiresAt} />
                </div>
              </div>

              <div className="queueMobileActions">
                <button className="btn btn-small" onClick={() => onView(r)}>
                  View
                </button>
                <button
                  className="btn btn-small btn-ghost"
                  type="button"
                  onClick={() => onOpenThread?.(r.id)}
                >
                  Thread
                </button>
                <button
                  className="btn btn-small btn-ghost"
                  onClick={() => {
                    if (onOffer) onOffer(r.id);
                  }}
                  disabled={!['queued'].includes(String(r.status).toLowerCase())}
                  aria-disabled={!['queued'].includes(String(r.status).toLowerCase())}
                >
                  Offer
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    if (onCancel) onCancel(r.id);
                  }}
                  disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                  aria-disabled={['completed', 'cancelled'].includes(String(r.status).toLowerCase())}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="queue-footer muted">
        Showing {Math.min(filtered.length, 20)} of {filtered.length} requests
      </div>
    </div>
  );
}
