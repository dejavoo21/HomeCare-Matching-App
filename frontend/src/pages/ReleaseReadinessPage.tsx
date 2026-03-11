import { Link } from 'react-router-dom';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import AssistantPanel from '../components/assistant/AssistantPanel';
import { InsightCard } from '../components/InsightCard';

type ReadinessCheck = {
  id: string;
  title: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  routeTo?: string;
};

const releaseChecks: ReadinessCheck[] = [
  {
    id: 'c1',
    title: 'API health endpoint',
    status: 'pass',
    detail: 'Application and database health responding normally.',
    routeTo: '/admin/integrations/reliability',
  },
  {
    id: 'c2',
    title: 'Schema consistency',
    status: 'warning',
    detail: 'Legacy request status aliases still exist in a small number of records.',
    routeTo: '/admin/integrations/reliability',
  },
  {
    id: 'c3',
    title: 'Critical admin pages',
    status: 'pass',
    detail: 'Dashboard, Dispatch, Scheduling, and Analytics are loading successfully.',
  },
  {
    id: 'c4',
    title: 'Access verification flow',
    status: 'pass',
    detail: 'Verification review and Request Info workflow are operational.',
    routeTo: '/admin/access',
  },
  {
    id: 'c5',
    title: 'Realtime communication',
    status: 'pass',
    detail: 'Presence, unread state, and request-linked chat threads are functioning.',
    routeTo: '/admin/dispatch',
  },
  {
    id: 'c6',
    title: 'Connected systems',
    status: 'warning',
    detail: 'One partner verification callback remains degraded and should be monitored.',
    routeTo: '/admin/integrations',
  },
  {
    id: 'c7',
    title: 'Mobile + WCAG baseline',
    status: 'warning',
    detail: 'Foundational pass landed, but dedicated audit closure is not yet complete.',
  },
  {
    id: 'c8',
    title: 'Audio / video calling',
    status: 'fail',
    detail: 'Not started. Out of release scope for the current phase.',
  },
];

function statusClass(status: ReadinessCheck['status']) {
  if (status === 'pass') return 'readinessBadge readinessBadge-pass';
  if (status === 'warning') return 'readinessBadge readinessBadge-warning';
  return 'readinessBadge readinessBadge-fail';
}

function statusLabel(status: ReadinessCheck['status']) {
  if (status === 'pass') return 'Pass';
  if (status === 'warning') return 'Watch';
  return 'Gap';
}

function ReadinessRow({ item }: { item: ReadinessCheck }) {
  return (
    <div className="readinessRow">
      <div className="readinessRowMain">
        <div className="readinessRowTop">
          <div className="readinessRowTitle">{item.title}</div>
          <div className={statusClass(item.status)}>{statusLabel(item.status)}</div>
        </div>
        <div className="readinessRowText">{item.detail}</div>
      </div>

      {item.routeTo ? (
        <Link to={item.routeTo} className="btn">
          Open
        </Link>
      ) : null}
    </div>
  );
}

export function ReleaseReadinessPage() {
  const passCount = releaseChecks.filter((item) => item.status === 'pass').length;
  const warningCount = releaseChecks.filter((item) => item.status === 'warning').length;
  const failCount = releaseChecks.filter((item) => item.status === 'fail').length;

  return (
    <AppPage>
      <PageHero
        eyebrow="Go-live command surface"
        title="Release Readiness"
        description="Track technical stability, workflow readiness, schema consistency, and deployment confidence before release."
        stats={[
          { label: 'Checks passed', value: passCount, subtitle: 'Ready and functioning normally' },
          { label: 'Watch items', value: warningCount, subtitle: 'Needs monitoring or closure' },
          { label: 'Gaps', value: failCount, subtitle: 'Not ready or not started' },
          {
            label: 'Release posture',
            value: failCount === 0 ? 'Controlled' : 'At risk',
            subtitle: 'Overall current state',
          },
        ]}
      />

      <section className="insightGrid" aria-label="Release readiness summary">
        <InsightCard
          label="Passed checks"
          value={passCount}
          helper="Technical and workflow areas currently healthy"
          trendLabel="Stable"
          tone="green"
          points={[3, 4, 4, 5, 5, 6, passCount]}
        />
        <InsightCard
          label="Watch items"
          value={warningCount}
          helper="Areas needing monitoring or near-term closure"
          trendLabel="Monitor"
          tone="amber"
          points={[4, 4, 3, 3, 3, 2, warningCount]}
        />
        <InsightCard
          label="Open gaps"
          value={failCount}
          helper="Not started or out-of-scope release items"
          trendLabel="Risk"
          tone="rose"
          points={[3, 3, 2, 2, 2, 1, failCount]}
        />
        <InsightCard
          label="Core workflows"
          value="4/4"
          helper="Dashboard, Dispatch, Scheduling, Analytics loading"
          trendLabel="Validated"
          tone="blue"
          points={[1, 2, 2, 3, 3, 4, 4]}
        />
      </section>

      <ContentGrid
        main={
          <>
            <SectionCard
              title="Release checks"
              subtitle="Technical, workflow, and operational readiness before go-live"
            >
              <div className="readinessList">
                {releaseChecks.map((item) => (
                  <ReadinessRow key={item.id} item={item} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recommended release order">
              <div className="readinessPriorityList">
                <div className="readinessPriorityCard readinessPriorityCard-critical">
                  1. Close remaining schema and integration watch items.
                </div>
                <div className="readinessPriorityCard readinessPriorityCard-warning">
                  2. Complete dedicated mobile and WCAG verification closure.
                </div>
                <div className="readinessPriorityCard readinessPriorityCard-neutral">
                  3. Keep audio and video out of this release unless scope changes.
                </div>
              </div>
            </SectionCard>
          </>
        }
        rail={
          <>
            <SectionCard title="Go-live focus">
              <div className="space-y-3">
                <div className="readinessFocus readinessFocus-pass">
                  Core admin workflows are substantially stronger and demo-ready.
                </div>
                <div className="readinessFocus readinessFocus-warning">
                  Production schema and integration watch items should remain visible until closed.
                </div>
                <div className="readinessFocus readinessFocus-neutral">
                  Keep release criteria explicit so the team is measuring against one readiness standard.
                </div>
              </div>
            </SectionCard>

            <AssistantPanel
              context="dashboard"
              contextData={{
                page: 'release_readiness',
                passCount,
                warningCount,
                failCount,
              }}
            />
          </>
        }
      />
    </AppPage>
  );
}
