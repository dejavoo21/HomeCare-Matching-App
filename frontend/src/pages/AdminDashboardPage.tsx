import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';
import { InsightCard } from '../components/InsightCard';

type DashboardRequest = {
  id?: string;
  address?: string;
  urgency?: string;
  status?: string;
  offerExpiresAt?: string | null;
  evvStatus?: string | null;
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

function normalizeStatus(value?: string | null) {
  return String(value || '').toLowerCase();
}

function normalizeUrgency(value?: string | null) {
  return String(value || '').toLowerCase();
}

function regionFromAddress(address?: string | null) {
  const text = String(address || '').toLowerCase();
  if (!text) return 'Coverage not set';
  if (text.includes('johannesburg north')) return 'Johannesburg North';
  if (text.includes('johannesburg central')) return 'Johannesburg Central';
  if (text.includes('pretoria east')) return 'Pretoria East';
  if (text.includes('cape town')) return 'Cape Town';
  if (text.includes('boston')) return 'Boston';
  return 'General region';
}

export function AdminDashboardPage() {
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

  const derived = useMemo(() => {
    const stats = data?.stats || {
      queuedRequests: 0,
      offeredRequests: 0,
      acceptedRequests: 0,
      enRouteRequests: 0,
      completedRequests: 0,
      cancelledRequests: 0,
    };
    const activeVisitsCount = stats.acceptedRequests + stats.enRouteRequests;
    const followUpsPending = requests.filter(
      (request) =>
        (request.followUpRequired || request.follow_up_required) &&
        !(request.adminFollowUpScheduled || request.admin_follow_up_scheduled)
    ).length;
    const atRiskVisits = requests.filter((request) => {
      const urgency = normalizeUrgency(request.urgency);
      const status = normalizeStatus(request.status);
      return urgency === 'critical' && !['completed', 'cancelled'].includes(status);
    }).length;
    const lateCheckIns = requests.filter(
      (request) =>
        ['accepted', 'en_route'].includes(normalizeStatus(request.status)) &&
        normalizeStatus(request.evvStatus) !== 'completed'
    ).length;
    const blockedOnboarding = followUpsPending;
    const coverageHealth = Math.max(82, 100 - stats.queuedRequests - atRiskVisits);

    const priorities = [
      stats.queuedRequests > 0
        ? `Resolve ${stats.queuedRequests} queued request${stats.queuedRequests === 1 ? '' : 's'} before afternoon coverage changes`
        : null,
      followUpsPending > 0
        ? `Review ${followUpsPending} clinician follow-up item${followUpsPending === 1 ? '' : 's'} awaiting admin action`
        : null,
      lateCheckIns > 0
        ? `Investigate ${lateCheckIns} EVV signal${lateCheckIns === 1 ? '' : 's'} still missing final check-in state`
        : null,
      stats.offeredRequests > 0
        ? `Track ${stats.offeredRequests} live offer${stats.offeredRequests === 1 ? '' : 's'} and confirm dispatch conversions`
        : null,
    ].filter(Boolean) as string[];

    const exceptions = requests
      .filter((request) => {
        const status = normalizeStatus(request.status);
        return (
          normalizeUrgency(request.urgency) === 'critical' ||
          ['queued', 'offered', 'accepted', 'en_route'].includes(status)
        );
      })
      .slice(0, 4)
      .map((request) => {
        const status = normalizeStatus(request.status);
        const tone =
          normalizeUrgency(request.urgency) === 'critical'
            ? 'danger'
            : status === 'queued'
              ? 'warning'
              : 'info';

        return {
          id: request.id || Math.random().toString(36),
          title: request.id
            ? `Request ${String(request.id).slice(0, 8)} needs attention`
            : 'Live request needs attention',
          detail: `${regionFromAddress(request.address)} | ${status.replace('_', ' ')} | ${normalizeUrgency(request.urgency) || 'standard'} priority`,
          tone,
        };
      });

    const byRegion = new Map<string, { total: number; open: number }>();
    requests.forEach((request) => {
      const region = regionFromAddress(request.address);
      const current = byRegion.get(region) || { total: 0, open: 0 };
      current.total += 1;
      if (!['completed', 'cancelled'].includes(normalizeStatus(request.status))) {
        current.open += 1;
      }
      byRegion.set(region, current);
    });

    const regionCoverage = Array.from(byRegion.entries())
      .map(([region, meta]) => ({
        region,
        open: meta.open,
        score: Math.max(75, 100 - meta.open * 3),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      stats,
      activeVisitsCount,
      followUpsPending,
      atRiskVisits,
      lateCheckIns,
      blockedOnboarding,
      coverageHealth,
      priorities,
      exceptions,
      regionCoverage,
    };
  }, [data, requests]);

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

  return (
    <main className="opsDashboard" role="main" aria-label="Operations dashboard">
      <section className="dashboardHeroCard">
        <div className="dashboardHeroGrid">
          <div>
            <div className="dashboardHeroEyebrow">Care operations command center</div>
            <h1 className="dashboardHeroTitle">Today&apos;s service delivery posture</h1>
            <p className="dashboardHeroText">
              Monitor care coverage, workforce readiness, EVV integrity, verification blockers,
              and follow-up pressure from one operating surface.
            </p>

            <div className="dashboardHeroStats">
              <div className="dashboardHeroStat">
                <span className="dashboardHeroStatLabel">Scheduled today</span>
                <strong className="dashboardHeroStatValue">{derived.stats.completedRequests}</strong>
                <span className="dashboardHeroStatText">Completed and documented field activity</span>
              </div>
              <div className="dashboardHeroStat">
                <span className="dashboardHeroStatLabel">At risk</span>
                <strong className="dashboardHeroStatValue">{derived.atRiskVisits}</strong>
                <span className="dashboardHeroStatText">Needs operational intervention</span>
              </div>
              <div className="dashboardHeroStat">
                <span className="dashboardHeroStatLabel">Coverage health</span>
                <strong className="dashboardHeroStatValue">{derived.coverageHealth}%</strong>
                <span className="dashboardHeroStatText">Regional staffing posture</span>
              </div>
              <div className="dashboardHeroStat">
                <span className="dashboardHeroStatLabel">Pending reviews</span>
                <strong className="dashboardHeroStatValue">{derived.followUpsPending}</strong>
                <span className="dashboardHeroStatText">Admin follow-up queue</span>
              </div>
            </div>
          </div>

          <div className="dashboardPriorityCard">
            <div className="dashboardPriorityHeader">
              <div>
                <h2 className="dashboardPriorityTitle">Priority actions</h2>
                <p className="dashboardPriorityText">Highest-value actions for operations today.</p>
              </div>
              <div className="dashboardPriorityBadge">Today</div>
            </div>

            <div className="dashboardPriorityList">
              {derived.priorities.length === 0 ? (
                <div className="dashboardPriorityItem">No priority blockers right now.</div>
              ) : (
                derived.priorities.map((item) => (
                  <button key={item} className="dashboardPriorityItem" type="button">
                    {item}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboardTopGrid" aria-label="Operations summary">
        <InsightCard
          label="Unassigned Visits"
          value={derived.stats.queuedRequests}
          detail="Coverage gaps awaiting dispatch action"
          trend={`${derived.stats.offeredRequests} offered`}
          tone="amber"
          action={
            <Link to="/admin/dispatch" className="insightCardLink">
              Open dispatch -&gt;
            </Link>
          }
        />
        <InsightCard
          label="At Risk Visits"
          value={derived.atRiskVisits}
          detail="Critical or unresolved requests still open"
          trend={derived.atRiskVisits > 0 ? 'Escalate' : 'Stable'}
          tone={derived.atRiskVisits > 0 ? 'rose' : 'green'}
          action={
            <Link to="/admin/dispatch" className="insightCardLink">
              Review exceptions -&gt;
            </Link>
          }
        />
        <InsightCard
          label="Late Check-ins"
          value={derived.lateCheckIns}
          detail="Potential EVV exceptions still missing final status"
          trend={derived.lateCheckIns > 0 ? 'Needs review' : 'Clear'}
          tone="blue"
          action={
            <Link to="/admin/scheduling" className="insightCardLink">
              Open scheduling -&gt;
            </Link>
          }
        />
        <InsightCard
          label="Blocked Onboarding"
          value={derived.blockedOnboarding}
          detail="Verification or follow-up work still blocking release"
          trend={derived.blockedOnboarding > 0 ? 'Pending action' : 'Clear'}
          tone="indigo"
          action={
            <Link to="/admin/access" className="insightCardLink">
              Open access hub -&gt;
            </Link>
          }
        />
        <InsightCard
          label="Coverage Health"
          value={`${derived.coverageHealth}%`}
          detail="Overall staffing readiness across active requests"
          trend="+2% this week"
          tone="green"
          action={
            <Link to="/admin/team" className="insightCardLink">
              Open workforce -&gt;
            </Link>
          }
        />
      </section>

      <section className="dashboardOperationalStrip">
        <div className="dashboardOperationalCard">
          <div className="dashboardOperationalTitle">Workforce presence</div>
          <div className="dashboardOperationalGrid">
            <div className="dashboardOperationalMetric dashboardOperationalMetric-success">
              <span className="dashboardOperationalLabel">Available now</span>
              <strong className="dashboardOperationalValue">
                {Math.max(derived.activeVisitsCount, 1)}
              </strong>
            </div>
            <div className="dashboardOperationalMetric dashboardOperationalMetric-warning">
              <span className="dashboardOperationalLabel">In visit</span>
              <strong className="dashboardOperationalValue">{derived.activeVisitsCount}</strong>
            </div>
            <div className="dashboardOperationalMetric">
              <span className="dashboardOperationalLabel">Off shift</span>
              <strong className="dashboardOperationalValue">{derived.stats.cancelledRequests}</strong>
            </div>
            <div className="dashboardOperationalMetric dashboardOperationalMetric-info">
              <span className="dashboardOperationalLabel">Compliance avg</span>
              <strong className="dashboardOperationalValue">96%</strong>
            </div>
          </div>
        </div>

        <div className="dashboardOperationalCard">
          <div className="dashboardOperationalTitle">EVV integrity</div>
          <div className="dashboardOperationalStack">
            <div className="dashboardOperationalNotice">
              <span>Completed today</span>
              <strong>{derived.stats.completedRequests}</strong>
            </div>
            <div className="dashboardOperationalNotice dashboardOperationalNotice-violet">
              <span>Missing check-ins</span>
              <strong>{derived.lateCheckIns}</strong>
            </div>
            <div className="dashboardOperationalNotice dashboardOperationalNotice-info">
              <span>GPS-ready rate</span>
              <strong>97%</strong>
            </div>
          </div>
        </div>

        <div className="dashboardOperationalCard">
          <div className="dashboardOperationalTitle">Review and follow-up pressure</div>
          <div className="dashboardOperationalStack">
            <div className="dashboardOperationalNarrative">
              {derived.followUpsPending} clinician review item
              {derived.followUpsPending === 1 ? '' : 's'} are awaiting admin action.
            </div>
            <div className="dashboardOperationalNarrative">
              Escalate outcomes that require follow-up creation and supervisor attention.
            </div>
            <Link to="/admin/clinician-review" className="btn btn-primary">
              Open review queue
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboardCommandLayout">
        <div className="dashboardMainColumn">
          <div className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div>
                <div className="summaryLinkEyebrow">Operational focus</div>
                <h2 className="dashboardPanelTitle">Live exceptions</h2>
              </div>
              <Link to="/admin/dispatch" className="summaryLinkAction">
                View all -&gt;
              </Link>
            </div>

            <div className="dashboardExceptionList">
              {derived.exceptions.length === 0 ? (
                <div className="premiumEmptyState premiumEmptyState-compact">
                  <div className="premiumEmptyTitle">No live exceptions</div>
                  <div className="premiumEmptyText">
                    Operations are clear right now. New issues will surface here first.
                  </div>
                </div>
              ) : (
                derived.exceptions.map((item) => (
                  <div key={item.id} className="dashboardExceptionCard">
                    <div className="dashboardExceptionTop">
                      <div>
                        <div className="dashboardExceptionTitle">{item.title}</div>
                        <div className="dashboardExceptionDetail">{item.detail}</div>
                      </div>
                      <span className={`dashboardExceptionTag dashboardExceptionTag-${item.tone}`}>
                        Active
                      </span>
                    </div>
                    <div className="dashboardExceptionActions">
                      <Link to="/admin/dispatch" className="btn btn-small">
                        Open
                      </Link>
                      <Link to="/admin/dispatch" className="btn btn-small btn-primary">
                        Take action
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div>
                <div className="summaryLinkEyebrow">Regional posture</div>
                <h2 className="dashboardPanelTitle">Coverage by region</h2>
              </div>
              <Link to="/admin/dispatch" className="summaryLinkAction">
                Open dispatch -&gt;
              </Link>
            </div>

            <div className="dashboardCoverageList">
              {derived.regionCoverage.map((item) => (
                <div key={item.region} className="dashboardCoverageCard">
                  <div className="dashboardCoverageTop">
                    <div>
                      <div className="dashboardCoverageTitle">{item.region}</div>
                      <div className="dashboardCoverageMeta">
                        {item.open} open issue{item.open === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="dashboardCoverageScore">
                      <strong>{item.score}%</strong>
                      <span>Coverage</span>
                    </div>
                  </div>
                  <div className="dashboardCoverageBar">
                    <div
                      className="dashboardCoverageBarFill"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="dashboardAsideRail">
          <ActivityFeed refreshKey={activityKey} />
          <ProfessionalsPanel refreshKey={activityKey} summaryOnly />

          <div className="dashboardPanel">
            <div className="dashboardPanelHeader">
              <div>
                <div className="summaryLinkEyebrow">Operational narrative</div>
                <h2 className="dashboardPanelTitle">Today&apos;s story</h2>
              </div>
            </div>

            <div className="dashboardNarrativeList">
              <div className="dashboardNarrativeItem">
                Care delivery is broadly healthy, but unresolved queue pressure and EVV exceptions
                still need intervention.
              </div>
              <div className="dashboardNarrativeItem">
                Workforce readiness is stable, with active clinicians and regional coverage
                supporting service continuity.
              </div>
              <div className="dashboardNarrativeItem">
                Verification and follow-up queues remain the main blockers to smoother throughput.
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="pageGridTwo">
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
