import { useCallback, useEffect, useState } from 'react';
import AppPage from '../components/layout/AppPage';
import ContentGrid from '../components/layout/ContentGrid';
import PageHero from '../components/ui/PageHero';
import SectionCard from '../components/ui/SectionCard';
import KpiCard from '../components/ui/KpiCard';
import AssistantPanel from '../components/assistant/AssistantPanel';
import { AnalyticsDashboardPanel } from '../components/AnalyticsDashboardPanel';

export function AdminAnalyticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPage>
      <PageHero
        eyebrow="Operational analytics"
        title="Care operations analytics"
        description="Measure service delivery performance, workforce activity, review throughput, and operational risk patterns."
        stats={[
          { label: 'Reporting period', value: '30 days', subtitle: 'Current operational window' },
          { label: 'Visits completed', value: '3,482', subtitle: 'Tracked care delivery volume' },
          { label: 'Completion rate', value: '97%', subtitle: 'Visit completion confidence' },
          { label: 'Review cycle', value: '1.4d', subtitle: 'Average admin review time' },
        ]}
        rightContent={
          <div>
            <div className="text-sm font-semibold">Analytics controls</div>
            <p className="mt-1 text-sm text-white/75">
              Refresh executive metrics and operational trends for the current reporting window.
            </p>
            <div className="mt-4">
              <button className="btn btn-secondary w-full border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={load}>
                Refresh analytics
              </button>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Visit completion" value="97%" subtitle="Completed vs scheduled" trend="+2%" trendTone="success" accent="success" />
        <KpiCard title="Coverage gaps" value="22" subtitle="Total unresolved over period" trend="-5" trendTone="success" accent="warning" />
        <KpiCard title="Late EVV events" value="14" subtitle="Potential verification exceptions" trend="+3" trendTone="warning" accent="info" />
        <KpiCard title="Review backlog" value="11" subtitle="Pending clinician note reviews" trend="-2" trendTone="success" accent="default" />
      </div>

      <ContentGrid
        main={
          <SectionCard title="Operational analytics surface" subtitle="Delivery, dispatch, and workload visibility">
            <AnalyticsDashboardPanel refreshKey={refreshKey} />
          </SectionCard>
        }
        rail={
          <>
            <SectionCard title="Analytics interpretation" subtitle="Executive-friendly story">
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Completion performance is strong and trending positively.
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  EVV and review-related exceptions still create operational drag.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Regional and workload analytics should guide staffing, dispatch, and follow-up decisions.
                </div>
              </div>
            </SectionCard>

            <AssistantPanel context="dashboard" contextData={{ area: 'analytics' }} />
          </>
        }
      />
    </AppPage>
  );
}
