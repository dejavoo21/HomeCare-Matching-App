import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { RequestChatDrawer } from '../components/RequestChatDrawer';
import PageHero from '../components/ui/PageHero';
import AppPage from '../components/layout/AppPage';
import SectionCard from '../components/ui/SectionCard';
import AssistantPanel from '../components/assistant/AssistantPanel';
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
    <AppPage>
      <PageHero
        eyebrow="Request operations"
        title="Request queue"
        description="Review queued and in-flight requests, filter operational backlog, and take structured request actions outside the live dispatch center."
        stats={[
          { label: 'Queued', value: counts.queued, subtitle: 'Waiting for matching or action' },
          { label: 'Offered', value: counts.offered, subtitle: 'Offer workflow in progress' },
          { label: 'Accepted', value: counts.accepted, subtitle: 'Clinician has accepted' },
          { label: 'Completed', value: counts.completed, subtitle: 'Closed successfully' },
        ]}
      />

      <SectionCard title="Queue status" subtitle="Full request management across statuses and urgency">
        <div className="tabs" role="tablist" aria-label="Request queue status filters">
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

        <div className="mt-6">
          {isLoading ? (
            <div className="pageCard">
              <div className="empty">Loading request queue...</div>
            </div>
          ) : (
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
            />
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div />
        <div className="space-y-6">
          <SectionCard title="Queue guidance">
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Use Request Queue for broad request administration, filtering, and status-based review.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Use Dispatch Center for urgent live coordination and active work resolution.
              </div>
            </div>
          </SectionCard>

          <AssistantPanel context="dispatch" contextData={{ page: 'request_queue', activeTab: tab }} />
        </div>
      </div>

      <RequestChatDrawer
        open={!!requestChatRequestId}
        requestId={requestChatRequestId}
        onClose={() => setRequestChatRequestId(null)}
      />
    </AppPage>
  );
}
