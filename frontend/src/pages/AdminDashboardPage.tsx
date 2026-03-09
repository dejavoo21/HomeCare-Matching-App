import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTime } from '../contexts/RealTimeContext';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import AssistantPanel from '../components/assistant/AssistantPanel';
import { ProfessionalsPanel } from '../components/ProfessionalsPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { IntegrationsSummaryCard } from '../components/IntegrationsSummaryCard';
import { AuditSummaryCard } from '../components/AuditSummaryCard';
import { AnalyticsSummaryCard } from '../components/AnalyticsSummaryCard';
import { AccessSummaryCard } from '../components/AccessSummaryCard';
import { ReliabilitySummaryCard } from '../components/ReliabilitySummaryCard';
import { FhirSummaryCard } from '../components/FhirSummaryCard';

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
  if (text.includes('cape town')) return 'Cape Town Remote';
  if (text.includes('boston')) return 'Boston MA';
  return 'General region';
}

function ExceptionItem({
  item,
}: {
  item: { id: string; title: string; detail: string; tone: 'danger' | 'warning' | 'info' };
}) {
  const toneClass =
    item.tone === 'danger'
      ? 'bg-rose-50 text-rose-800'
      : item.tone === 'warning'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-sky-50 text-sky-800';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
          <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>Active</div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link to="/admin/dispatch">
          <Button variant="secondary" size="sm">Open</Button>
        </Link>
        <Link to="/admin/dispatch">
          <Button size="sm">Take action</Button>
        </Link>
      </div>
    </div>
  );
}

