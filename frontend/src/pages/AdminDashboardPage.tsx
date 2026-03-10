import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { AttentionPanel } from '../components/AttentionPanel';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';

type DashboardRequest = {
  urgency?: string;
  status?: string;
  offerExpiresAt?: string | null;
  followUpRequired?: boolean;
  follow_up_required?: boolean;
  adminFollowUpScheduled?: boolean;
  admin_follow_up_scheduled?: boolean;
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
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
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
      setActivityKey((current) => current + 1);
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

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [on, loadDashboard]);

  if (isLoading || !data) {
    return (
      <div className="pageStack">
        <div className="pageHeaderBlock">
          <h1 className="pageTitle">Operations Hub</h1>
          <p className="subtitle">Loading operations view...</p>
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const activeVisitsCount = stats.acceptedRequests + stats.enRouteRequests;
  const followUpsPending = requests.filter(
    (request) =>
      (request.followUpRequired || request.follow_up_required) &&
      !(request.adminFollowUpScheduled || request.admin_follow_up_scheduled)
  ).length;

  return (
      <main className="opsDashboard" role="main" aria-label="Operations dashboard">
        <section className="pageHeaderBlock">
          <div className="pageHeaderRow">
            <div className="pageHeaderContent">
              <div className="pageHeaderEyebrow">Care operations command center</div>
              <h1 className="pageTitle">Operations Hub</h1>
              <p className="subtitle">
                Dispatch, workforce, compliance, and platform activity in one operating surface.
              </p>
            </div>

            <div className="pageActions">
              <button className="btn btn-primary" onClick={() => navigate('/admin/dispatch')}>
                Open Live Dispatch
              </button>
              <Link to="/admin/scheduling" className="btn">
                Open Scheduling
              </Link>
            </div>
          </div>

          <div className="pageHeaderMeta">
            <div className="pageHeaderMetaCard">
              <div className="pageHeaderMetaLabel">Queue status</div>
              <div className="pageHeaderMetaValue">{stats.queuedRequests} requests awaiting action</div>
            </div>

            <div className="pageHeaderMetaCard">
              <div className="pageHeaderMetaLabel">Workforce posture</div>
              <div className="pageHeaderMetaValue">{activeVisitsCount} clinicians currently active</div>
            </div>

            <div className="pageHeaderMetaCard">
              <div className="pageHeaderMetaLabel">Follow-up pressure</div>
              <div className="pageHeaderMetaValue">{followUpsPending} review items still open</div>
            </div>
          </div>
        </section>

      <section className="dashboardTopGrid" aria-label="Operations summary">
        <div className="dashboardMetricCard dashboardMetricCard-indigo">
          <div className="dashboardMetricLabel">Visits Today</div>
          <div className="dashboardMetricValue">{stats.completedRequests}</div>
          <div className="dashboardMetricMeta">Completed and documented field activity</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Live operations</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-blue">
          <div className="dashboardMetricLabel">Active Clinicians</div>
          <div className="dashboardMetricValue">{activeVisitsCount}</div>
          <div className="dashboardMetricMeta">Accepted and in-progress assignments</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-success">In motion</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-amber">
          <div className="dashboardMetricLabel">Open Requests</div>
          <div className="dashboardMetricValue">{stats.queuedRequests}</div>
          <div className="dashboardMetricMeta">Queue volume waiting for dispatch action</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-warning">Needs attention</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-green">
          <div className="dashboardMetricLabel">Follow-ups Pending</div>
          <div className="dashboardMetricValue">{followUpsPending}</div>
          <div className="dashboardMetricMeta">Clinician review items still open</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Review queue</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardPanel dashboardPanel-premium">
          <div className="dashboardPanelHeader">
            <div>
              <div className="summaryLinkEyebrow">Operations Health</div>
              <h2 className="dashboardPanelTitle">Scheduling Overview</h2>
            </div>
            <Link to="/admin/scheduling" className="summaryLinkAction">
              Open Scheduling Board <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="summaryLinkText">
            Balance queue pressure, monitor live offers, and keep follow-up work moving back into the
            scheduling board without leaving the operations hub.
          </p>

          <div className="settingsOverviewGrid">
            <div className="settingsOverviewCard settingsOverviewCard-queued">
              <div className="settingsOverviewLabel">Queued</div>
              <div className="settingsOverviewValue">{stats.queuedRequests}</div>
              <div className="settingsOverviewMeta">Requests waiting for dispatch action</div>
            </div>
            <div className="settingsOverviewCard settingsOverviewCard-offered">
              <div className="settingsOverviewLabel">Offered</div>
              <div className="settingsOverviewValue">{stats.offeredRequests}</div>
              <div className="settingsOverviewMeta">Requests currently in offer flow</div>
            </div>
            <div className="settingsOverviewCard settingsOverviewCard-motion">
              <div className="settingsOverviewLabel">In Motion</div>
              <div className="settingsOverviewValue">{activeVisitsCount}</div>
              <div className="settingsOverviewMeta">Accepted and in-progress visits</div>
            </div>
            <div className="settingsOverviewCard settingsOverviewCard-followups">
              <div className="settingsOverviewLabel">Follow-ups</div>
              <div className="settingsOverviewValue">{followUpsPending}</div>
              <div className="settingsOverviewMeta">Review actions still requiring closure</div>
            </div>
          </div>

          <div className="dashboardActionRow">
            <Link to="/admin/dispatch" className="btn btn-primary">
              Open Dispatch Center
            </Link>
            <Link to="/admin/clinician-review" className="btn">
              Review Clinician Notes
            </Link>
          </div>
        </div>

        <div className="dashboardAsideStack">
          <AttentionPanel requests={requests} />
          <ActivityFeed refreshKey={activityKey} />
        </div>
      </section>

      <section className="pageGridTwo">
        <ProfessionalsPanel refreshKey={activityKey} summaryOnly />

        <div className="dashboardPrimaryStack">
          <div className="summaryStrip">
            <IntegrationsSummaryCard />
            <AuditSummaryCard />
            <AnalyticsSummaryCard />
            <AccessSummaryCard />
            <ReliabilitySummaryCard />
            <FhirSummaryCard />
          </div>
        </div>
      </section>
    </main>
  );
}
