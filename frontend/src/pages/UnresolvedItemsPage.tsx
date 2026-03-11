import { useMemo } from 'react';
import { Link } from 'react-router-dom';

type UnresolvedItem = {
  id: string;
  title: string;
  category: 'queue' | 'evv' | 'review' | 'access' | 'workload' | 'authorization';
  severity: 'critical' | 'high' | 'medium';
  ageLabel: string;
  owner?: string | null;
  routeTo: string;
  context: string;
};

const unresolvedItems: UnresolvedItem[] = [
  {
    id: 'u1',
    title: 'Critical insulin request still unassigned',
    category: 'queue',
    severity: 'critical',
    ageLabel: '42 min open',
    owner: null,
    routeTo: '/admin/dispatch',
    context: 'Medication Admin • Boston MA',
  },
  {
    id: 'u2',
    title: 'Late EVV check-in missing confirmation',
    category: 'evv',
    severity: 'high',
    ageLabel: '28 min open',
    owner: 'Dispatch Admin',
    routeTo: '/admin/analytics',
    context: 'Visit verification exception',
  },
  {
    id: 'u3',
    title: 'Clinician note escalated without follow-up closure',
    category: 'review',
    severity: 'high',
    ageLabel: '3 hrs open',
    owner: 'Review Lead',
    routeTo: '/admin/clinician-review',
    context: 'Post-op outcome flagged',
  },
  {
    id: 'u4',
    title: 'Access request waiting on supporting documents',
    category: 'access',
    severity: 'medium',
    ageLabel: '1 day open',
    owner: 'Onboarding Admin',
    routeTo: '/admin/access',
    context: 'Credential verification incomplete',
  },
  {
    id: 'u5',
    title: 'Clinician workload exceeds preferred threshold',
    category: 'workload',
    severity: 'medium',
    ageLabel: 'Current shift',
    owner: 'Scheduling Admin',
    routeTo: '/admin/scheduling',
    context: 'Coverage rebalance recommended',
  },
  {
    id: 'u6',
    title: 'Authorization warning nearing visit threshold',
    category: 'authorization',
    severity: 'high',
    ageLabel: 'Today',
    owner: null,
    routeTo: '/admin/dispatch',
    context: 'Medication support payer limit',
  },
];

function severityClass(value: UnresolvedItem['severity']) {
  if (value === 'critical') return 'unresolvedBadge unresolvedBadge-critical';
  if (value === 'high') return 'unresolvedBadge unresolvedBadge-high';
  return 'unresolvedBadge unresolvedBadge-medium';
}

function groupTitle(category: UnresolvedItem['category']) {
  switch (category) {
    case 'queue':
      return 'Queue blockers';
    case 'evv':
      return 'Care delivery exceptions';
    case 'review':
      return 'Clinician review blockers';
    case 'access':
      return 'Access blockers';
    case 'workload':
      return 'Workload risk';
    case 'authorization':
      return 'Authorization risk';
    default:
      return 'Unresolved';
  }
}

function UnresolvedRow({ item }: { item: UnresolvedItem }) {
  return (
    <div className="unresolvedRow">
      <div className="unresolvedRowMain">
        <div className="unresolvedRowTop">
          <div className="unresolvedRowTitle">{item.title}</div>
          <div className={severityClass(item.severity)}>{item.severity}</div>
        </div>

        <div className="unresolvedRowMeta">
          <span>{item.context}</span>
          <span>•</span>
          <span>{item.ageLabel}</span>
          <span>•</span>
          <span>{item.owner || 'Unassigned owner'}</span>
        </div>
      </div>

      <Link to={item.routeTo} className="btn">
        Open
      </Link>
    </div>
  );
}

