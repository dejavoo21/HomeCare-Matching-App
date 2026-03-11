import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type EscalationItem = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  ageHours: number;
  owner: string | null;
  blockedReason: string;
  source: 'dispatch' | 'evv' | 'review' | 'access' | 'scheduling';
  nextAction: string;
  routeTo: string;
};

const escalationItems: EscalationItem[] = [
  {
    id: 'esc_1',
    title: 'Critical insulin administration still unassigned',
    severity: 'critical',
    ageHours: 2,
    owner: null,
    blockedReason: 'No assigned clinician',
    source: 'dispatch',
    nextAction: 'Assign escalation owner and open live dispatch',
    routeTo: '/admin/dispatch',
  },
  {
    id: 'esc_2',
    title: 'Late EVV event still missing confirmation',
    severity: 'high',
    ageHours: 5,
    owner: 'Dispatch Admin',
    blockedReason: 'Awaiting field confirmation',
    source: 'evv',
    nextAction: 'Contact assigned clinician and verify visit state',
    routeTo: '/admin/analytics',
  },
  {
    id: 'esc_3',
    title: 'Clinician note escalated without closure',
    severity: 'high',
    ageHours: 27,
    owner: 'Review Lead',
    blockedReason: 'Follow-up not scheduled',
    source: 'review',
    nextAction: 'Create follow-up and close review blocker',
    routeTo: '/admin/clinician-review',
  },
  {
    id: 'esc_4',
    title: 'Access verification blocked by missing credential evidence',
    severity: 'medium',
    ageHours: 40,
    owner: 'Onboarding Admin',
    blockedReason: 'Awaiting additional information',
    source: 'access',
    nextAction: 'Re-request documentation and set follow-up date',
    routeTo: '/admin/access',
  },
  {
    id: 'esc_5',
    title: 'Coverage imbalance creating unsafe scheduling concentration',
    severity: 'medium',
    ageHours: 8,
    owner: 'Scheduling Admin',
    blockedReason: 'Workload threshold exceeded',
    source: 'scheduling',
    nextAction: 'Rebalance assignments and reduce overload',
    routeTo: '/admin/scheduling',
  },
];

function severityClass(value: EscalationItem['severity']) {
  if (value === 'critical') return 'escalationBadge escalationBadge-critical';
  if (value === 'high') return 'escalationBadge escalationBadge-high';
  return 'escalationBadge escalationBadge-medium';
}

function sourceClass(value: EscalationItem['source']) {
  return `escalationSource escalationSource-${value}`;
}

function sourceLabel(value: EscalationItem['source']) {
  switch (value) {
    case 'dispatch':
      return 'Dispatch';
    case 'evv':
      return 'EVV';
    case 'review':
      return 'Clinician Review';
    case 'access':
      return 'Access';
    case 'scheduling':
      return 'Scheduling';
    default:
      return 'Operations';
  }
}

function EscalationRow({ item }: { item: EscalationItem }) {
  return (
    <div className="escalationRow">
      <div className="escalationRowMain">
        <div className="escalationRowTop">
          <div className="escalationRowTitle">{item.title}</div>
          <div className={severityClass(item.severity)}>{item.severity}</div>
          <div className={sourceClass(item.source)}>{sourceLabel(item.source)}</div>
        </div>

        <div className="escalationMeta">
          <span>{item.ageHours}h open</span>
          <span>•</span>
          <span>{item.owner || 'No owner assigned'}</span>
          <span>•</span>
          <span>{item.blockedReason}</span>
        </div>

        <div className="escalationNextAction">
          <strong>Next action:</strong> {item.nextAction}
        </div>
      </div>

      <Link to={item.routeTo} className="btn">
        Open
      </Link>
    </div>
  );
}

