import { useMemo, useState } from 'react';
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

function getPrimaryRowAction(
  request: CareRequest,
  onOffer?: (requestId: string) => Promise<void>,
  onRequeue?: (requestId: string) => Promise<void>
) {
  const status = String(request.status || '').toLowerCase();

  if (status === 'queued' && onOffer) {
    return {
      label: 'More',
      disabled: false,
      onClick: () => void onOffer(request.id),
    };
  }

  if (!['completed', 'cancelled'].includes(status) && onRequeue) {
    return {
      label: 'More',
      disabled: false,
      onClick: () => void onRequeue(request.id),
    };
  }

  return {
    label: 'More',
    disabled: false,
    onClick: () => undefined,
  };
}

export function DispatchQueueTable({
  requests,
  onView,
  onOpenThread,
  onOffer,
  onRequeue,
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

      <div className="queueDesktopList" aria-label="Request queue desktop list">
        <div className="queueDesktopHeader" role="row">
          <div className="queueDesktopHeaderCell">Request</div>
          <div className="queueDesktopHeaderCell">Urgency</div>
          <div className="queueDesktopHeaderCell">Status</div>
          <div className="queueDesktopHeaderCell">Scheduled</div>
          <div className="queueDesktopHeaderCell">Owner</div>
          <div className="queueDesktopHeaderCell">Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No requests match your filters.</div>
        ) : (
          filtered.slice(0, 20).map((r) => {
            const primaryAction = getPrimaryRowAction(r, onOffer, onRequeue);
            return (
              <article key={r.id} className="queueDesktopRow">
                <div className="queueDesktopCell queueDesktopCell-request">
                  <div className="requestQueueRequestCell reqMain">
                    <div className="requestQueueRequestTitleRow reqTitleRow">
                      <div className="requestQueueRequestTitle reqTitle">
                        {r.description || r.serviceType}
                      </div>
                      <span className="requestQueueInlineId reqId mono">{r.id.slice(0, 8)}</span>
                    </div>
                    <div className="requestQueueRequestMeta reqMeta">
                      <span className="reqMetaItem">{String(r.serviceType).replace(/_/g, ' ')}</span>
                      <span className="dotSep" aria-hidden="true">|</span>
                      <span className="reqMetaItem">{r.address}</span>
                    </div>
                  </div>
                </div>

                <div className="queueDesktopCell">
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
                </div>

                <div className="queueDesktopCell">
                  <span className={statusPill(r.status)}>{String(r.status).toUpperCase()}</span>
                </div>

                <div className="queueDesktopCell queueDesktopValue">{formatDate(r.scheduledDateTime)}</div>

                <div className="queueDesktopCell">
                  {r.assignedProfessionalId ? (
                    <span className="chip mono">{r.assignedProfessionalId.slice(0, 8)}</span>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </div>

                <div className="queueDesktopCell queueDesktopActions requestQueueActions queueActions">
                  <button className="btn btn-small" onClick={() => onView(r)}>
                    View
                  </button>

                  <button
                    className="btn btn-small btn-ghost"
                    type="button"
                    onClick={() => onOpenThread?.(r.id)}
                  >
                    Chat
                  </button>

                  <button
                    className="btn btn-small btn-ghost"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    aria-disabled={primaryAction.disabled}
                  >
                    {primaryAction.label}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="queueMobileList" aria-label="Dispatch queue mobile cards">
        {filtered.length === 0 ? (
          <div className="empty">No requests match your filters.</div>
        ) : (
          filtered.slice(0, 20).map((r) => (
            <article key={`mobile-${r.id}`} className="queueMobileCard">
              <div className="queueMobileTop">
                <div className="requestQueueRequestCell reqMain">
                  <div className="requestQueueRequestTitleRow reqTitleRow">
                    <div className="requestQueueRequestTitle reqTitle">{r.description || r.serviceType}</div>
                    <span className="requestQueueInlineId reqId mono">{r.id.slice(0, 8)}</span>
                  </div>
                  <div className="requestQueueRequestMeta reqMeta">
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
              </div>

              <div className="queueMobileActions">
                {(() => {
                  const primaryAction = getPrimaryRowAction(r, onOffer, onRequeue);
                  return (
                    <>
                      <button className="btn btn-small" onClick={() => onView(r)}>
                        View
                      </button>
                      <button
                        className="btn btn-small btn-ghost"
                        type="button"
                        onClick={() => onOpenThread?.(r.id)}
                      >
                        Chat
                      </button>
                      <button
                        className="btn btn-small btn-ghost"
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                        aria-disabled={primaryAction.disabled}
                      >
                        {primaryAction.label}
                      </button>
                    </>
                  );
                })()}
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
