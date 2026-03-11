import { useCallback, useEffect, useState } from 'react';
import AppPage from '../components/layout/AppPage';
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
    <AppPage className="analyticsPage">
      <section className="analyticsTopGrid" aria-label="Analytics overview">
        <div className="analyticsHeroCard">
          <div className="analyticsEyebrow">Operational analytics</div>
          <div className="analyticsTitle">Care operations analytics</div>
          <div className="analyticsSubtitle">
            Measure service delivery performance, workforce activity, review throughput, and operational risk patterns.
          </div>

          <div className="analyticsKpiGrid">
            <div className="analyticsKpiMini">
              <div className="analyticsKpiMiniLabel">Visits completed</div>
              <div className="analyticsKpiMiniValue">3,482</div>
              <div className="analyticsKpiMiniMeta">Tracked care delivery volume</div>
            </div>

            <div className="analyticsKpiMini">
              <div className="analyticsKpiMiniLabel">Completion rate</div>
              <div className="analyticsKpiMiniValue">97%</div>
              <div className="analyticsKpiMiniMeta">Visit completion confidence</div>
            </div>

            <div className="analyticsKpiMini">
              <div className="analyticsKpiMiniLabel">Review cycle</div>
              <div className="analyticsKpiMiniValue">1.4d</div>
              <div className="analyticsKpiMiniMeta">Average admin review time</div>
            </div>

            <div className="analyticsKpiMini">
              <div className="analyticsKpiMiniLabel">Review backlog</div>
              <div className="analyticsKpiMiniValue">11</div>
              <div className="analyticsKpiMiniMeta">Pending clinician note reviews</div>
            </div>
          </div>
        </div>

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
