import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { RequestDrawer } from '../components/RequestDrawer';
import { RequestChatDrawer } from '../components/RequestChatDrawer';
import { InsightCard } from '../components/InsightCard';
import type { CareRequest } from '../types/index';

const TABS = ['queued', 'offered', 'accepted', 'en_route', 'completed', 'cancelled'] as const;
type TabFilter = (typeof TABS)[number];

export function AdminDispatchPage() {
  const { on } = useRealTime();

  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [requestChatRequestId, setRequestChatRequestId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [search, setSearch] = useState('');

  const loadDispatch = useCallback(async () => {
    try {
      setIsLoading(true);
      const reqs = (await api.getAllRequests()) as any;
      setRequests(reqs?.data || []);
    } catch (err) {
      console.error('Failed to load dispatch page:', err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDispatch();
  }, [loadDispatch]);

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

  const tabbed = useMemo(() => {
    return requests
      .filter((request) => String(request.status).toLowerCase() === tab)
      .sort((a, b) => {
        if (tab === 'offered') {
          const aExpires = a.offerExpiresAt
            ? new Date(a.offerExpiresAt).getTime()
            : Number.POSITIVE_INFINITY;
          const bExpires = b.offerExpiresAt
            ? new Date(b.offerExpiresAt).getTime()
            : Number.POSITIVE_INFINITY;
          return aExpires - bExpires;
        }

        const rank = (urgency: string) =>
          ({ critical: 0, high: 1, medium: 2, low: 3 }[String(urgency).toLowerCase()] ?? 9);

        const urgencyDiff = rank(a.urgency) - rank(b.urgency);
        if (urgencyDiff !== 0) {
          return urgencyDiff;
        }

        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
  }, [requests, tab]);

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

  const onOffer = async (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (request) {
      setSelectedRequest(request);
    }
  };

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

  const onSetUrgency = async (id: string, urgency: string) => {
    try {
      await api.setUrgency(id, urgency);
      await loadDispatch();
    } catch (err) {
      console.error('Failed to set urgency:', err);
    }
  };

  return (
    <main className="pageStack" role="main" aria-label="Dispatch page">
      <section className="dispatchHeaderCard">
        <div className="dispatchHeader">
          <div>
            <h1 className="pageTitle">Dispatch Center</h1>
            <p className="subtitle">
              Mission control for queue movement, expiring offers, and real-time dispatch actions.
            </p>

            <div className="dispatchStats">
              <span className="dispatchStatPill">{dispatchMetrics.queuedNow} queued</span>
              <span className="dispatchStatPill">{counts.offered} offered</span>
              <span className="dispatchStatPill">{counts.accepted + counts.en_route} active</span>
              <span className="dispatchStatPill dispatchStatPill-alert">
                {dispatchMetrics.criticalAtRisk} at risk
              </span>
            </div>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" onClick={loadDispatch}>
              Refresh Dispatch
            </button>
          </div>
        </div>
      </section>

      <section className="dashboardTopGrid" aria-label="Dispatch summary">
        <InsightCard
          label="Queued Now"
          value={dispatchMetrics.queuedNow}
          detail="Requests waiting for immediate action"
          trend={`${counts.queued} live`}
          tone="indigo"
        />
        <InsightCard
          label="Offers Expiring"
          value={dispatchMetrics.offersExpiring}
          detail="Assignments approaching expiry in the next 30 min"
          trend={dispatchMetrics.offersExpiring > 0 ? 'Time-sensitive' : 'Under control'}
          tone="amber"
        />
        <InsightCard
          label="Critical At Risk"
          value={dispatchMetrics.criticalAtRisk}
          detail="Critical queue items still unresolved"
          trend={dispatchMetrics.criticalAtRisk > 0 ? 'Needs escalation' : 'Clear'}
          tone={dispatchMetrics.criticalAtRisk > 0 ? 'rose' : 'green'}
        />
        <InsightCard
          label="Assigned Today"
          value={dispatchMetrics.assignedToday}
          detail="Accepted, en route, or completed today"
          trend={`${counts.accepted + counts.en_route} active now`}
          tone="blue"
        />
      </section>

      <section className="dashboardSection">
        <div className="tabs" role="tablist" aria-label="Dispatch status filters">
          {TABS.map((currentTab) => (
            <button
              key={currentTab}
              className={tab === currentTab ? 'tab tab-active' : 'tab'}
              onClick={() => setTab(currentTab)}
              role="tab"
              aria-selected={tab === currentTab}
            >
              {currentTab.replace('_', ' ').toUpperCase()}
              <span className="tabCount">
                {requests.filter((request) => String(request.status).toLowerCase() === currentTab).length}
              </span>
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="pageCard">
          <div className="empty">Loading dispatch queue...</div>
        </div>
      ) : (
        <DispatchQueueTable
          requests={tabbed as any}
          onView={setSelectedRequest}
          onOpenThread={setRequestChatRequestId}
          onOffer={onOffer}
          onRequeue={onRequeue}
          onCancel={onCancel}
          onSetUrgency={onSetUrgency}
          search={search}
          onSearchChange={setSearch}
        />
      )}

      <RequestDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onRefresh={loadDispatch}
      />

      <RequestChatDrawer
        open={!!requestChatRequestId}
        requestId={requestChatRequestId}
        onClose={() => setRequestChatRequestId(null)}
      />
    </main>
  );
}
