import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import AssistantPanel from '../components/assistant/AssistantPanel';

const dashboardData = {
  kpis: {
    scheduledVisitsToday: 126,
    atRiskVisits: 8,
    coverageHealth: 94,
    pendingReviews: 11,
    unassignedVisits: 5,
    lateCheckIns: 3,
    blockedOnboarding: 4,
  },
  priorities: [
    'Resolve unassigned visits before afternoon shift transitions',
    'Review clinician notes awaiting admin review',
    'Clear access verification blockers',
  ],
  exceptions: [
    { id: '1', title: 'Medication support visit unassigned', detail: 'Johannesburg North - 09:30', tone: 'warning' as const },
    { id: '2', title: 'Late EVV check-in detected', detail: 'Thabo Sithole visit - 22 minutes late', tone: 'danger' as const },
    { id: '3', title: 'Clinician note escalated', detail: 'Follow-up recommended after post-op outcome review', tone: 'info' as const },
    { id: '4', title: 'Authorization warning', detail: 'Medication support authorization nearing threshold', tone: 'warning' as const },
  ],
  coverageByRegion: [
    { region: 'General region', score: 91, open: 3 },
    { region: 'Boston MA', score: 75, open: 9 },
  ],
  enterpriseLinks: [
    {
      title: 'Connected Systems',
      eyebrow: 'Integrations',
      body: 'View hospital connections, dispatch agencies, partner endpoints, and connection status.',
      cta: 'Open Connected Systems ->',
      to: '/admin/integrations',
    },
    {
      title: 'Audit & Compliance',
      eyebrow: 'Compliance',
      body: 'Review authentication events, approvals, administrative actions, and traceability records.',
      cta: 'Open Audit & Compliance ->',
      to: '/admin/audit',
    },
    {
      title: 'Analytics',
      eyebrow: 'Performance',
      body: 'Explore dispatch trends, acceptance rates, workload distribution, and completion patterns.',
      cta: 'Open Analytics ->',
      to: '/admin/analytics',
    },
    {
      title: 'Access Management',
      eyebrow: 'Security',
      body: 'Review user access requests, approve new accounts, and manage security settings.',
      cta: 'Open Access Management ->',
      to: '/admin/access',
    },
    {
      title: 'Reliability',
      eyebrow: 'Operations',
      body: 'Inspect webhook delivery health, retries, failures, and operational reliability signals.',
      cta: 'Open Reliability ->',
      to: '/admin/integrations/reliability',
    },
    {
      title: 'FHIR API',
      eyebrow: 'Interoperability',
      body: 'Review exposed FHIR-aligned resources, metadata, and interoperability coverage.',
      cta: 'Open FHIR API ->',
      to: '/admin/integrations/fhir',
    },
  ],
} as const;

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
        <Button variant="secondary" size="sm">Open</Button>
        <Button size="sm">Take action</Button>
      </div>
    </div>
  );
}

function RegionCoverageRow({ item }: { item: { region: string; score: number; open: number } }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-slate-900">{item.region}</div>
          <div className="mt-1 text-sm text-slate-500">{item.open} open issues</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{item.score}%</div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Coverage</div>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500"
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

function EnterpriseCard({
  title,
  eyebrow,
  body,
  cta,
  to,
}: {
  title: string;
  eyebrow: string;
  body: string;
  cta: string;
  to: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{eyebrow}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{title}</div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex text-base font-semibold text-indigo-600 transition hover:text-indigo-700"
      >
        {cta}
      </Link>
    </div>
  );
}

export function AdminDashboardPage() {
  const data = dashboardData;

  const assistantContext = useMemo(
    () => ({ kpis: data.kpis, priorities: data.priorities }),
    [data]
  );

  return (
    <AppPage>
      <PageHero
        eyebrow="Care operations command center"
        title="Today's service delivery posture"
        description="Monitor care coverage, workforce readiness, EVV integrity, verification blockers, and follow-up pressure from one operational surface."
        stats={[
          { label: 'Scheduled today', value: data.kpis.scheduledVisitsToday, subtitle: 'Visits on the care plan' },
          { label: 'At risk', value: data.kpis.atRiskVisits, subtitle: 'Needs intervention' },
          { label: 'Coverage health', value: `${data.kpis.coverageHealth}%`, subtitle: 'Regional staffing posture' },
          { label: 'Pending reviews', value: data.kpis.pendingReviews, subtitle: 'Admin review queue' },
        ]}
        rightContent={
          <div>
            <div className="text-lg font-semibold text-white">Priority actions</div>
            <div className="mt-3 space-y-3">
              {data.priorities.map((item) => (
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
        <KpiCard title="Unassigned visits" value={data.kpis.unassignedVisits} subtitle="Coverage gaps awaiting assignment" accent="warning" />
        <KpiCard title="At risk visits" value={data.kpis.atRiskVisits} subtitle="Visits needing intervention" accent="danger" />
        <KpiCard title="Late check-ins" value={data.kpis.lateCheckIns} subtitle="Potential EVV exceptions" accent="info" />
        <KpiCard title="Blocked onboarding" value={data.kpis.blockedOnboarding} subtitle="Access verification incomplete" accent="warning" />
        <KpiCard title="Coverage health" value={`${data.kpis.coverageHealth}%`} subtitle="Overall staffing readiness" accent="success" />
      </div>

      <ContentGrid
        main={
          <>
            <SectionCard title="Live exceptions" subtitle="Operational issues requiring attention across care delivery">
              <div className="grid gap-3 lg:grid-cols-2">
                {data.exceptions.map((item) => (
                  <ExceptionItem key={item.id} item={item} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Regional coverage" subtitle="Staffing posture and open issue pressure by region">
              <div className="grid gap-4 lg:grid-cols-2">
                {data.coverageByRegion.map((item) => (
                  <RegionCoverageRow key={item.region} item={item} />
                ))}
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {data.enterpriseLinks.map((item) => (
                <EnterpriseCard
                  key={item.title}
                  title={item.title}
                  eyebrow={item.eyebrow}
                  body={item.body}
                  cta={item.cta}
                  to={item.to}
                />
              ))}
            </div>
          </>
        }
        rail={
          <>
            <SectionCard title="Today's story">
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Care delivery is broadly healthy, but unresolved queue pressure and EVV exceptions still need intervention.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Workforce readiness is stable, with active clinicians and regional coverage supporting service continuity.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Verification and follow-up queues remain the main blockers to smoother throughput.
                </div>
              </div>
            </SectionCard>

            <AssistantPanel context="dashboard" contextData={assistantContext} />
          </>
        }
      />
    </AppPage>
  );
}
