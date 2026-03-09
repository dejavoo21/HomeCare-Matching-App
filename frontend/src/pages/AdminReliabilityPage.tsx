import AppPage from '../components/layout/AppPage';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import KpiCard from '../components/ui/KpiCard';
import { IntegrationReliabilityPanel } from '../components/IntegrationReliabilityPanel';

export function AdminReliabilityPage() {
  return (
    <AppPage>
      <PageHero
        eyebrow="Platform reliability"
        title="Service reliability and operational health"
        description="Track queue health, webhook posture, failure visibility, and calm operational control across core platform services."
        stats={[
          { label: 'Overall uptime', value: '99.92%', subtitle: '30-day service availability' },
          { label: 'Open incidents', value: 1, subtitle: 'Requires monitoring' },
          { label: 'Queue backlog', value: 12, subtitle: 'Deferred jobs' },
          { label: 'P95 latency', value: '221ms', subtitle: 'Across core services' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Uptime" value="99.92%" subtitle="30-day availability" trend="Stable" trendTone="neutral" accent="success" />
        <KpiCard title="Incident pressure" value="1" subtitle="Open reliability issue" trend="Low" trendTone="warning" accent="warning" />
        <KpiCard title="Queue backlog" value="12" subtitle="Operational jobs delayed" trend="-4" trendTone="success" accent="info" />
        <KpiCard title="Latency" value="221ms" subtitle="P95 response time" trend="+18ms" trendTone="warning" accent="default" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionCard title="Core reliability surface" subtitle="Runtime posture across operational services">
            <IntegrationReliabilityPanel />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Reliability narrative" subtitle="Operational trust summary">
            <div className="space-y-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Core care operations services are performing within acceptable thresholds.
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Real-time and delivery pathways should stay under observation when retries or dead letters increase.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Queue pressure and replay capability are presented as operator controls rather than raw infrastructure noise.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppPage>
  );
}
