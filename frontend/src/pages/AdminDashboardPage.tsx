import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { AttentionPanel } from '../components/AttentionPanel';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { useRealTime } from '../contexts/RealTimeContext';
import { api } from '../services/api';

type DashboardRequest = {
  urgency?: string;
  status?: string;
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
  const underControlCount = Math.max(stats.completedRequests - followUpsPending, 0);

  return (
    <main className="opsDashboard dashboardPageCompact" role="main" aria-label="Operations dashboard">
      <section className="dashboardHeroCompact">
        <div>
          <div className="dashboardEyebrow">Care operations command center</div>
          <h1 className="dashboardTitle">Operations Hub</h1>
          <p className="dashboardIntro">
            Monitor service posture, queue pressure, workforce activity, and follow-up work from one
            operational view.
          </p>
        </div>

        <div className="dashboardHeroActions">
          <button className="btn btn-primary" onClick={() => navigate('/admin/dispatch')}>
            Open Live Dispatch
          </button>
          <Link to="/admin/requests" className="btn">
            Review Requests
          </Link>
        </div>
      </section>

      <section className="dashboardTopGrid" aria-label="Operations summary">
        <div className="dashboardMetricCard dashboardMetricCard-indigo">
          <div className="dashboardMetricLabel">Under Control</div>
          <div className="dashboardMetricValue">{underControlCount}</div>
          <div className="dashboardMetricMeta">Visits closed cleanly and out of active risk.</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-success">Stable</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-blue">
          <div className="dashboardMetricLabel">Clinicians In Motion</div>
          <div className="dashboardMetricValue">{activeVisitsCount}</div>
          <div className="dashboardMetricMeta">Accepted and in-progress assignments moving through delivery.</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-success">Active</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-amber">
          <div className="dashboardMetricLabel">Requests Waiting</div>
          <div className="dashboardMetricValue">{stats.queuedRequests}</div>
          <div className="dashboardMetricMeta">Queue items still waiting for matching, assignment, or escalation.</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-warning">At risk</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-green">
          <div className="dashboardMetricLabel">Next Admin Move</div>
          <div className="dashboardMetricValue">{followUpsPending}</div>
          <div className="dashboardMetricMeta">
            {followUpsPending > 0
              ? 'Follow-up work still needs admin review or scheduling closure.'
              : 'Verification and follow-up queues are stable.'}
          </div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Review</div>
        </div>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardMainColumn">
          <div className="dashboardPanel dashboardPanel-premium">
            <div className="dashboardPanelHeader">
              <div>
                <div className="summaryLinkEyebrow">Operations Health</div>
                <h2 className="dashboardPanelTitle">Scheduling Overview</h2>
              </div>
              <Link to="/admin/scheduling" className="summaryLinkAction">
                Review Scheduling Board <span aria-hidden="true">→</span>
              </Link>
            </div>

            <p className="summaryLinkText">
              Balance queue pressure, monitor live offers, and keep follow-up work moving back into
              scheduling without leaving the operations hub.
            </p>

            <div className="settingsOverviewGrid">
              <div className="settingsOverviewCard settingsOverviewCard-queued">
                <div className="settingsOverviewLabel">Queued</div>
                <div className="settingsOverviewValue">{stats.queuedRequests}</div>
                <div className="settingsOverviewMeta">Waiting for dispatch action</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-offered">
                <div className="settingsOverviewLabel">Offered</div>
                <div className="settingsOverviewValue">{stats.offeredRequests}</div>
                <div className="settingsOverviewMeta">Offer workflow in progress</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-motion">
                <div className="settingsOverviewLabel">In Motion</div>
                <div className="settingsOverviewValue">{activeVisitsCount}</div>
                <div className="settingsOverviewMeta">Visits already in motion</div>
              </div>
              <div className="settingsOverviewCard settingsOverviewCard-followups">
                <div className="settingsOverviewLabel">Follow-ups</div>
                <div className="settingsOverviewValue">{followUpsPending}</div>
                <div className="settingsOverviewMeta">Review actions still awaiting closure</div>
              </div>
            </div>

            <div className="dashboardActionRow">
              <Link to="/admin/dispatch" className="btn btn-primary">
                Open Live Dispatch
              </Link>
              <Link to="/admin/clinician-review" className="btn">
                Review Clinician Notes
              </Link>
            </div>
          </div>

          <ProfessionalsPanel refreshKey={activityKey} summaryOnly />
        </div>

        <div className="dashboardSideColumn">
          <AttentionPanel requests={requests} />
          <ActivityFeed refreshKey={activityKey} />
        </div>
      </section>

      <section className="dashboardSummaryGrid">
        <div className="summaryStrip">
          <IntegrationsSummaryCard />
          <AuditSummaryCard />
          <AnalyticsSummaryCard />
          <AccessSummaryCard />
          <ReliabilitySummaryCard />
          <FhirSummaryCard />
        </div>
      </section>
    </main>
  );
}
