import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
import { DispatchPipeline } from '../components/DispatchPipeline';
import { StatusTile } from '../components/StatusTile';
import { AttentionPanel } from '../components/AttentionPanel';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { RequestDrawer } from '../components/RequestDrawer';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';

type CareRequest = {
  id: string;
  status: string;
  urgency: string;
  createdAt?: string;
  offerExpiresAt?: string | null;
};

type DashboardData = {
  stats: {
    queuedRequests: number;
    offeredRequests: number;
    acceptedRequests: number;
    enRouteRequests: number;
    completedRequests: number;
    cancelledRequests: number;
  };
};

const TABS = ['queued', 'offered', 'accepted', 'en_route', 'completed', 'cancelled'] as const;
type TabFilter = typeof TABS[number];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { on } = useRealTime();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [tab, setTab] = useState<TabFilter>('queued');
  const [activityKey, setActivityKey] = useState(0);
  const [search, setSearch] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);

      const [dash, reqs] = await Promise.all([
        api.getAdminDashboard() as any,
        api.getAllRequests() as any,
      ]);

      setData(dash?.data || null);
      setRequests(reqs?.data || []);
      setActivityKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const unsubs = [
      on('REQUEST_CREATED', loadDashboard),
      on('REQUEST_STATUS_CHANGED', loadDashboard),
      on('OFFER_CREATED', loadDashboard),
      on('OFFER_ACCEPTED', loadDashboard),
      on('OFFER_DECLINED', loadDashboard),
      on('OFFER_EXPIRED', loadDashboard),
      on('VISIT_STATUS_CHANGED', loadDashboard),
    ];

    return () => unsubs.forEach((u) => u());
  }, [on, loadDashboard]);

  const tabCounts = useMemo(() => {
    return TABS.reduce<Record<TabFilter, number>>((acc, currentTab) => {
      acc[currentTab] = requests.filter(
        (request) => String(request.status).toLowerCase() === currentTab
      ).length;
      return acc;
    }, {
      queued: 0,
      offered: 0,
      accepted: 0,
      en_route: 0,
      completed: 0,
      cancelled: 0,
    });
  }, [requests]);

  const tabbed = useMemo(() => {
    return requests
      .filter((request) => String(request.status).toLowerCase() === tab)
      .sort((a, b) => {
        if (tab === 'offered') {
          const aExpires = a.offerExpiresAt ? new Date(a.offerExpiresAt).getTime() : Number.POSITIVE_INFINITY;
          const bExpires = b.offerExpiresAt ? new Date(b.offerExpiresAt).getTime() : Number.POSITIVE_INFINITY;
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

  const onOffer = async (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (request) {
      setSelectedRequest(request);
    }
  };

  const onRequeue = async (id: string) => {
    try {
      await api.requeueRequest(id);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to requeue request:', err);
    }
  };

  const onCancel = async (id: string) => {
    try {
      await api.cancelRequest(id);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const onSetUrgency = async (id: string, urgency: string) => {
    try {
      await api.setUrgency(id, urgency);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to set urgency:', err);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="pageStack">
        <div className="pageHeaderBlock">
          <h1 className="pageTitle">Dashboard</h1>
          <p className="subtitle">Loading operations view...</p>
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const activeVisitsCount = stats.acceptedRequests + stats.enRouteRequests;

  return (
    <main className="opsDashboard" role="main" aria-label="Operations dashboard">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Operations Command Center</h1>
            <p className="subtitle">
              Real-time overview of home care operations, dispatch, and system activity.
            </p>
          </div>

          <div className="pageActions">
            <button className="btn btn-primary" onClick={() => navigate('/admin/dispatch')}>
              Open Dispatch Board
            </button>
          </div>
        </div>
      </section>

      <section className="statusTilesRow" aria-label="Operations summary">
        <StatusTile label="Queued Requests" value={stats.queuedRequests} color="indigo" />
        <StatusTile label="Offers Pending" value={stats.offeredRequests} color="amber" />
        <StatusTile label="Active Visits" value={activeVisitsCount} color="blue" />
        <StatusTile label="Completed Today" value={stats.completedRequests} color="green" />
      </section>

      <section className="pipelineRow">
        <DispatchPipeline />
      </section>

      <section className="dashboardSection">
        <div className="tabs" role="tablist" aria-label="Request status filters">
          {TABS.map((currentTab) => (
            <button
              key={currentTab}
              className={tab === currentTab ? 'tab tab-active' : 'tab'}
              onClick={() => setTab(currentTab)}
              role="tab"
              aria-selected={tab === currentTab}
            >
              {currentTab.replace('_', ' ').toUpperCase()}
              <span className="tabCount">{tabCounts[currentTab]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="opsMainGrid">
        <div className="opsPrimary">
          <DispatchQueueTable
            requests={tabbed as any}
            onView={setSelectedRequest as any}
            onOffer={onOffer}
            onRequeue={onRequeue}
            onCancel={onCancel}
            onSetUrgency={onSetUrgency}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        <aside className="opsSecondary">
          <AttentionPanel requests={requests} />
          <ProfessionalsPanel refreshKey={activityKey} />
          <ActivityFeed refreshKey={activityKey} />
        </aside>
      </section>

      <section className="summaryStrip">
        <IntegrationsSummaryCard />
        <AuditSummaryCard />
        <AnalyticsSummaryCard />
        <AccessSummaryCard />
        <ReliabilitySummaryCard />
        <FhirSummaryCard />
      </section>

      <RequestDrawer
        request={selectedRequest as any}
        onClose={() => setSelectedRequest(null)}
        onRefresh={loadDashboard}
      />
    </main>
  );
}