export function EscalationHandlingPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return escalationItems;
    return escalationItems.filter((item) => item.severity === filter);
  }, [filter]);

  const counts = useMemo(
    () => ({
      total: escalationItems.length,
      critical: escalationItems.filter((item) => item.severity === 'critical').length,
      unowned: escalationItems.filter((item) => !item.owner).length,
      aged24: escalationItems.filter((item) => item.ageHours >= 24).length,
    }),
    []
  );

  return (
    <main className="opsDashboard escalationPage" role="main" aria-label="Escalation handling dashboard">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div className="pageHeaderContent">
            <div className="pageHeaderEyebrow">Operations control tower</div>
            <h1 className="pageTitle">Escalation Handling</h1>
            <p className="subtitle">
              Monitor severe, aging, blocked, and unowned escalations across dispatch, EVV,
              clinician review, access, and scheduling.
            </p>
          </div>

          <div className="pageActions">
            <Link to="/admin/dispatch" className="btn btn-primary">
              Open Live Dispatch
            </Link>
            <Link to="/admin/unresolved-items" className="btn">
              Open Unresolved Items
            </Link>
          </div>
        </div>

        <div className="pageHeaderMeta">
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">Open escalations</div>
            <div className="pageHeaderMetaValue">{counts.total} severe operational issues</div>
          </div>
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">No owner</div>
            <div className="pageHeaderMetaValue">{counts.unowned} escalations need assignment</div>
          </div>
          <div className="pageHeaderMetaCard">
            <div className="pageHeaderMetaLabel">Aged 24h+</div>
            <div className="pageHeaderMetaValue">{counts.aged24} older unresolved escalations</div>
          </div>
        </div>
      </section>

      <section className="dashboardTopGrid" aria-label="Escalation summary">
        <div className="dashboardMetricCard dashboardMetricCard-indigo">
          <div className="dashboardMetricLabel">Critical</div>
          <div className="dashboardMetricValue">{counts.critical}</div>
          <div className="dashboardMetricMeta">Immediate escalation risk</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-warning">Act now</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-amber">
          <div className="dashboardMetricLabel">Unowned</div>
          <div className="dashboardMetricValue">{counts.unowned}</div>
          <div className="dashboardMetricMeta">Escalations missing accountability</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-warning">Assign owner</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-blue">
          <div className="dashboardMetricLabel">Aged 24h+</div>
          <div className="dashboardMetricValue">{counts.aged24}</div>
          <div className="dashboardMetricMeta">Escalations needing closure</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-neutral">Aging</div>
        </div>
        <div className="dashboardMetricCard dashboardMetricCard-green">
          <div className="dashboardMetricLabel">Cross-workflow</div>
          <div className="dashboardMetricValue">{counts.total}</div>
          <div className="dashboardMetricMeta">Dispatch, EVV, review, access, scheduling</div>
          <div className="dashboardMetricTrend dashboardMetricTrend-success">System-wide</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardPanel dashboardPanel-premium">
          <div className="dashboardPanelHeader">
            <div>
              <div className="summaryLinkEyebrow">Escalation queue</div>
              <h2 className="dashboardPanelTitle unresolvedPanelTitle">Escalation queue</h2>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'critical' | 'high' | 'medium')}
              className="escalationFilter"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
          </div>

          <p className="summaryLinkText">
            Triage escalations by severity, aging, blocker type, and ownership so the next action is
            obvious.
          </p>

          <div className="escalationList">
            {filtered.map((item) => (
              <EscalationRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="dashboardAsideStack">
          <aside className="railCard" aria-label="Escalation priorities">
            <div className="railCardInner">
              <div className="railCardHeader">
                <div>
                  <div className="railCardEyebrow">Escalation priorities</div>
                  <h3 className="railCardTitle">Priority focus</h3>
                  <p className="railCardSubtitle">
                    What needs escalation, reassignment, or unblock action first.
                  </p>
                </div>
              </div>

              <div className="railCardDivider" />

              <div className="escalationFocusStack">
                <div className="escalationFocus escalationFocus-critical">
                  Assign owners to critical escalations without accountability first.
                </div>
                <div className="escalationFocus escalationFocus-warning">
                  Resolve aged review and access blockers before they create downstream delay.
                </div>
                <div className="escalationFocus escalationFocus-neutral">
                  Route overload items back into scheduling for rebalance action.
                </div>
              </div>
            </div>
          </aside>

          <aside className="railCard" aria-label="Escalation actions">
            <div className="railCardInner">
              <div className="railCardHeader">
                <div>
                  <div className="railCardEyebrow">Escalation actions</div>
                  <h3 className="railCardTitle">Next steps</h3>
                  <p className="railCardSubtitle">Jump directly into the workflow that can unblock progress.</p>
                </div>
              </div>

              <div className="railCardDivider" />

              <div className="escalationActionStack">
                <Link to="/admin/unresolved-items" className="btn">
                  Open Unresolved Items
                </Link>
                <Link to="/admin/dispatch" className="btn btn-primary">
                  Open Live Dispatch
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </section>
    </main>
  );
}
