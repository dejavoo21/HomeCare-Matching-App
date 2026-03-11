import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import RequestDetailDrawer from '../components/requests/RequestDetailDrawer';
import type { RequestWorkspaceTabKey } from '../components/requests/RequestWorkspaceTabs';
import { InsightCard } from '../components/InsightCard';
import PermissionNotice from '../components/auth/PermissionNotice';
import ProtectedAction from '../components/auth/ProtectedAction';
import { hasPermission } from '../lib/auth/access';
import { PERMISSIONS } from '../lib/auth/permissions';
import { useAuth } from '../contexts/AuthContext';
import type { CareRequest } from '../types/index';
import { normalizeRequestStatus } from '../shared/schema/normalize';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';
type Professional = {
  id: string;
  name: string;
  role: string;
  location?: string;
  isActive?: boolean;
  is_active?: boolean;
};

function severityScore(request: CareRequest) {
  const urgency = String(request.urgency || '').toLowerCase();
  const status = normalizeRequestStatus(String(request.status || ''));

  if (urgency === 'critical' && ['queued', 'offered'].includes(status)) return 0;
  if (status === 'queued') return 1;
  if (status === 'offered') return 2;
  if (status === 'accepted') return 3;
  if (status === 'en_route') return 4;
  return 8;
}

function formatShortTime(value: Date | string | undefined) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unscheduled'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatServiceType(value?: string) {
  return String(value || 'General care')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminDispatchPage() {
  const navigate = useNavigate();
  const { on } = useRealTime();
  const { user } = useAuth();

  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailDrawerTab, setDetailDrawerTab] = useState<RequestWorkspaceTabKey>('overview');

  const loadDispatch = useCallback(async () => {
    try {
      const reqs = (await api.getAllRequests()) as any;
      setRequests(reqs?.data || []);
    } catch (err) {
      console.error('Failed to load dispatch page:', err);
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    loadDispatch();
  }, [loadDispatch]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = (await api.getProfessionals()) as any;
        if (mounted) {
          setProfessionals(response?.data || []);
        }
      } catch (err) {
        console.error('Failed to load professionals for dispatch:', err);
        if (mounted) {
          setProfessionals([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubs = [
      on('REQUEST_CREATED', loadDispatch),
      on('REQUEST_STATUS_CHANGED', loadDispatch),
      on('OFFER_CREATED', loadDispatch),
      on('OFFER_ACCEPTED', loadDispatch),
      on('OFFER_DECLINED', loadDispatch),
      on('OFFER_EXPIRED', loadDispatch),
      on('VISIT_STATUS_CHANGED', loadDispatch),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [on, loadDispatch]);

  const counts = useMemo(
    () => ({
      queued: requests.filter((request) => String(request.status).toLowerCase() === 'queued').length,
      offered: requests.filter((request) => String(request.status).toLowerCase() === 'offered').length,
      accepted: requests.filter((request) => String(request.status).toLowerCase() === 'accepted').length,
      en_route: requests.filter((request) => String(request.status).toLowerCase() === 'en_route').length,
      completed: requests.filter((request) => String(request.status).toLowerCase() === 'completed').length,
      cancelled: requests.filter((request) => String(request.status).toLowerCase() === 'cancelled').length,
    }),
    [requests]
  );

  const dispatchMetrics = useMemo(() => {
    const now = Date.now();

    return {
      queuedNow: counts.queued,
      offersExpiring: requests.filter((request) => {
        if (String(request.status).toLowerCase() !== 'offered' || !request.offerExpiresAt) {
          return false;
        }

        const diff = new Date(request.offerExpiresAt).getTime() - now;
        return diff > 0 && diff <= 30 * 60 * 1000;
      }).length,
      criticalAtRisk: requests.filter((request) => {
        const urgency = String(request.urgency).toLowerCase();
        const status = String(request.status).toLowerCase();
        return urgency === 'critical' && ['queued', 'offered'].includes(status);
      }).length,
      assignedToday: requests.filter((request) => {
        const status = String(request.status).toLowerCase();
        if (!['accepted', 'en_route', 'completed'].includes(status) || !request.updatedAt) {
          return false;
        }

        const updated = new Date(request.updatedAt);
        const today = new Date();
        return (
          updated.getFullYear() === today.getFullYear() &&
          updated.getMonth() === today.getMonth() &&
          updated.getDate() === today.getDate()
        );
      }).length,
    };
  }, [counts.queued, requests]);

  const professionalMap = useMemo(() => {
    return new Map(
      professionals.map((professional) => [
        professional.id,
        {
          ...professional,
          isActive: professional.isActive ?? professional.is_active ?? true,
        },
      ])
    );
  }, [professionals]);

  const exceptionRequests = useMemo(() => {
    return [...requests]
      .filter((request) => {
        const status = normalizeRequestStatus(String(request.status || ''));
        const urgency = String(request.urgency || '').toLowerCase();
        return (
          ['queued', 'offered', 'accepted', 'en_route'].includes(status) ||
          ['critical', 'high'].includes(urgency)
        );
      })
      .sort((a, b) => {
        const severityDiff = severityScore(a) - severityScore(b);
        if (severityDiff !== 0) return severityDiff;

        const aScheduled = new Date(a.scheduledDateTime || 0).getTime();
        const bScheduled = new Date(b.scheduledDateTime || 0).getTime();
        return aScheduled - bScheduled;
      })
      .slice(0, 6);
  }, [requests]);

  useEffect(() => {
    setSelectedRequest((current) => {
      if (current) {
        return requests.find((request) => request.id === current.id) || null;
      }
      return exceptionRequests[0] || null;
    });
  }, [requests, exceptionRequests]);

  const activeClinicians = useMemo(() => {
    const loadMap = new Map<string, number>();

    requests.forEach((request) => {
      if (!request.assignedProfessionalId) return;
      const status = normalizeRequestStatus(String(request.status || ''));
      if (!['accepted', 'en_route', 'queued', 'offered'].includes(status)) return;
      loadMap.set(
        request.assignedProfessionalId,
        (loadMap.get(request.assignedProfessionalId) || 0) + 1
      );
    });

    return Array.from(loadMap.entries())
      .map(([professionalId, currentLoad]) => {
        const professional = professionalMap.get(professionalId);
        return {
          id: professionalId,
          name: professional?.name || `Professional ${professionalId.slice(0, 8)}`,
          region: professional?.location || 'Region not set',
          role: professional?.role || 'clinician',
          currentLoad,
          status: currentLoad >= 3 ? 'Busy' : 'Available',
        };
      })
      .sort((a, b) => b.currentLoad - a.currentLoad)
      .slice(0, 4);
  }, [professionalMap, requests]);

  const onRequeue = async (id: string) => {
    try {
      await api.requeueRequest(id);
      await loadDispatch();
    } catch (err) {
      console.error('Failed to requeue request:', err);
    }
  };

  const onCancel = async (id: string) => {
    try {
      await api.cancelRequest(id);
      await loadDispatch();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const selectedAssignedProfessional = selectedRequest?.assignedProfessionalId
    ? professionalMap.get(selectedRequest.assignedProfessionalId)
    : null;
  const canManageDispatch = hasPermission(user, PERMISSIONS.DISPATCH_MANAGE);

  return (
    <main className="pageStack dispatchPage" role="main" aria-label="Dispatch page">
      <AdminPageHeader
        eyebrow="Live dispatch operations"
        title="Dispatch Center"
        description="Mission control for queue movement, expiring offers, and real-time dispatch actions."
        actions={
          <button className="btn btn-primary" onClick={loadDispatch}>
            Refresh Dispatch
          </button>
        }
      >
        <AdminStatStrip
          items={[
            { label: 'Queued now', value: dispatchMetrics.queuedNow, meta: 'Waiting for immediate action' },
            { label: 'Offered', value: counts.offered, meta: 'Offer workflow active' },
            { label: 'Active', value: counts.accepted + counts.en_route, meta: 'Accepted or en route' },
            { label: 'At risk', value: dispatchMetrics.criticalAtRisk, meta: 'Needs intervention' },
          ]}
        />
      </AdminPageHeader>

      <section className="dashboardTopGrid" aria-label="Dispatch summary">
        <InsightCard
          label="Queued Now"
          value={dispatchMetrics.queuedNow}
          helper="Requests waiting for immediate action"
          trendLabel={`${counts.queued} live`}
          tone="indigo"
          points={[1, 2, 2, 3, 4, 4, dispatchMetrics.queuedNow]}
        />
        <InsightCard
          label="Offers Expiring"
          value={dispatchMetrics.offersExpiring}
          helper="Assignments approaching expiry in the next 30 min"
          trendLabel={dispatchMetrics.offersExpiring > 0 ? 'Time-sensitive' : 'Under control'}
          tone="amber"
          points={[1, 1, 1, 0, 0, 0, dispatchMetrics.offersExpiring]}
        />
        <InsightCard
          label="Critical At Risk"
          value={dispatchMetrics.criticalAtRisk}
          helper="Critical queue items still unresolved"
          trendLabel={dispatchMetrics.criticalAtRisk > 0 ? 'Needs escalation' : 'Clear'}
          tone={dispatchMetrics.criticalAtRisk > 0 ? 'rose' : 'green'}
          points={[0, 1, 1, 2, 2, 2, dispatchMetrics.criticalAtRisk]}
        />
        <InsightCard
          label="Assigned Today"
          value={dispatchMetrics.assignedToday}
          helper="Accepted, en route, or completed today"
          trendLabel={`${counts.accepted + counts.en_route} active now`}
          tone="blue"
          points={[0, 0, 1, 1, 0, 0, dispatchMetrics.assignedToday]}
        />
      </section>

      <section className="dispatchTopGrid" aria-label="Dispatch command area">
        <div className="dispatchColumn">
          <div className="dispatchCommandCard">
            <div className="dispatchCommandCardHeader">
              <div>
                <h2 className="dispatchCommandTitle">Live Exceptions</h2>
                <p className="muted">
                  Prioritize coverage gaps, expiring offers, and high-risk requests.
                </p>
              </div>
            </div>

            <div className="dispatchExceptionList">
              {exceptionRequests.length === 0 ? (
                <div className="premiumEmptyState">
                  <div className="premiumEmptyTitle">No live exceptions</div>
                  <div className="premiumEmptyText">
                    Dispatch is clear right now. New queue pressure will appear here first.
                  </div>
                </div>
              ) : (
                exceptionRequests.map((request) => {
                  const status = normalizeRequestStatus(String(request.status || ''));
                  const urgency = String(request.urgency || '').toLowerCase();
                  return (
                    <button
                      key={request.id}
                      className={
                        selectedRequest?.id === request.id
                          ? 'dispatchExceptionCard dispatchExceptionCard-active'
                          : 'dispatchExceptionCard'
                      }
                      onClick={() => setSelectedRequest(request)}
                      type="button"
                    >
                      <div className="dispatchExceptionTop">
                        <div>
                          <div className="dispatchExceptionTitle">
                            {request.description || formatServiceType(String(request.serviceType))}
                          </div>
                          <div className="dispatchExceptionMeta">
                            {formatShortTime(request.scheduledDateTime)} | {formatServiceType(String(request.serviceType))}
                          </div>
                        </div>
                        <span className={`dispatchStatusTag dispatchStatusTag-${status.replace(/[^a-z]+/g, '-')}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="dispatchExceptionBadges">
                        <span className={`dispatchPriorityTag dispatchPriorityTag-${urgency}`}>
                          {urgency} priority
                        </span>
                        {request.offerExpiresAt ? (
                          <span className="dispatchInfoTag">Offer live</span>
                        ) : null}
                      </div>

                      <p className="dispatchExceptionNote">{request.address}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <section className="dispatchCenterColumn dispatchMainFill">
          <div className="dispatchSelectedPanel">
            {!selectedRequest ? (
              <div className="premiumEmptyState">
                <div className="premiumEmptyTitle">Select a dispatch item</div>
                <div className="premiumEmptyText">
                  Choose a live exception to inspect risk, open its request thread, or take action.
                </div>
              </div>
            ) : (
              <>
                <div className="dispatchSelectedHeader">
                  <div>
                    <div className="dispatchWorkEyebrow">Selected Request</div>
                    <h2 className="dispatchSelectedTitle">
                      {selectedRequest.description || formatServiceType(String(selectedRequest.serviceType))}
                    </h2>
                    <p className="dispatchSelectedMeta">
                      {formatServiceType(String(selectedRequest.serviceType))} |{' '}
                      {formatShortTime(selectedRequest.scheduledDateTime)} | {selectedRequest.address}
                    </p>
                  </div>

                  <div className="dispatchWorkBadges">
                    <span
                      className={`dispatchStatusTag dispatchStatusTag-${normalizeRequestStatus(String(selectedRequest.status || '')).replace(/[^a-z]+/g, '-')}`}
                    >
                      {normalizeRequestStatus(String(selectedRequest.status || '')).replace('_', ' ')}
                    </span>
                    <span
                      className={`dispatchPriorityTag dispatchPriorityTag-${String(selectedRequest.urgency || '').toLowerCase()}`}
                    >
                      {String(selectedRequest.urgency || '').toLowerCase()} priority
                    </span>
                  </div>
                </div>

                {!canManageDispatch ? (
                  <PermissionNotice description="You can view dispatch details, but reassignment and cancellation actions are restricted to dispatch coordinators." />
                ) : null}

                <div className="dispatchActionGrid">
                  <button
                    className="dispatchActionCard dispatchActionTile dispatchActionTile-info"
                    onClick={() => {
                      setDetailDrawerTab('overview');
                      setDetailDrawerOpen(true);
                    }}
                    type="button"
                  >
                    <span className="dispatchActionTitle">Open full request</span>
                    <span className="dispatchActionText">Review offer controls, EVV state, and manual actions.</span>
                  </button>
                  <button
                    className="dispatchActionCard dispatchActionTile dispatchActionTile-primary"
                    onClick={() => {
                      setDetailDrawerTab('thread');
                      setDetailDrawerOpen(true);
                    }}
                    type="button"
                  >
                    <span className="dispatchActionTitle">Open request thread</span>
                    <span className="dispatchActionText">Continue work-linked communication for this visit.</span>
                  </button>
                  <ProtectedAction
                    permission={PERMISSIONS.DISPATCH_MANAGE}
                    className="dispatchActionCard dispatchActionTile dispatchActionTile-warn"
                    variant="ghost"
                    deniedReason="Only dispatch coordinators can reassign live coverage."
                    onClick={() => void onRequeue(selectedRequest.id)}
                  >
                    <span className="dispatchActionTitle">Reassign coverage</span>
                    <span className="dispatchActionText">Requeue the request and re-open matching.</span>
                  </ProtectedAction>
                  <ProtectedAction
                    permission={PERMISSIONS.DISPATCH_MANAGE}
                    className="dispatchActionCard dispatchActionTile dispatchActionTile-danger"
                    variant="ghost"
                    deniedReason="Only dispatch coordinators can cancel active requests."
                    onClick={() => void onCancel(selectedRequest.id)}
                  >
                    <span className="dispatchActionTitle">Cancel request</span>
                    <span className="dispatchActionText">Stop dispatching and remove it from active queue flow.</span>
                  </ProtectedAction>
                </div>

                <div className="dispatchWorkGrid">
                  <div className="dispatchWorkPanel">
                    <div className="dispatchPanelTitle">Service Risk Summary</div>
                    <div className="dispatchInfoStack">
                      <div className="dispatchInfoRow">
                        <span className="dispatchInfoLabel">Assigned clinician</span>
                        <strong>{selectedAssignedProfessional?.name || 'Not assigned'}</strong>
                      </div>
                      <div className="dispatchInfoRow">
                        <span className="dispatchInfoLabel">Offer expiry</span>
                        <strong>
                          {selectedRequest.offerExpiresAt
                            ? new Date(selectedRequest.offerExpiresAt).toLocaleString()
                            : 'No active offer'}
                        </strong>
                      </div>
                      <div className="dispatchInfoRow">
                        <span className="dispatchInfoLabel">Current status</span>
                        <strong>{normalizeRequestStatus(String(selectedRequest.status || '')).replace('_', ' ')}</strong>
                      </div>
                      <div className="dispatchInfoRow">
                        <span className="dispatchInfoLabel">Request ID</span>
                        <strong className="mono">{selectedRequest.id.slice(0, 8)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="dispatchWorkPanel">
                    <div className="dispatchPanelTitle">Recommended Next Steps</div>
                    <div className="dispatchPriorityList">
                      {[
                        'Confirm assigned clinician coverage and ETA.',
                        'Notify patient or family if timing changes materially.',
                        'Open the request thread to coordinate the next action.',
                      ].map((item) => (
                        <div key={item} className="dispatchPriorityItem dispatchPriorityItem-soft">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="dispatchSupportStack">
          <div className="dispatchCompactCard">
            <div className="dispatchCompactCardTitle">Request threads</div>
            <div className="dispatchCompactCardHeading">Work-linked communication</div>
            <div className="dispatchCompactCardText">
              Keep coordination inside the selected request thread instead of spreading it across generic chat.
            </div>
            <div className="dispatchCompactActions">
              <button
                className="btn"
                onClick={() => {
                  if (!selectedRequest) return;
                  setDetailDrawerTab('thread');
                  setDetailDrawerOpen(true);
                }}
                type="button"
              >
                Open selected thread
              </button>
            </div>
          </div>

          <div className="dispatchCompactCard">
            <div className="dispatchCompactCardTitle">Dispatch priorities</div>
            <div className="dispatchCompactCardHeading">Immediate focus</div>
            <div className="dispatchCompactCardText">
              Work critical queued and offered requests before they age into escalation.
            </div>
            <div className="dispatchCompactActions">
              <div className="dispatchPriorityItem dispatchPriorityItem-1">
                Assign coverage or escalate ownership for unresolved critical items.
              </div>
              <div className="dispatchPriorityItem dispatchPriorityItem-2">
                Rebalance clinician load when one region starts taking concentrated demand.
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="dispatchLowerGrid" aria-label="Dispatch coordination workspace">
        <div className="dispatchColumn dispatchCoverageColumn">
          <div className="dispatchCommandCard">
            <div className="dispatchCommandCardHeader">
              <div>
                <h2 className="dispatchCommandTitle">Available Coverage</h2>
                <p className="muted">Current clinician load for reassignment decisions.</p>
              </div>
            </div>

            <div className="dispatchCoverageList">
              {activeClinicians.length === 0 ? (
                <div className="muted">No active clinician loads yet.</div>
              ) : (
                activeClinicians.map((clinician) => (
                  <div key={clinician.id} className="dispatchCoverageRow">
                    <div>
                      <div className="dispatchCoverageName">{clinician.name}</div>
                      <div className="dispatchCoverageMeta">
                        {clinician.region} | {String(clinician.role).toUpperCase()}
                      </div>
                    </div>
                    <div className="dispatchCoverageRight">
                      <span
                        className={
                          clinician.status === 'Busy'
                            ? 'dispatchInfoTag dispatchInfoTag-warn'
                            : 'dispatchInfoTag dispatchInfoTag-ok'
                        }
                      >
                        {clinician.status}
                      </span>
                      <span className="dispatchCoverageLoad">Load {clinician.currentLoad}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <section className="dispatchMainFill dispatchQueuePanel">
          <div className="dispatchWorkspaceCard">
            <div className="dispatchCommandCardHeader">
              <div>
                <h2 className="dispatchCommandTitle">Queue workspace</h2>
                <p className="muted">
                  Let the queue workspace take the width it needs for backlog movement, workflow triage, and queue ownership.
                </p>
              </div>
            </div>

            <div className="settingsOverviewGrid dispatchQueueSummaryGrid">
              <div className="settingsOverviewCard settingsOverviewCard-queued">
                <div className="settingsOverviewLabel">Queued</div>
                <div className="settingsOverviewValue">{counts.queued}</div>
                <div className="settingsOverviewMeta">Requests awaiting immediate dispatch action</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-offered">
                <div className="settingsOverviewLabel">Offered</div>
                <div className="settingsOverviewValue">{counts.offered}</div>
                <div className="settingsOverviewMeta">Requests currently in offer flow</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-motion">
                <div className="settingsOverviewLabel">Accepted</div>
                <div className="settingsOverviewValue">{counts.accepted + counts.en_route}</div>
                <div className="settingsOverviewMeta">Assignments already in motion</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-followups">
                <div className="settingsOverviewLabel">Completed</div>
                <div className="settingsOverviewValue">{counts.completed}</div>
                <div className="settingsOverviewMeta">Visits closed out of active dispatch flow</div>
              </div>
            </div>

            <div className="dispatchActionGrid dispatchActionGrid-compact dispatchActionGrid-spaced">
              <button
                className="dispatchActionTile dispatchActionTile-primary"
                onClick={() => navigate('/admin/requests')}
                type="button"
              >
                <span className="dispatchActionTitle">Open Request Queue</span>
                <span className="dispatchActionText">Search backlog, manage statuses, and work the broader queue.</span>
              </button>
              <button
                className="dispatchActionTile dispatchActionTile-info"
                onClick={() => navigate('/admin/scheduling')}
                type="button"
              >
                <span className="dispatchActionTitle">Open Scheduling Board</span>
                <span className="dispatchActionText">Rebalance visits and review workload distribution.</span>
              </button>
            </div>
          </div>
        </section>
      </section>

      <section className="dispatchGuidanceStrip" aria-label="Dispatch guidance">
        <div className="dispatchGuidanceCopy">
          <div className="dispatchGuidanceTitle">Queue guidance</div>
          <div className="dispatchGuidanceBody">
            Use Dispatch Center for live coordination and urgent action. Use Request Queue for broader filtering,
            status review, and structured administration.
          </div>
        </div>

        <div className="pageActions">
          <Link to="/admin/requests" className="btn">
            Open Request Queue
          </Link>
        </div>
      </section>

      <RequestDetailDrawer
        requestId={selectedRequest?.id || null}
        open={detailDrawerOpen}
        initialTab={detailDrawerTab}
        onClose={() => setDetailDrawerOpen(false)}
      />
    </main>
  );
}