function RegionCoverageRow({ item }: { item: { region: string; score: number; open: number } }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.region}</div>
          <div className="mt-1 text-xs text-slate-500">
            {item.open} open issue{item.open === 1 ? '' : 's'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">{item.score}%</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Coverage</div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-white">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500"
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

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
      setData(null);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
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
        ? `Resolve ${stats.queuedRequests} unassigned visit${stats.queuedRequests === 1 ? '' : 's'} before afternoon shift transitions`
        : null,
      followUpsPending > 0
        ? `Review ${followUpsPending} clinician note${followUpsPending === 1 ? '' : 's'} awaiting admin review`
        : null,
      blockedOnboarding > 0
        ? `Verify ${blockedOnboarding} workforce access request${blockedOnboarding === 1 ? '' : 's'} still blocking onboarding`
        : null,
      lateCheckIns > 0
        ? `Investigate ${lateCheckIns} late EVV check-in${lateCheckIns === 1 ? '' : 's'} needing confirmation`
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
          detail: `${regionFromAddress(request.address)} • ${status.replace('_', ' ')} • ${normalizeUrgency(request.urgency) || 'standard'} priority`,
          tone: tone as 'danger' | 'warning' | 'info',
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

  const assistantContext = useMemo(
    () => ({
      kpis: {
        scheduledVisitsToday: derived.stats.completedRequests,
        atRiskVisits: derived.atRiskVisits,
        coverageHealth: derived.coverageHealth,
        pendingReviews: derived.followUpsPending,
        unassignedVisits: derived.stats.queuedRequests,
        lateCheckIns: derived.lateCheckIns,
        blockedOnboarding: derived.blockedOnboarding,
      },
      priorities: derived.priorities,
    }),
    [derived]
  );

  if (isLoading || !data) {
    return (
      <AppPage>
        <SectionCard title="Loading operations hub">
          <div className="empty">Loading operations view...</div>
        </SectionCard>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHero
        eyebrow="Care operations command center"
        title="Today's service delivery posture"
        description="Monitor care coverage, workforce readiness, EVV integrity, verification blockers, and follow-up pressure from one operational surface."
        stats={[
          { label: 'Scheduled today', value: derived.stats.completedRequests, subtitle: 'Completed and documented field activity' },
          { label: 'At risk', value: derived.atRiskVisits, subtitle: 'Needs operational intervention' },
          { label: 'Coverage health', value: `${derived.coverageHealth}%`, subtitle: 'Regional staffing posture' },
          { label: 'Pending reviews', value: derived.followUpsPending, subtitle: 'Admin review queue' },
        ]}
        rightContent={
          <div>
            <div className="text-lg font-semibold text-white">Priority actions</div>
            <div className="mt-3 space-y-3">
              {(derived.priorities.length > 0 ? derived.priorities : ['No priority blockers right now.']).map((item) => (
                <button
                  key={item}
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm hover:bg-white/15"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Unassigned visits"
          value={derived.stats.queuedRequests}
          subtitle="Coverage gaps awaiting dispatch action"
          trend={`${derived.stats.offeredRequests} offered`}
          trendTone="neutral"
          accent="warning"
        />
        <KpiCard
          title="At risk visits"
          value={derived.atRiskVisits}
          subtitle="Critical or unresolved requests still open"
          trend={derived.atRiskVisits > 0 ? '+1' : 'Stable'}
          trendTone={derived.atRiskVisits > 0 ? 'warning' : 'neutral'}
          accent="danger"
        />
        <KpiCard
          title="Late check-ins"
          value={derived.lateCheckIns}
          subtitle="Potential EVV exceptions still missing final status"
          trend="Stable"
          trendTone="neutral"
          accent="info"
        />
        <KpiCard
          title="Blocked onboarding"
          value={derived.blockedOnboarding}
          subtitle="Verification or follow-up work still blocking release"
          trend={derived.blockedOnboarding > 0 ? '-1' : 'Clear'}
          trendTone={derived.blockedOnboarding > 0 ? 'success' : 'neutral'}
          accent="warning"
        />
        <KpiCard
          title="Coverage health"
          value={`${derived.coverageHealth}%`}
          subtitle="Overall staffing readiness across active requests"
          trend="+2%"
          trendTone="success"
          accent="success"
        />
      </div>

      <section className="dashboardOperationalStrip">
        <div className="dashboardOperationalCard">
          <div className="dashboardOperationalTitle">Workforce presence</div>
          <div className="dashboardOperationalGrid">
            <div className="dashboardOperationalMetric dashboardOperationalMetric-success">
              <span className="dashboardOperationalLabel">Available now</span>
              <strong className="dashboardOperationalValue">{Math.max(derived.activeVisitsCount, 1)}</strong>
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
              {derived.followUpsPending} clinician review item{derived.followUpsPending === 1 ? '' : 's'} are awaiting admin action.
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

      <ContentGrid
        main={
          <>
            <SectionCard
              title="Live exceptions"
              subtitle="Operational issues requiring attention across care delivery"
              actions={<Button variant="secondary" onClick={() => navigate('/admin/dispatch')}>View all</Button>}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {derived.exceptions.length === 0 ? (
                  <div className="premiumEmptyState premiumEmptyState-compact lg:col-span-2">
                    <div className="premiumEmptyTitle">No live exceptions</div>
                    <div className="premiumEmptyText">
                      Operations are clear right now. New issues will surface here first.
                    </div>
                  </div>
                ) : (
                  derived.exceptions.map((item) => <ExceptionItem key={item.id} item={item} />)
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Regional coverage"
              subtitle="Staffing posture and open issue pressure by region"
              actions={<Button variant="secondary" onClick={() => navigate('/admin/dispatch')}>Open dispatch</Button>}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {derived.regionCoverage.map((item) => (
                  <RegionCoverageRow key={item.region} item={item} />
                ))}
              </div>
            </SectionCard>

            <div className="summaryStrip">
              <IntegrationsSummaryCard />
              <AuditSummaryCard />
              <AnalyticsSummaryCard />
              <AccessSummaryCard />
              <ReliabilitySummaryCard />
              <FhirSummaryCard />
            </div>
          </>
        }
        rail={
          <>
            <AssistantPanel context="dashboard" contextData={assistantContext} />
            <ActivityFeed refreshKey={activityKey} />
            <ProfessionalsPanel refreshKey={activityKey} summaryOnly />

            <SectionCard title="Operational narrative">
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Care delivery is broadly healthy, but unassigned visits and late EVV signals need active intervention.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Workforce readiness is strong, with compliance and regional coverage supporting stable operations.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Admin review and verification queues remain important blockers to close for smoother throughput.
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Fast actions">
              <div className="space-y-3">
                <button
                  className="w-full rounded-2xl bg-sky-50 px-4 py-3 text-left text-sm font-medium text-sky-800 hover:bg-sky-100"
                  onClick={() => navigate('/admin/dispatch')}
                  type="button"
                >
                  Resolve unassigned visits
                </button>
                <button
                  className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800 hover:bg-amber-100"
                  onClick={() => navigate('/admin/scheduling')}
                  type="button"
                >
                  Review EVV exceptions
                </button>
                <button
                  className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                  onClick={() => navigate('/admin/access')}
                  type="button"
                >
                  Release verified applicants to onboarding
                </button>
              </div>
            </SectionCard>
          </>
        }
      />
    </AppPage>
  );
}