export function UnresolvedItemsPage() {
  const grouped = useMemo(() => {
    const map = new Map<string, UnresolvedItem[]>();
    unresolvedItems.forEach((item) => {
      const key = item.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, []);

  const counts = useMemo(
    () => ({
      total: unresolvedItems.length,
      critical: unresolvedItems.filter((item) => item.severity === 'critical').length,
      unowned: unresolvedItems.filter((item) => !item.owner).length,
      aging: unresolvedItems.filter(
        (item) => item.ageLabel.includes('day') || item.ageLabel.includes('hrs')
      ).length,
    }),
    []
  );

  return (
    <main className="opsDashboard unresolvedPage" role="main" aria-label="Unresolved items dashboard">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div className="pageHeaderContent">
            <div className="pageHeaderEyebrow">Operations control tower</div>
            <h1 className="pageTitle">Unresolved Items</h1>
            <p className="subtitle">
              Track unresolved operational work across dispatch, access, EVV, clinician review,
              and workload from one control surface.
            </p>
          </div>

          <div className="pageActions">
            <Link to="/admin/escalations" className="btn">
              Open Escalations
            </Link>
            <Link to="/admin/dispatch" className="btn btn-primary">
              Open Dispatch
            </Link>
            <Link to="/admin/dashboard" className="btn">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="pageHeaderMeta">
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">Open items</div>
            <div className="pageHeaderMetaValue">{counts.total} cross-workflow blockers</div>
          </div>
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">Critical</div>
            <div className="pageHeaderMetaValue">{counts.critical} requiring immediate intervention</div>
          </div>
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">No owner</div>
            <div className="pageHeaderMetaValue">{counts.unowned} items missing accountability</div>
          </div>
        </div>
      </section>

      <section className="dashboardTopGrid" aria-label="Unresolved summary">
        <div className="dashboardMetricCard dashboardMetricCard-amber">
          <div className="dashboardMetricLabel">Queue blockers</div>
          <div className="dashboardMetricValue">2</div>
          <div className="dashboardMetricMeta">Requests waiting for dispatch action</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-warning">Needs action</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-indigo">
          <div className="dashboardMetricLabel">Care exceptions</div>
          <div className="dashboardMetricValue">2</div>
          <div className="dashboardMetricMeta">EVV and clinician review issues</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Cross-workflow</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-blue">
          <div className="dashboardMetricLabel">Access blockers</div>
          <div className="dashboardMetricValue">1</div>
          <div className="dashboardMetricMeta">Verification holding onboarding flow</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Review queue</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-green">
          <div className="dashboardMetricLabel">Operational risk</div>
          <div className="dashboardMetricValue">1</div>
          <div className="dashboardMetricMeta">Workload and authorization pressure</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-success">Monitor</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="unresolvedMainStack">
          {grouped.map(([category, items]) => (
            <div key={category} className="dashboardPanel dashboardPanel-premium">
              <div className="dashboardPanelHeader">
                <div>
                  <div className="summaryLinkEyebrow">Unresolved work</div>
                  <h2 className="dashboardPanelTitle unresolvedPanelTitle">
                    {groupTitle(category as UnresolvedItem['category'])}
                  </h2>
                </div>
              </div>

              <div className="unresolvedList">
                {items.map((item) => (
                  <UnresolvedRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="dashboardAsideStack">
          <aside className="railCard" aria-label="Priority focus">
            <div className="railCardInner">
              <div className="railCardHeader">
                <div>
                  <div className="railCardEyebrow">Priority focus</div>
                  <h3 className="railCardTitle">Escalation watch</h3>
                  <p className="railCardSubtitle">Clear the oldest and least-owned work first.</p>
                </div>
              </div>

              <div className="railCardDivider" />

              <div className="unresolvedFocusStack">
                <div className="unresolvedFocus unresolvedFocus-critical">
                  Resolve critical queue and authorization blockers first.
                </div>
                <div className="unresolvedFocus unresolvedFocus-warning">
                  Assign owners to unresolved items without accountability.
                </div>
                <div className="unresolvedFocus unresolvedFocus-neutral">
                  Clear aged review and access items before they compound.
                </div>
              </div>
            </div>
          </aside>

          <aside className="railCard" aria-label="Aging signals">
            <div className="railCardInner">
              <div className="railCardHeader">
                <div>
                  <div className="railCardEyebrow">Aging items</div>
                  <h3 className="railCardTitle">Aging signals</h3>
                  <p className="railCardSubtitle">Longer-open items that risk operational drag.</p>
                </div>
              </div>

              <div className="railCardDivider" />

              <div className="railSignalGrid">
                <div className="railSignalCard railSignalCard-danger">
                  <div className="railSignalLabel">Critical items still unresolved</div>
                  <div className="railSignalValue">{counts.critical}</div>
                </div>
                <div className="railSignalCard railSignalCard-warning">
                  <div className="railSignalLabel">Items with no owner assigned</div>
                  <div className="railSignalValue">{counts.unowned}</div>
                </div>
                <div className="railSignalCard railSignalCard-neutral">
                  <div className="railSignalLabel">Aged items beyond same-shift handling</div>
                  <div className="railSignalValue">{counts.aging}</div>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </section>
    </main>
  );
}
