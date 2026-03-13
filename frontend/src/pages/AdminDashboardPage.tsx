import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { AttentionPanel } from '../components/AttentionPanel';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
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
      <main className="opsDashboard dashboardPageCompact" role="main" aria-label="Operations dashboard">
        <section className="dashboardHeroCompact">
          <div>
            <div className="dashboardEyebrow">Care operations command center</div>
            <h1 className="dashboardTitle">Operations Hub</h1>
            <p className="dashboardIntro">Loading operations view...</p>
          </div>
        </section>
      </main>
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
    <main className="opsDashboard dashboardPageCompact" role="main" aria-label="Operations dashboard">
      <section className="dashboardHeroCompact">
        <div>
          <div className="dashboardEyebrow">Care operations command center</div>
          <h1 className="dashboardTitle">Operations Hub</h1>
          <p className="dashboardIntro">
            Monitor service posture, queue pressure, workforce activity, and follow-up work from one operational view.
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
          <div className="dashboardMetricValue">{stats.completedRequests}</div>
          <div className="dashboardMetricMeta">Visits closed cleanly and out of active risk.</div>
          <div className="dashboardMetricPill">Stable</div>
        </div>

        <div className="dashboardMetricCard dashboardMetricCard-blue">
          <div className="dashboardMetricLabel">Clinicians In Motion</div>
          <div className="dashboardMetricValue">{activeVisitsCount}</div>
          <div className="dashboardMetricMeta">Accepted and in-progress assignments moving through delivery.</div>
          <div className="dashboardMetricPill dashboardMetricPill-active">Active</div>
        </div>

        <div className="dashboardMetricCard dashboardMetricCard-amber">
          <div className="dashboardMetricLabel">Requests Waiting</div>
          <div className="dashboardMetricValue">{stats.queuedRequests}</div>
          <div className="dashboardMetricMeta">Queue items still waiting for matching, assignment, or escalation.</div>
          <div className="dashboardMetricPill dashboardMetricPill-warning">At risk</div>
        </div>

        <div className="dashboardMetricCard dashboardMetricCard-green">
          <div className="dashboardMetricLabel">Next Admin Move</div>
          <div className="dashboardMetricValue">{followUpsPending}</div>
          <div className="dashboardMetricMeta">Verification and follow-up queues are stable.</div>
          <div className="dashboardMetricPill dashboardMetricPill-neutral">Review</div>
        </div>
      </section>

      <section className="dashboardColumns">
        <div className="dashboardColumn">
          <div className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div>
                <div className="summaryLinkEyebrow">Operations Health</div>
                <h2 className="dashboardPanelTitle">Scheduling Overview</h2>
              </div>

              <Link to="/admin/scheduling" className="summaryLinkAction">
                Open Scheduling Board →
              </Link>
            </div>

            <p className="summaryLinkText">
              Monitor queue pressure, live offers, and follow-up flow.
            </p>

            <div className="settingsOverviewGrid">
              <div className="settingsOverviewCard">
                <div className="settingsOverviewLabel">Queued</div>
                <div className="settingsOverviewValue">{stats.queuedRequests}</div>
                <div className="settingsOverviewMeta">Waiting</div>
              </div>

              <div className="settingsOverviewCard">
                <div className="settingsOverviewLabel">Offered</div>
                <div className="settingsOverviewValue">{stats.offeredRequests}</div>
                <div className="settingsOverviewMeta">In offer flow</div>
              </div>

              <div className="settingsOverviewCard">
                <div className="settingsOverviewLabel">In Motion</div>
                <div className="settingsOverviewValue">{activeVisitsCount}</div>
                <div className="settingsOverviewMeta">Already moving</div>
              </div>

              <div className="settingsOverviewCard">
                <div className="settingsOverviewLabel">Follow-ups</div>
                <div className="settingsOverviewValue">{followUpsPending}</div>
                <div className="settingsOverviewMeta">Awaiting closure</div>
              </div>
            </div>

            <div className="dashboardActionRow">
              <Link to="/admin/dispatch" className="btn btn-primary">
                Open Dispatch Center
              </Link>
              <Link to="/admin/clinician-review" className="btn">
                Review Notes
              </Link>
            </div>
          </div>

          <div className="dashboardFeatureCard dashboardFeatureCard-warm">
            <div className="summaryLinkEyebrow">Exception Management</div>
            <h3 className="dashboardFeatureTitle">Unresolved Items</h3>
            <p className="dashboardFeatureText">
              Review open request blockers, follow-up work, and service exceptions that still need ownership.
            </p>

            <div className="dashboardFeatureFooter">
              <span className="dashboardFeatureBadge">{stats.queuedRequests} items to review</span>
              <Link to="/admin/unresolved-items" className="summaryLinkAction">
                Open Unresolved Items →
              </Link>
            </div>
          </div>
        </div>

        <div className="dashboardColumn">
          <ProfessionalsPanel refreshKey={activityKey} summaryOnly />

          <div className="dashboardFeatureCard dashboardFeatureCard-cool">
            <div className="summaryLinkEyebrow">Release Confidence</div>
            <h3 className="dashboardFeatureTitle">Release Readiness</h3>
            <p className="dashboardFeatureText">
              Check production health, schema readiness, and live environment signals before stakeholder demos.
            </p>

            <div className="dashboardFeatureFooter">
              <span className="dashboardFeatureBadge">6 active live checks</span>
              <Link to="/admin/release-readiness" className="summaryLinkAction">
                Review Release Readiness →
              </Link>
            </div>
          </div>
        </div>

        <div className="dashboardColumn">
          <AttentionPanel requests={requests} />
          <ActivityFeed refreshKey={activityKey} />
        </div>
      </section>
    </main>
  );
}
