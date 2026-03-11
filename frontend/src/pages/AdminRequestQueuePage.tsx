import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { RequestChatDrawer } from '../components/RequestChatDrawer';
import AppPage from '../components/layout/AppPage';
import AdminFilterBar from '../components/ui/AdminFilterBar';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';
import AdminTableCard from '../components/ui/AdminTableCard';
import type { CareRequest } from '../types/index';

const TABS = ['queued', 'offered', 'accepted', 'en_route', 'completed', 'cancelled'] as const;
type TabFilter = (typeof TABS)[number];

export function AdminRequestQueuePage() {
  const navigate = useNavigate();
  const { on } = useRealTime();
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestChatRequestId, setRequestChatRequestId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const reqs = (await api.getAllRequests()) as any;
      setRequests(reqs?.data || []);
    } catch (err) {
      console.error('Failed to load request queue:', err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const unsubs = [
      on('REQUEST_CREATED', loadRequests),
      on('REQUEST_STATUS_CHANGED', loadRequests),
      on('OFFER_CREATED', loadRequests),
      on('OFFER_ACCEPTED', loadRequests),
      on('OFFER_DECLINED', loadRequests),
      on('OFFER_EXPIRED', loadRequests),
      on('VISIT_STATUS_CHANGED', loadRequests),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [on, loadRequests]);

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
        if (urgencyDiff !== 0) return urgencyDiff;

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

  const onOffer = async (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (request) {
      navigate(`/admin/requests/${request.id}`);
    }
  };

  const onRequeue = async (id: string) => {
    try {
      await api.requeueRequest(id);
      await loadRequests();
    } catch (err) {
      console.error('Failed to requeue request:', err);
    }
  };

  const onCancel = async (id: string) => {
    try {
      await api.cancelRequest(id);
      await loadRequests();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const onSetUrgency = async (id: string, urgency: string) => {
    try {
      await api.setUrgency(id, urgency);
      await loadRequests();
    } catch (err) {
      console.error('Failed to set urgency:', err);
    }
  };

  return (
    <AppPage className="requestQueuePage">
      <AdminPageHeader
        className="requestQueueHeader"
        eyebrow="Request operations"
        title="Request Queue"
        description="Review queued and in-flight requests, filter backlog, and take structured request actions outside the live dispatch center."
      >
        <AdminStatStrip
          items={[
            { label: 'Queued', value: counts.queued, meta: 'Waiting for matching or action' },
            { label: 'Offered', value: counts.offered, meta: 'Offer workflow in progress' },
            { label: 'Accepted', value: counts.accepted, meta: 'Clinician has accepted' },
            { label: 'Completed', value: counts.completed, meta: 'Closed successfully' },
          ]}
        />
      </AdminPageHeader>

      <section className="requestQueueTabs" aria-label="Request queue status filters">
        <div className="tabs" role="tablist" aria-label="Request queue tabs">
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

      <AdminFilterBar
        className="requestQueueFilters"
        rightContent={
          <div className="queueStatusBadge">
            Showing: <b>{statusFilter === 'all' ? 'ALL' : statusFilter.replace('_', ' ').toUpperCase()}</b>
          </div>
        }
      >
        <label className="srOnly" htmlFor="request-queue-search">
          Search requests
        </label>
        <input
          id="request-queue-search"
          type="text"
          placeholder="Search service, address, client, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search requests"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          aria-label="Filter by urgency"
        >
          <option value="all">Urgency: All</option>
          <option value="low">Urgency: Low</option>
          <option value="medium">Urgency: Medium</option>
          <option value="high">Urgency: High</option>
          <option value="critical">Urgency: Critical</option>
        </select>
      </AdminFilterBar>

      <section className="requestQueueTableWrap" aria-label="Request queue table">
        {isLoading ? (
          <div className="pageCard">
            <div className="empty">Loading request queue...</div>
          </div>
        ) : (
          <AdminTableCard
            className="requestQueueTableCard"
            title="Queue status"
            subtitle="Structured request administration across the broader operational backlog."
          >
            <DispatchQueueTable
              requests={tabbed as any}
              onView={(request) => navigate(`/admin/requests/${request.id}`)}
              onOpenThread={setRequestChatRequestId}
              onOffer={onOffer}
              onRequeue={onRequeue}
              onCancel={onCancel}
              onSetUrgency={onSetUrgency}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              urgencyFilter={urgencyFilter}
              onUrgencyFilterChange={setUrgencyFilter}
              hideToolbar
            />
          </AdminTableCard>
        )}
      </section>

      <section className="requestQueueGuidance" aria-label="Request queue guidance">
        <div className="dispatchGuidanceText">
          <div className="dispatchGuidanceTitle">Queue guidance</div>
          <div className="dispatchGuidanceBody">
            Use Request Queue for broader filtering, status review, and structured administration. Use Dispatch Center for urgent live coordination and active work resolution.
          </div>
        </div>

        <div className="pageActions">
          <Link to="/admin/dispatch" className="btn">
            Open Dispatch Center
          </Link>
        </div>
      </section>

      <RequestChatDrawer
        open={!!requestChatRequestId}
        requestId={requestChatRequestId}
        onClose={() => setRequestChatRequestId(null)}
      />
    </AppPage>
  );
}
