import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { DispatchQueueTable } from '../components/DispatchQueueTable';
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

  const offersExpiringSoon = useMemo(() => {
    return requests.filter((request) => {
      if (!request.offerExpiresAt || String(request.status).toLowerCase() !== 'offered') {
        return false;
      }

      const diffMs = new Date(request.offerExpiresAt).getTime() - Date.now();
      return diffMs > 0 && diffMs <= 5 * 60 * 1000;
    }).length;
  }, [requests]);

  const criticalQueueCount = useMemo(() => {
    return requests.filter(
      (request) =>
        String(request.status).toLowerCase() === 'queued' &&
        String(request.urgency).toLowerCase() === 'critical'
    ).length;
  }, [requests]);

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
  const totalTracked =
    stats.queuedRequests +
    stats.offeredRequests +
    stats.acceptedRequests +
    stats.enRouteRequests +
    stats.completedRequests +
    stats.cancelledRequests;

  const safeShare = (value: number) => {
    if (totalTracked <= 0) {
      return 0;
    }

    return Math.max(8, Math.round((value / totalTracked) * 100));
  };

  return (
    <main className="opsDashboard" role="main" aria-label="Operations dashboard">
      <section className="opsHero" aria-label="Operations overview">
        <div className="opsHeroMain">
          <div className="opsHeroEyebrow">
            <Sparkles size={14} aria-hidden="true" />
            <span>Operations overview</span>
          </div>

          <div className="opsHeroHeader">
            <div>
              <h1 className="opsHeroTitle">Dispatch command center</h1>
              <p className="opsHeroText">
                {stats.queuedRequests} queued, {stats.offeredRequests} pending responses, and {activeVisitsCount} active visits moving through the care pipeline.
              </p>
            </div>

            <div className="opsHeroPrimaryMetric">
              <div className="opsHeroPrimaryValue">{stats.queuedRequests}</div>
              <div className="opsHeroPrimaryLabel">Needs dispatch now</div>
            </div>
          </div>

          <div className="opsHeroFlow" aria-label="Dispatch flow summary">
            <div className="opsHeroFlowStep">
              <span className="opsHeroFlowValue">{stats.queuedRequests}</span>
              <span className="opsHeroFlowLabel">Queued</span>
            </div>
            <div className="opsHeroFlowArrow">-&gt;</div>
            <div className="opsHeroFlowStep">
              <span className="opsHeroFlowValue">{stats.offeredRequests}</span>
              <span className="opsHeroFlowLabel">Offered</span>
            </div>
            <div className="opsHeroFlowArrow">-&gt;</div>
            <div className="opsHeroFlowStep">
              <span className="opsHeroFlowValue">{stats.acceptedRequests}</span>
              <span className="opsHeroFlowLabel">Accepted</span>
            </div>
            <div className="opsHeroFlowArrow">-&gt;</div>
            <div className="opsHeroFlowStep">
              <span className="opsHeroFlowValue">{stats.enRouteRequests}</span>
              <span className="opsHeroFlowLabel">En Route</span>
            </div>
            <div className="opsHeroFlowArrow">-&gt;</div>
            <div className="opsHeroFlowStep">
              <span className="opsHeroFlowValue">{stats.completedRequests}</span>
              <span className="opsHeroFlowLabel">Completed</span>
            </div>
          </div>
        </div>

        <div className="opsSignalRail" aria-label="Operational signals">
          <div className="opsSignalItem">
            <div className="opsSignalMeta">
              <span className="opsSignalLabel">Dispatch queue</span>
              <span className="opsSignalValue">{stats.queuedRequests}</span>
            </div>
            <div className="opsSignalBar">
              <span className="opsSignalFill opsSignalFill-indigo" style={{ width: `${safeShare(stats.queuedRequests)}%` }} />
            </div>
          </div>

          <div className="opsSignalItem">
            <div className="opsSignalMeta">
              <span className="opsSignalLabel">Offers awaiting response</span>
              <span className="opsSignalValue">{stats.offeredRequests}</span>
            </div>
            <div className="opsSignalBar">
              <span className="opsSignalFill opsSignalFill-amber" style={{ width: `${safeShare(stats.offeredRequests)}%` }} />
            </div>
          </div>

          <div className="opsSignalItem">
            <div className="opsSignalMeta">
              <span className="opsSignalLabel">Visits in motion</span>
              <span className="opsSignalValue">{activeVisitsCount}</span>
            </div>
            <div className="opsSignalBar">
              <span className="opsSignalFill opsSignalFill-blue" style={{ width: `${safeShare(activeVisitsCount)}%` }} />
            </div>
          </div>

          <div className="opsSignalItem">
            <div className="opsSignalMeta">
              <span className="opsSignalLabel">Completed today</span>
              <span className="opsSignalValue">{stats.completedRequests}</span>
            </div>
            <div className="opsSignalBar">
              <span className="opsSignalFill opsSignalFill-green" style={{ width: `${safeShare(stats.completedRequests)}%` }} />
            </div>
          </div>

          <div className="opsHeroFootnote">
            <span>{offersExpiringSoon} expiring offers</span>
            <span>{criticalQueueCount} critical queue items</span>
            <span>{stats.cancelledRequests} cancelled today</span>
            <span className="opsHeroLink">
              Review dispatch flow <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
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
          <ActivityFeed refreshKey={activityKey} />

          <div className="attentionCard">
            <h3 className="attentionTitle">Attention Needed</h3>
            <div className="attentionList">
              <div>{offersExpiringSoon} offers expiring in 5 min</div>
              <div>{criticalQueueCount} critical requests waiting in queue</div>
              <div>{activeVisitsCount} active visits in progress</div>
              <div>{data.stats.cancelledRequests} cancelled requests today</div>
            </div>
          </div>
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
