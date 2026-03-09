import AppPage from '../components/layout/AppPage';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import { ConnectedSystemsPanel } from '../components/ConnectedSystemsPanel';

export function AdminConnectedSystemsPage() {
  return (
    <AppPage>
      <PageHero
        eyebrow="Platform integrations"
        title="Connected systems"
        description="Monitor connector health, sync confidence, operational impact, and ownership across enterprise platform integrations."
        stats={[
          { label: 'Connectors', value: 12, subtitle: 'Active integrations' },
          { label: 'Healthy', value: 10, subtitle: 'Operating normally' },
          { label: 'Warnings', value: 2, subtitle: 'Need attention' },
          { label: '24h throughput', value: '9.4k', subtitle: 'Processed events' },
        ]}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionCard
            title="Integration estate"
            subtitle="Operational view of connected platform systems"
          >
            <ConnectedSystemsPanel />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Platform posture" subtitle="Enterprise trust signals">
            <div className="space-y-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Most connectors are healthy and syncing within expected operational windows.
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Workforce-facing exports should be monitored closely when cadence slips or retries rise.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Connector ownership, throughput visibility, and sync health are presented as operational controls rather than raw endpoints.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppPage>
  );
}
