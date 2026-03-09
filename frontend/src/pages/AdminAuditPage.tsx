import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import AssistantPanel from '../components/assistant/AssistantPanel';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import { AuditDashboardPanel } from '../components/AuditDashboardPanel';

export function AdminAuditPage() {
  return (
    <AppPage>
      <PageHero
        eyebrow="Audit & traceability"
        title="Operational audit trail"
        description="Track controlled actions, workflow changes, approvals, and operational events across the care operations platform."
        stats={[
          { label: 'Events today', value: 148, subtitle: 'Tracked activity records' },
          { label: 'High-value actions', value: 24, subtitle: 'Controlled workflow events' },
          { label: 'Retention', value: 'Policy based', subtitle: 'Audit-aligned storage' },
          { label: 'Traceability', value: 'Enabled', subtitle: 'Cross-workflow event visibility' },
        ]}
      />

      <ContentGrid
        main={
          <SectionCard title="Recent audit events" subtitle="High-value workflow and operational actions">
            <AuditDashboardPanel />
          </SectionCard>
        }
        rail={
          <>
            <SectionCard title="Audit posture" subtitle="Governance-friendly signals">
              <div className="space-y-3">
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  High-value actions across access, scheduling, and communication are traceable.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Audit visibility should remain aligned to role-based permissions and operational need.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Controlled actions should include actor, timestamp, entity context, and workflow category.
                </div>
              </div>
            </SectionCard>

            <AssistantPanel context="dashboard" contextData={{ area: 'audit' }} />
          </>
        }
      />
    </AppPage>
  );
}
