import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import SectionCard from '../components/ui/SectionCard';
import { InsightCard } from '../components/InsightCard';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';

const statusData = {
  phase: 'Phase 6 - Commercial Polish / Sales Readiness',
  done: [
    'Deploy workflow to Railway with health and login verification',
    'Scheduling loading-state hardening',
    'Analytics loading-state hardening',
    'Guided empty and action states for broken scheduling and analytics panels',
    'Dashboard operations-hub polish',
    'Dispatch center polish',
    'Workforce presence backend model',
    'Presence heartbeat and realtime sync over SSE',
    'Team page upgraded to Workforce Directory cards',
    'RBAC-style field shaping for workforce contact and workload visibility',
    'Workforce profile drawer',
    'Direct 1:1 chat',
    'Request-linked chat threads',
    'Communication hub with unread visibility',
    'Access Management verification workflow with Request Info',
    'Top-right presence selector for signed-in users',
    'Assistant proactive alerts using queue, presence, and workload',
    'Dashboard and Dispatch KPI layer standardized',
    'Live scheduling and request schema repair',
    'Legacy scheduling compatibility for enroute and en_route',
    'Unresolved Items dashboard',
    'Escalation Handling dashboard',
    'Release Readiness diagnostics dashboard',
  ],
  partial: [
    'Live deployment stability',
    'Mobile and WCAG consistency',
    'Schema consistency closure across all backend serializers',
    'Assistant inline surfaces restyled beyond floating FAB support',
  ],
  notStarted: [
    'Dedicated clinician mobile polish pass',
    'Audio calling',
    'Video calling',
    'Formal in-product diagnostics surface tied to live backend checks',
  ],
  debt: [
    'Ongoing production schema consistency across older and newer scheduling and request assumptions',
    'Residual page-level fallback logic that should be removed after serializer closure',
  ],
  nextOrder: [
    'Restyle AssistantActionBar into a premium compact inline assistant surface',
    'Complete the dedicated mobile and WCAG verification pass',
    'Finish clinician mobile polish for visit list, detail, EVV, notes, and chat',
    'Close remaining schema consistency drift and remove duplicated page-level fallbacks',
    'Add formal in-product diagnostics wired to live health and schema-health endpoints',
  ],
};

function RoadmapList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'done' | 'partial' | 'todo' | 'debt';
}) {
  return (
    <SectionCard title={title}>
      <div className="roadmapList">
        {items.map((item) => (
          <div
            key={item}
            className={
              tone === 'done'
                ? 'roadmapItem roadmapItem-done'
                : tone === 'partial'
                  ? 'roadmapItem roadmapItem-partial'
                  : tone === 'debt'
                    ? 'roadmapItem roadmapItem-debt'
                    : 'roadmapItem roadmapItem-todo'
            }
          >
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function DeliveryRoadmapPage() {
  return (
    <AppPage>
      <AdminPageHeader
        eyebrow="Internal delivery governance"
        title="Delivery Roadmap"
        description="Track shipped work, partial items, technical debt, and the next execution order from inside the admin shell."
      >
        <AdminStatStrip
          items={[
            { label: 'Done', value: statusData.done.length, meta: 'Completed deliveries' },
            { label: 'Partial', value: statusData.partial.length, meta: 'Needs more closure' },
            { label: 'Not started', value: statusData.notStarted.length, meta: 'Still open' },
            { label: 'Debt items', value: statusData.debt.length, meta: 'Technical watch areas' },
          ]}
        />
      </AdminPageHeader>

      <section className="insightGrid" aria-label="Delivery status summary">
        <InsightCard
          label="Current phase"
          value="Phase 6"
          helper="Commercial polish and sales readiness"
          trendLabel="Active"
          tone="indigo"
          points={[3, 4, 4, 5, 5, 6, 6]}
        />
        <InsightCard
          label="Completed"
          value={statusData.done.length}
          helper="Build items already shipped"
          trendLabel="Healthy"
          tone="green"
          points={[12, 16, 20, 24, 27, 30, statusData.done.length]}
        />
        <InsightCard
          label="Still partial"
          value={statusData.partial.length}
          helper="Items needing follow-through"
          trendLabel="Monitor"
          tone="amber"
          points={[4, 4, 3, 3, 2, 2, statusData.partial.length]}
        />
        <InsightCard
          label="Open future work"
          value={statusData.notStarted.length}
          helper="Items not yet started"
          trendLabel="Planned"
          tone="blue"
          points={[10, 9, 9, 8, 8, 7, statusData.notStarted.length]}
        />
      </section>

      <ContentGrid
        main={
          <>
            <RoadmapList title="Done" items={statusData.done} tone="done" />
            <RoadmapList title="Still Partial" items={statusData.partial} tone="partial" />
            <RoadmapList title="Still Not Started" items={statusData.notStarted} tone="todo" />
            <RoadmapList title="Critical Technical Debt" items={statusData.debt} tone="debt" />
          </>
        }
        rail={
          <>
            <SectionCard title="Current Phase">
              <div className="roadmapPhaseCard">
                <div className="roadmapPhaseEyebrow">Now shipping</div>
                <div className="roadmapPhaseTitle">{statusData.phase}</div>
              </div>
            </SectionCard>

            <SectionCard title="Best Next Order">
              <div className="roadmapList">
                {statusData.nextOrder.map((item, index) => (
                  <div key={item} className="roadmapStep">
                    <div className="roadmapStepIndex">{index + 1}</div>
                    <div className="roadmapStepText">{item}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        }
      />
    </AppPage>
  );
}
