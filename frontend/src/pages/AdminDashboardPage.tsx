import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { StatusTile } from '../components/StatusTile';
import { AttentionPanel } from '../components/AttentionPanel';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';

type AttentionRequest = {
  urgency?: string;
  status?: string;
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

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { on } = useRealTime();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<AttentionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activityKey, setActivityKey] = useState(0);

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

      <section className="opsMainGrid">
        <div className="opsPrimary">
          <div className="dashboardPrimaryStack">
            <div className="summaryLinkCard">
              <div className="summaryLinkCardTop">
                <div>
                  <div className="summaryLinkEyebrow">Dispatch</div>
                  <h2 className="summaryLinkTitle">Queue Workbench</h2>
                </div>
              </div>

              <p className="summaryLinkText">
                Open the live dispatch board to work queued requests, monitor expiring offers,
                update urgency, and assign or requeue visits.
              </p>

              <div className="settingsOverviewGrid">
                <div className="settingsOverviewCard">
                  <div className="settingsOverviewLabel">Queued</div>
                  <div className="settingsOverviewValue">{stats.queuedRequests}</div>
                </div>
                <div className="settingsOverviewCard">
                  <div className="settingsOverviewLabel">Offered</div>
                  <div className="settingsOverviewValue">{stats.offeredRequests}</div>
                </div>
                <div className="settingsOverviewCard">
                  <div className="settingsOverviewLabel">En Route</div>
                  <div className="settingsOverviewValue">{stats.enRouteRequests}</div>
                </div>
                <div className="settingsOverviewCard">
                  <div className="settingsOverviewLabel">Completed</div>
                  <div className="settingsOverviewValue">{stats.completedRequests}</div>
                </div>
              </div>

              <Link to="/admin/dispatch" className="summaryLinkAction">
                Open Dispatch Workbench →
              </Link>
            </div>

            <div className="summaryStrip">
              <IntegrationsSummaryCard />
              <AuditSummaryCard />
              <AnalyticsSummaryCard />
              <AccessSummaryCard />
              <ReliabilitySummaryCard />
              <FhirSummaryCard />
            </div>
          </div>
        </div>

        <aside className="opsSecondary">
          <ProfessionalsPanel refreshKey={activityKey} summaryOnly />
          <AttentionPanel requests={requests} />
          <ActivityFeed refreshKey={activityKey} />
        </aside>
      </section>
    </main>
  );
}
