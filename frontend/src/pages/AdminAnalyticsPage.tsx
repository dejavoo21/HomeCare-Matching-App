import { useCallback, useEffect, useState } from 'react';
import AppPage from '../components/layout/AppPage';
import { AnalyticsDashboardPanel } from '../components/AnalyticsDashboardPanel';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';

export function AdminAnalyticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPage className="analyticsPage">
      <section className="analyticsTopGrid" aria-label="Analytics overview">
        <AdminPageHeader
          eyebrow="Operational analytics"
          title="Care operations analytics"
          description="Measure service delivery performance, workforce activity, review throughput, and operational risk patterns."
        >
          <AdminStatStrip
            items={[
              { label: 'Visits completed', value: '3,482', meta: 'Tracked care delivery volume' },
              { label: 'Completion rate', value: '97%', meta: 'Visit completion confidence' },
              { label: 'Review cycle', value: '1.4d', meta: 'Average admin review time' },
              { label: 'Review backlog', value: '11', meta: 'Pending clinician note reviews' },
            ]}
          />
        </AdminPageHeader>

        <div className="analyticsControlStack">
          <div className="analyticsControlCard">
            <div className="analyticsControlTitle">Analytics controls</div>
            <div className="analyticsControlText">
              Refresh executive metrics and operational trends for the current reporting window.
            </div>

            <div className="mt-4">
              <button className="btn btn-primary" onClick={load}>
                Refresh analytics
              </button>
            </div>
          </div>

          <div className="analyticsNarrativeCard">
            <div className="analyticsNarrativeTitle">Analytics interpretation</div>
            <div className="analyticsNarrativeText">Executive-friendly story for operations leaders.</div>

            <div className="analyticsNarrativeList mt-4">
              <div className="analyticsNarrativePoint">
                Completion performance is strong and trending positively.
              </div>
              <div className="analyticsNarrativePoint">
                EVV and review-related exceptions still create operational drag.
              </div>
              <div className="analyticsNarrativePoint">
                Regional and workload analytics should guide staffing, dispatch, and follow-up decisions.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="analyticsSurfaceCard" aria-label="Operational analytics surface">
        <div className="analyticsSurfaceHeader">
          <div>
            <div className="analyticsSurfaceTitle">Operational analytics surface</div>
            <div className="analyticsSurfaceSubtitle">Delivery, dispatch, and workload visibility</div>
          </div>
        </div>

        <AnalyticsDashboardPanel refreshKey={refreshKey} />
      </section>
    </AppPage>
  );
}
